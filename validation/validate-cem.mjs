#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const library = 'webcomponents';
const appRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(path.join(appRoot, 'package.json'));
const ng = await import(require.resolve('@angular/compiler-cli'));
const ts = require('typescript');
const config = library === 'webcomponents' ? {
  packageName: '@ui5/webcomponents',
  generatedManifest: '../webcomponents/packages/main/dist/custom-elements.json',
  importText: "import type { ButtonClickEventDetail } from '@ui5/webcomponents/dist/Button.js';",
  validTemplate: '<ui5-button (click)="handle($event)"></ui5-button>',
  validMembers: 'protected handle(event: CustomEvent<ButtonClickEventDetail>): void {}',
  invalidTemplate: '<ui5-button (click)="handle($event.detail.shiftKey)"></ui5-button>',
  invalidMembers: 'protected handle(value: number): void {}',
} : {
  packageName: '@fluentui/web-components',
  generatedManifest: '../fluentui/packages/web-components/custom-elements.json',
  importText: "import type { Button } from '@fluentui/web-components/button/class.js';",
  validTemplate: '<fluent-button #button [appearance]="\'primary\'" (click)="handle(button)"></fluent-button><fluent-textarea></fluent-textarea><fluent-option></fluent-option>',
  validMembers: 'protected handle(button: Button): void {}',
  invalidTemplate: '<fluent-button [appearance]="\'not-a-button-appearance\'"></fluent-button>',
  invalidMembers: '',
};
const packageRoot = path.join(appRoot, 'node_modules', config.packageName);
const packageJson = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
const generatedManifest = path.resolve(appRoot, process.argv[2] ?? config.generatedManifest);
assert.ok(existsSync(generatedManifest), `Generate the fork manifest first: ${generatedManifest}`);
const manifestText = readFileSync(generatedManifest, 'utf8');
const temporaryRoot = path.join(appRoot, 'validation', '.tmp', library);
rmSync(temporaryRoot, { recursive: true, force: true });

function compile(name, fixed, invalid) {
  const directory = path.join(temporaryRoot, name);
  const fixturePackage = path.join(directory, 'node_modules', config.packageName);
  mkdirSync(directory, { recursive: true });
  // Copy only declarations/metadata into this scenario. Never mutate the installed package.
  cpSync(packageRoot, fixturePackage, {
    recursive: true,
    dereference: true,
    filter: source => statSync(source).isDirectory() || source.endsWith('.d.ts') || ['package.json', 'custom-elements.json'].includes(path.basename(source)),
  });
  if (fixed) writeFileSync(path.join(fixturePackage, packageJson.customElements), manifestText);
  writeFileSync(path.join(directory, 'component.ts'), `
    import { Component, ChangeDetectionStrategy } from '@angular/core';
    ${config.importText}
    @Component({selector: 'app-validation', changeDetection: ChangeDetectionStrategy.OnPush,
      template: \`${invalid ? config.invalidTemplate : config.validTemplate}\`})
    export class ValidationComponent { ${invalid ? config.invalidMembers : config.validMembers} }
  `);
  const tsconfig = path.join(directory, 'tsconfig.json');
  writeFileSync(tsconfig, JSON.stringify({
    compilerOptions: { strict: true, target: 'ES2022', module: 'preserve', moduleResolution: 'bundler', lib: ['es2022', 'dom'], types: [], skipLibCheck: true, experimentalDecorators: true, noEmit: true },
    angularCompilerOptions: { strictTemplates: true, customElementsManifests: [config.packageName], customElementsManifestsDiagnostics: 'verbose' },
    files: ['./component.ts'],
  }, null, 2));
  const { rootNames, options, errors } = ng.readConfiguration(tsconfig);
  assert.equal(errors.length, 0, 'Validation configuration must parse');
  const result = ng.performCompilation({ rootNames, options });
  return result.diagnostics.map(diagnostic => ({
    code: diagnostic.code,
    category: diagnostic.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  }));
}

const baseline = compile('baseline-valid', false, false);
const baselineInvalid = compile('baseline-invalid', false, true);
const fixed = compile('fixed-valid', true, false);
const invalid = compile('fixed-invalid', true, true);
const errors = diagnostics => diagnostics.filter(diagnostic => diagnostic.category === 'error');
assert.ok(errors(baseline).length > 0, 'The published manifest must reproduce the strict-template failure');
if (library === 'fluentui') assert.deepEqual(errors(baselineInvalid), [], 'The published manifest currently fails to reject an invalid appearance');
assert.deepEqual(errors(fixed), [], 'The generated fork manifest must accept the valid strict template');
assert.ok(errors(invalid).some(diagnostic => [2322, 2345].includes(diagnostic.code)), 'The generated manifest must reject the invalid property/event value');
const result = {
  library, packageName: config.packageName, declarationPackageVersion: packageJson.version,
  generatedManifest, generatedManifestSha256: createHash('sha256').update(manifestText).digest('hex'),
  angularCompilerVersion: ng.VERSION.full,
  fixtureKind: 'published declaration package with fork-generated manifest; not a full fork runtime build',
  baselineErrors: errors(baseline), baselineInvalidErrors: errors(baselineInvalid), fixedErrors: errors(fixed), invalidErrors: errors(invalid),
  warnings: { baseline: baseline.filter(d => d.category === 'warning').length, fixed: fixed.filter(d => d.category === 'warning').length },
};
writeFileSync(path.join(appRoot, 'validation', 'results.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
