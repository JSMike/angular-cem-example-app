/** Reproduce one fork's CEM change against published package declarations with Angular. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspace = path.join(appDir, 'regression/.tmp/library-cem');
const cache = path.join(workspace, 'archives');
const require = createRequire(path.join(appDir, 'package.json'));
const library = 'Calcite';
const fork = path.resolve(
  process.env.CALCITE_FORK ?? path.join(appDir, '../calcite-design-system'),
);
const packages = [{ name: '@esri/calcite-components', version: '5.2.0-next.99' }];
const validTemplate = `<calcite-button [scale]="'m'" [alignment]="'center'">Action</calcite-button>`;
const invalidTemplate = `<calcite-button [scale]="'cem-invalid'" [alignment]="'cem-invalid'">Action</calcite-button>`;
const invalidCount = 2;
async function amendPackage(packageDir) {
  const file = path.join(packageDir, 'package.json');
  const metadata = JSON.parse(readFileSync(file, 'utf8'));
  const forkMetadata = JSON.parse(
    readFileSync(path.join(fork, 'packages/components/package.json'), 'utf8'),
  );
  metadata.exports = forkMetadata.exports;
  writeFileSync(file, JSON.stringify(metadata, null, 2) + '\n');
}

mkdirSync(cache, { recursive: true });
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n');

for (const stage of ['before', 'after']) {
  rmSync(path.join(workspace, stage), { recursive: true, force: true });
  mkdirSync(path.join(workspace, stage), { recursive: true });
}
for (const { name, version } of packages) {
  const metadataFile = path.join(cache, name.replaceAll('/', '-') + '.json');
  let metadata;
  if (existsSync(metadataFile)) metadata = readJson(metadataFile);
  if (metadata?.version !== version || !existsSync(path.join(cache, metadata.filename))) {
    [metadata] = JSON.parse(
      execFileSync(
        'npm',
        ['pack', `${name}@${version}`, '--ignore-scripts', '--json', '--pack-destination', cache],
        { encoding: 'utf8' },
      ),
    );
    writeJson(metadataFile, metadata);
  }
  const before = path.join(workspace, 'before/node_modules', name);
  const after = path.join(workspace, 'after/node_modules', name);
  mkdirSync(before, { recursive: true });
  execFileSync('tar', [
    '-xzf',
    path.join(cache, metadata.filename),
    '-C',
    before,
    '--strip-components=1',
  ]);
  cpSync(before, after, { recursive: true });
  await amendPackage(after);
}

const provenance = {
  fixtureBased: true,
  packages,
  fork,
  forkCommit: execFileSync('git', ['-C', fork, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  forkDirty:
    execFileSync('git', ['-C', fork, 'status', '--porcelain'], { encoding: 'utf8' }).trim() !== '',
};
writeJson(path.join(workspace, 'provenance.json'), provenance);
if (process.argv.includes('--prepare')) {
  console.log(`Prepared published-package fixtures in ${workspace}`);
  process.exit(0);
}

const ngc = await import(require.resolve('@angular/compiler-cli'));
const ts = require('typescript');
function compile(stage, template) {
  const dir = path.join(workspace, stage);
  writeFileSync(
    path.join(dir, 'app.ts'),
    `
    import {ChangeDetectionStrategy, Component} from '@angular/core';
    @Component({selector: 'app-cem-validation', changeDetection: ChangeDetectionStrategy.OnPush,
      template: ${JSON.stringify(template)}})
    export class ValidationComponent {}
  `,
  );
  writeJson(path.join(dir, 'tsconfig.json'), {
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
      customElementsManifests: packages.map(({ name }) => name),
    },
    files: ['app.ts'],
  });
  const config = ngc.readConfiguration(path.join(dir, 'tsconfig.json'));
  assert.deepEqual(config.errors, []);
  const program = new ngc.NgtscProgram(
    config.rootNames,
    config.options,
    ngc.createCompilerHost({ options: config.options }),
  );
  return [
    ...program.getNgOptionDiagnostics(),
    ...program.getTsSemanticDiagnostics(),
    ...program.getNgSemanticDiagnostics(),
  ].map((diagnostic) => ({
    code: diagnostic.code,
    category: ts.DiagnosticCategory[diagnostic.category],
    file: diagnostic.file?.fileName,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '),
  }));
}

const results = {};
for (const stage of ['before', 'after']) {
  results[stage] = {
    valid: compile(stage, validTemplate),
    invalid: compile(stage, invalidTemplate),
  };
  assert.deepEqual(
    results[stage].valid.filter((diagnostic) => diagnostic.category === 'Error'),
    [],
    `${stage}: valid bindings must compile`,
  );
}
assert.deepEqual(
  results.before.invalid.filter((diagnostic) => diagnostic.category === 'Error'),
  [],
  'before: missing CEM metadata should demonstrate the validation gap',
);
const rejectedValues = results.after.invalid.filter(
  (diagnostic) => diagnostic.category === 'Error',
);
assert.equal(rejectedValues.length, invalidCount, JSON.stringify(results.after.invalid, null, 2));
assert.ok(
  rejectedValues.every(
    (diagnostic) => diagnostic.code === 2322 && diagnostic.message.includes('cem-invalid'),
  ),
  JSON.stringify(rejectedValues, null, 2),
);
writeJson(path.join(workspace, 'results.json'), {
  ...provenance,
  angularCompilerVersion: require('@angular/compiler-cli/package.json').version,
  angularSourceCommit: execFileSync(
    'git',
    ['-C', path.resolve(appDir, '../angular'), 'rev-parse', 'HEAD'],
    { encoding: 'utf8' },
  ).trim(),
  results,
});
console.log(
  `${library}: valid bindings compile before and after; ${invalidCount} invalid bindings escape before and produce TS2322 after.`,
);
console.log(`Full diagnostics and package provenance: ${path.join(workspace, 'results.json')}`);
