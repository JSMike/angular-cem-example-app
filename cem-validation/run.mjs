const spec = {
  repo: 'red-hat-design-system',
  package: '@rhds/elements',
  manifest: '@rhds/elements/custom-elements.json',
  tag: 'rh-button',
  property: 'disabled',
  kind: 'export',
  forkPackageJson: 'package.json',
};

import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baselineModules = resolve(
  process.env.CEM_BASELINE_NODE_MODULES ?? join(project, '../angular-cem-example-app/node_modules'),
);
const fork = resolve(project, '..', spec.repo);
const ngc = join(baselineModules, '@angular/compiler-cli/bundles/src/bin/ngc.js');
assert.ok(
  existsSync(ngc),
  'Build ../angular and install the baseline example app dependencies first.',
);
const output = join(project, '.cem-validation-output');
mkdirSync(output, { recursive: true });
const scratch = mkdtempSync(join(project, '.cem-validation-'));
const packageRoot = join(scratch, 'node_modules', spec.package);
mkdirSync(dirname(packageRoot), { recursive: true });
const results = [];

function component(template, fields = 'readonly value = false;') {
  return `import {Component, ChangeDetectionStrategy} from '@angular/core';
@Component({selector:'cem-probe', changeDetection:ChangeDetectionStrategy.OnPush, template:${JSON.stringify(template)}})
export class Probe { ${fields} }
`;
}

function compile(label, source) {
  writeFileSync(join(scratch, 'probe.ts'), source);
  const run = spawnSync(process.execPath, [ngc, '-p', join(scratch, 'tsconfig.json')], {
    cwd: scratch,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (run.error) throw run.error;
  const text = `${run.stdout}${run.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
  writeFileSync(join(output, `${label}.log`), text);
  const codes = {};
  for (const [, code] of text.matchAll(/\b(?:NG|TS)(\d+)\b/g)) codes[code] = (codes[code] ?? 0) + 1;
  const result = { label, exitCode: run.status, codes };
  results.push(result);
  return result;
}

try {
  cpSync(join(baselineModules, spec.package), packageRoot, { recursive: true, dereference: true });
  // The probe lives beneath this worktree, so dependencies resolve through its
  // node_modules. No installed package or shared dependency tree is modified.
  writeFileSync(
    join(scratch, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          target: 'ES2022',
          module: 'preserve',
          moduleResolution: 'bundler',
          experimentalDecorators: true,
          types: [],
        },
        angularCompilerOptions: {
          strictTemplates: true,
          customElementsManifests: [spec.manifest],
          customElementsManifestsDiagnostics: 'verbose',
        },
        files: ['./probe.ts'],
      },
      null,
      2,
    ),
  );
  const baselineVersion = JSON.parse(
    readFileSync(join(packageRoot, 'package.json'), 'utf8'),
  ).version;
  const valid = component(
    `<${spec.tag} [${spec.property}]="value"></${spec.tag}>`,
    spec.kind === 'references' ? "readonly value = 'normal' as const;" : undefined,
  );
  const invalid = component(
    `<${spec.tag} [${spec.property}]="value"></${spec.tag}>`,
    spec.kind === 'references' ? "readonly value = 'sideways' as const;" : 'readonly value = 123;',
  );
  const before = compile('before-valid', valid);
  const beforeInvalid = compile('before-invalid', invalid);
  let beforeEvent;
  const event = component(
    '<sl-tree (sl-selection-change)="select($event.detail.selection)"></sl-tree>',
    'select(_items: HTMLElement[]) {}',
  );
  if (spec.kind === 'references') beforeEvent = compile('before-event', event);

  if (spec.kind === 'export') {
    const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
    const fixed = JSON.parse(readFileSync(join(fork, spec.forkPackageJson), 'utf8'));
    assert.equal(fixed.exports['./custom-elements.json'], './custom-elements.json');
    pkg.exports['./custom-elements.json'] = fixed.exports['./custom-elements.json'];
    writeFileSync(join(packageRoot, 'package.json'), JSON.stringify(pkg, null, 2));
  } else {
    // Use the actual npm pack file list and generated declarations/metadata from
    // the fork; do not hand-author replacement manifest records in the app.
    const args = ['pack', '--ignore-scripts', '--json', '--pack-destination', scratch];
    if (spec.workspace) args.push('--workspace', spec.workspace);
    const packed = JSON.parse(execFileSync('npm', args, { cwd: fork, encoding: 'utf8' }));
    rmSync(packageRoot, { recursive: true, force: true });
    mkdirSync(packageRoot, { recursive: true });
    execFileSync('tar', [
      '-xzf',
      join(scratch, packed[0].filename),
      '--strip-components=1',
      '-C',
      packageRoot,
    ]);
  }
  const after = compile('after-valid', valid);
  const afterInvalid = compile('after-invalid', invalid);
  assert.equal(after.exitCode, 0, `Fixed valid template failed; see ${output}/after-valid.log`);
  assert.notEqual(
    afterInvalid.exitCode,
    0,
    'Fixed manifest must reject the invalid property value',
  );
  assert.ok(
    afterInvalid.codes['2322'],
    'Expected an assignability diagnostic for the invalid value',
  );
  if (spec.kind === 'export') {
    assert.ok(before.codes['4007'], 'Baseline must reproduce the missing manifest export');
    assert.ok(!after.codes['4007'], 'Fixed manifest must resolve by its public JSON specifier');
  } else if (spec.kind === 'inputs') {
    assert.ok(before.codes['4009'], 'Baseline must reproduce invalid fixture tag metadata');
    assert.ok(!after.codes['4009'], 'Fixed generation must omit invalid fixture registrations');
  } else {
    assert.equal(
      beforeInvalid.exitCode,
      0,
      'Baseline must reproduce acceptance of an invalid direction',
    );
    const afterEvent = compile('after-event', event);
    assert.notEqual(
      beforeEvent.exitCode,
      0,
      'Baseline must reproduce missing CustomEvent detail typing',
    );
    assert.equal(
      afterEvent.exitCode,
      0,
      'Fixed event alias must expose detail.selection as elements',
    );
    const afterEventInvalid = compile(
      'after-event-invalid',
      component(
        '<sl-tree (sl-selection-change)="select($event.detail.selection)"></sl-tree>',
        'select(_items: number) {}',
      ),
    );
    assert.ok(
      afterEventInvalid.codes['2345'],
      'Event detail must reject an incompatible handler parameter',
    );
  }
  const report = {
    package: spec.package,
    angularRevision: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: resolve(project, '../angular'),
      encoding: 'utf8',
    }).trim(),
    compilerVersion: JSON.parse(
      readFileSync(join(baselineModules, '@angular/compiler-cli/package.json'), 'utf8'),
    ).version,
    baselineVersion,
    candidateVersion: JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).version,
    fork: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: fork, encoding: 'utf8' }).trim(),
    fixture:
      spec.kind === 'export'
        ? 'Published package with only fork export-map change applied'
        : 'Actual fork npm pack with generated CEM and declarations',
    results,
  };
  writeFileSync(
    join(project, 'cem-validation/results.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
