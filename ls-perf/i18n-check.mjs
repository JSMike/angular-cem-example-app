// Compile a virtual component with the app's Angular packages, then render its AOT output.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(appRoot, 'package.json'));
const load = (specifier) => import(pathToFileURL(require.resolve(specifier)).href);
const { createCompilerHost, performCompilation, readConfiguration } =
  await load('@angular/compiler-cli');
const ts = (await load('typescript')).default;
const { JSDOM } = await load('jsdom');
const dom = new JSDOM('<main></main>', { url: 'http://localhost/' });
for (const name of ['window', 'document', 'Element', 'HTMLElement', 'Node', 'customElements']) {
  globalThis[name] = name === 'window' ? dom.window : dom.window[name];
}
customElements.define(
  'cem-i18n-probe',
  class extends HTMLElement {
    for = '';
  },
);
await load('@angular/compiler');
const localizeRoot = path.resolve(appRoot, '../angular/dist/packages-dist/localize/fesm2022');
await import(pathToFileURL(path.join(localizeRoot, 'init.mjs')).href);
const { loadTranslations } = await import(
  pathToFileURL(path.join(localizeRoot, 'localize.mjs')).href
);
loadTranslations({ 'cem-target': 'Translated {$INTERPOLATION}', 'cem-index': '{$INTERPOLATION}' });
const { createApplication } = await load('@angular/platform-browser');
const { provideZonelessChangeDetection } = await load('@angular/core');

const config = readConfiguration(path.join(appRoot, 'tsconfig.app.json'));
assert.deepEqual(config.errors, []);
const sourcePath = path.join(appRoot, 'src/cem-i18n-probe.ts');
const manifestPath = path.join(appRoot, 'src/cem-i18n-probe.json');
const files = new Map([
  [
    sourcePath,
    `
    import {Component, signal} from '@angular/core';
    @Component({
      selector: 'app-i18n-probe',
      template: '<cem-i18n-probe for="{{target()}}" i18n-for="@@cem-target" tabindex="{{index}}" i18n-tabindex="@@cem-index"></cem-i18n-probe><label for="{{target()}}" i18n-for="@@cem-target"></label>',
    })
    export class I18nProbe { target = signal('first'); index = 2; }
  `,
  ],
  [
    manifestPath,
    JSON.stringify({
      schemaVersion: '1.0.0',
      modules: [
        {
          kind: 'javascript-module',
          path: 'probe.js',
          declarations: [
            {
              kind: 'class',
              name: 'Probe',
              customElement: true,
              tagName: 'cem-i18n-probe',
              members: [{ kind: 'field', name: 'for', type: { text: 'string' } }],
            },
          ],
          exports: [
            {
              kind: 'custom-element-definition',
              name: 'cem-i18n-probe',
              declaration: { name: 'Probe' },
            },
          ],
        },
      ],
    }),
  ],
]);
const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'angular-cem-i18n-'));
let app;
try {
  const options = {
    ...config.options,
    customElementsManifests: [manifestPath],
    rootDir: path.join(appRoot, 'src'),
    outDir: outputDirectory,
    noEmit: false,
    declaration: false,
  };
  const host = createCompilerHost({ options });
  const readFile = host.readFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  host.readFile = (file) => files.get(path.resolve(file)) ?? readFile(file);
  host.fileExists = (file) => files.has(path.resolve(file)) || fileExists(file);
  let emitted;
  host.writeFile = (file, text) => {
    if (file.endsWith('cem-i18n-probe.js')) emitted = text;
  };
  const result = performCompilation({ rootNames: [sourcePath], options, host });
  assert.deepEqual(
    result.diagnostics.map((diag) => ts.flattenDiagnosticMessageText(diag.messageText, '\n')),
    [],
  );
  assert(emitted, 'Compiler did not emit the probe');
  const outputPath = path.join(outputDirectory, 'probe.mjs');
  fs.writeFileSync(
    outputPath,
    emitted.replace(
      /from (["'])(@angular\/[^"']+)\1/g,
      (_, _quote, specifier) =>
        `from ${JSON.stringify(pathToFileURL(require.resolve(specifier)).href)}`,
    ),
  );
  const { I18nProbe } = await import(pathToFileURL(outputPath).href);
  app = await createApplication({ providers: [provideZonelessChangeDetection()] });
  const component = app.bootstrap(I18nProbe, document.querySelector('main'));
  const element = document.querySelector('cem-i18n-probe');
  const label = document.querySelector('label');
  for (const value of ['first', 'second']) {
    component.instance.target.set(value);
    await app.whenStable();
    const observed = {
      for: element.for,
      htmlFor: element.htmlFor,
      tabIndex: element.tabIndex,
      nativeFor: label.htmlFor,
    };
    console.log(`Translated properties (${value}): ${JSON.stringify(observed)}`);
    assert.equal(element.tabIndex, 2);
    assert.equal(label.htmlFor, `Translated ${value}`);
    if (process.argv.includes('--expect-before')) {
      assert.equal(element.for, '');
      assert.equal(element.htmlFor, `Translated ${value}`);
    } else {
      assert.equal(element.for, `Translated ${value}`);
      assert.equal(element.htmlFor, undefined);
    }
  }
  console.log('PASS AOT translated property assignments and signal updates');
} finally {
  app?.destroy();
  dom.window.close();
  fs.rmSync(outputDirectory, { recursive: true, force: true });
}
