import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(path.join(app, 'package.json'));
const ng = await import(require.resolve('@angular/compiler-cli'));
const ts = require('typescript');
const config = JSON.parse(readFileSync(path.join(app, 'validation/library.json'), 'utf8'));
const angularRoot = path.resolve(app, '../angular');
const builtCompiler = path.join(angularRoot, 'dist/packages-dist/compiler-cli/package.json');
assert.ok(existsSync(builtCompiler), 'Build ../angular before running this check.');
const version = require('@angular/compiler-cli/package.json').version;
assert.equal(
  version,
  JSON.parse(readFileSync(builtCompiler, 'utf8')).version,
  'The installed compiler must match the locally built Angular branch.',
);
assert.ok(
  version.includes('sha-'),
  'Use the locally stamped Angular snapshot, not a registry release.',
);
const angularSha = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: angularRoot,
  encoding: 'utf8',
}).trim();
const sourceRoot = path.resolve(app, config.source);
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: sourceRoot,
  encoding: 'utf8',
}).trim();
const tmp = path.join(app, 'regression/.tmp/library-cem');
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

function pack(cwd, spec) {
  const args = ['pack', '--ignore-scripts', '--json', '--pack-destination', tmp];
  if (spec) args.push(spec);
  const result = JSON.parse(execFileSync('npm', args, { cwd, encoding: 'utf8' }));
  return path.join(tmp, result[0].filename);
}
const beforeArchive = pack(app, `${config.package}@${config.baseline}`);
let distribution = path.resolve(sourceRoot, config.distribution);
assert.ok(
  existsSync(path.join(distribution, 'custom-elements.json')),
  `Build ${sourceRoot} first; its generated custom-elements.json is required.`,
);
if (config.temporaryVersion) {
  const copy = path.join(tmp, 'distribution');
  cpSync(distribution, copy, { recursive: true });
  const pkgPath = path.join(copy, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.version = '0.0.0-cem-validation';
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  distribution = copy;
}
const afterArchive = pack(distribution);
for (const [side, archive] of [
  ['before', beforeArchive],
  ['after', afterArchive],
]) {
  const target = path.join(tmp, side, 'node_modules', config.package);
  mkdirSync(target, { recursive: true });
  execFileSync('tar', ['-xzf', archive, '--strip-components=1', '-C', target]);
}

function compile(side, name, template) {
  const directory = path.join(tmp, side, name);
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    path.join(directory, 'test.ts'),
    `
import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({ selector: 'app-probe', changeDetection: ChangeDetectionStrategy.OnPush,
  template: ${JSON.stringify(template)} })
export class Probe {}
`,
  );
  const tsconfig = path.join(directory, 'tsconfig.json');
  writeFileSync(
    tsconfig,
    JSON.stringify({
      compilerOptions: {
        strict: true,
        target: 'ES2022',
        module: 'preserve',
        moduleResolution: 'bundler',
        lib: ['es2022', 'dom'],
        types: [],
        skipLibCheck: true,
        experimentalDecorators: true,
        noEmit: true,
      },
      angularCompilerOptions: {
        strictTemplates: true,
        customElementsManifests: [config.package],
        customElementsManifestsDiagnostics: 'verbose',
      },
      files: ['test.ts'],
    }),
  );
  const parsed = ng.readConfiguration(tsconfig);
  assert.deepEqual(parsed.errors, []);
  const program = new ng.NgtscProgram(
    parsed.rootNames,
    parsed.options,
    ng.createCompilerHost({ options: parsed.options }),
  );
  const diagnostics = [
    ...program.getNgOptionDiagnostics(),
    ...program.getTsSemanticDiagnostics(),
    ...program.getNgSemanticDiagnostics(),
  ].map((d) => ({
    code: d.code < 0 ? `NG${String(-d.code).slice(2)}` : `TS${d.code}`,
    category: ts.DiagnosticCategory[d.category],
    message: ts.flattenDiagnosticMessageText(d.messageText, ' '),
  }));
  writeFileSync(path.join(directory, 'diagnostics.json'), JSON.stringify(diagnostics, null, 2));
  return diagnostics;
}
const results = {
  package: config.package,
  baseline: config.baseline,
  angularVersion: version,
  angularSha,
  sourceSha,
  checks: [],
};
for (const probe of config.probes) {
  const diagnostics = compile(probe.side, probe.name, probe.template);
  const errors = diagnostics.filter((d) => d.category === 'Error');
  if (probe.error) {
    assert.ok(
      errors.some((d) => d.message.includes(probe.error)),
      `${probe.name}: expected ${probe.error}\n${JSON.stringify(errors)}`,
    );
  } else {
    assert.deepEqual(errors, [], `${probe.name}: unexpected errors`);
  }
  if (probe.warning) {
    assert.ok(
      diagnostics.some((d) => d.code === probe.warning),
      `${probe.name}: expected ${probe.warning}`,
    );
  }
  const counts = {};
  for (const d of diagnostics) counts[d.code] = (counts[d.code] ?? 0) + 1;
  results.checks.push({ name: probe.name, side: probe.side, counts, errors });
  console.log(`PASS ${probe.side}: ${probe.name}`);
}
writeFileSync(path.join(app, 'validation/results.json'), JSON.stringify(results, null, 2) + '\n');
console.log(`Validated with local Angular ${version} (${angularSha}).`);
