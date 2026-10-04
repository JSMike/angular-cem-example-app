#!/usr/bin/env node
/**
 * Compiler regression scenarios for the Custom Elements Manifest integration.
 *
 * Each scenario writes a small project under `regression/.tmp/<name>` and compiles it with the
 * Angular compiler installed in this application, so the checks exercise the same local build as
 * the demo. Projects live inside this repository so `@angular/core` resolves from `node_modules`.
 *
 * Usage: node regression/run.mjs [scenario-name-filter]
 */

import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const regressionDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.dirname(regressionDir);
const tmpDir = path.join(regressionDir, '.tmp');
const require = createRequire(path.join(appDir, 'package.json'));
const ngc = await import(require.resolve('@angular/compiler-cli'));
const ts = require('typescript');

const BASE_COMPILER_OPTIONS = {
  strict: true,
  target: 'ES2022',
  module: 'preserve',
  moduleResolution: 'bundler',
  lib: ['es2022', 'dom'],
  types: [],
  skipLibCheck: true,
  experimentalDecorators: true,
  outDir: './out',
};

/** A manifest declaring one custom element with the given fields and module path. */
function manifest(tagName, className, fields, modulePath = 'element.js') {
  return {
    schemaVersion: '2.1.0',
    modules: [
      {
        kind: 'javascript-module',
        path: modulePath,
        declarations: [
          { kind: 'class', name: className, customElement: true, tagName, members: fields },
        ],
        exports: [
          { kind: 'custom-element-definition', name: tagName, declaration: { name: className } },
          { kind: 'js', name: className, declaration: { name: className } },
        ],
      },
    ],
  };
}

function component(template, members = '') {
  return `
    import {Component} from '@angular/core';

    @Component({selector: 'app-test', template: \`${template}\`})
    export class TestComponent {
      ${members}
    }
  `;
}

function tsconfig(angularCompilerOptions, extra = {}) {
  return {
    compilerOptions: BASE_COMPILER_OPTIONS,
    angularCompilerOptions: { strictTemplates: true, ...angularCompilerOptions },
    ...extra,
  };
}

/** Writes a scenario project. Object values are serialized as JSON. */
function writeProject(name, files) {
  const dir = path.join(tmpDir, name);
  rmSync(dir, { recursive: true, force: true });
  writeFiles(dir, files);
  return dir;
}

function writeFiles(dir, files) {
  for (const [file, content] of Object.entries(files)) {
    const filePath = path.join(dir, file);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(
      filePath,
      typeof content === 'string' ? content : JSON.stringify(content, null, 2),
    );
  }
}

/**
 * A compiler host that reuses unchanged source files, as build tools do in watch mode. New
 * `SourceFile` objects for unchanged declarations would make every rebuild a fresh compilation.
 */
function createCachingHost(options) {
  const host = ngc.createCompilerHost({ options });
  const cache = new Map();
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    const text = host.readFile(fileName);
    const cached = cache.get(fileName);
    if (cached !== undefined && cached.text === text) {
      return cached.sourceFile;
    }
    const sourceFile = getSourceFile(fileName, languageVersion, onError, shouldCreate);
    if (sourceFile !== undefined) {
      cache.set(fileName, { text, sourceFile });
    }
    return sourceFile;
  };
  return host;
}

/**
 * Compiles a project and returns its diagnostics. Pass the previous result to build
 * incrementally with the same host, as `ng serve` does after a file change.
 */
function compile(tsconfigPath, { previous = null, emit = false } = {}) {
  const config = ngc.readConfiguration(tsconfigPath);
  assert.deepEqual(config.errors, [], 'tsconfig should parse');
  const host = previous?.host ?? createCachingHost(config.options);
  const program = new ngc.NgtscProgram(
    config.rootNames,
    config.options,
    host,
    previous?.program ?? undefined,
  );
  const diagnostics = [
    ...program.getNgOptionDiagnostics(),
    ...program.getTsSemanticDiagnostics(),
    ...program.getNgSemanticDiagnostics(),
  ];
  if (emit) {
    program.emit();
  }
  return { program, host, diagnostics: diagnostics.map(describeDiagnostic) };
}

function describeDiagnostic(diagnostic) {
  const code =
    diagnostic.code < 0 ? `NG${String(-diagnostic.code).slice(2)}` : `TS${diagnostic.code}`;
  return {
    code,
    category: ts.DiagnosticCategory[diagnostic.category],
    file: diagnostic.file ? path.basename(diagnostic.file.fileName) : null,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '),
  };
}

function format(diagnostics) {
  return diagnostics.length === 0
    ? '  (no diagnostics)'
    : diagnostics
        .map((d) => `  ${d.category} ${d.code}${d.file ? ` ${d.file}` : ''}: ${d.message}`)
        .join('\n');
}

function errors(diagnostics) {
  return diagnostics.filter((d) => d.category === 'Error');
}

function templateDiagnostics(diagnostics) {
  return diagnostics.filter((d) => d.file !== null);
}

function expectNoErrors(diagnostics, context) {
  assert.equal(
    errors(diagnostics).length,
    0,
    `${context}: expected no errors, got\n${format(diagnostics)}`,
  );
}

function expectDiagnostic(diagnostics, code, text, context) {
  assert.ok(
    diagnostics.some((d) => d.code === code && d.message.includes(text)),
    `${context}: expected ${code} containing ${JSON.stringify(text)}, got\n${format(diagnostics)}`,
  );
}

const scenarios = [
  {
    name: 'partial-declaration-requires-linker-22.3',
    finding: '#1',
    description:
      'Partial declarations carrying exact manifest property names require a linker that reads ' +
      'them; 22.2.x linkers would drop the names and remap `readonly` to `readOnly`.',
    run() {
      const dir = writeProject(this.name, {
        'tsconfig.json': tsconfig({
          compilationMode: 'partial',
          customElementsManifests: ['./custom-elements.json'],
        }),
        'custom-elements.json': manifest('exact-input', 'ExactInput', [
          { kind: 'field', name: 'readonly', type: { text: 'boolean' } },
        ]),
        'test.ts': component('<exact-input [readonly]="true"></exact-input>'),
      });
      const { diagnostics } = compile(path.join(dir, 'tsconfig.json'), { emit: true });
      expectNoErrors(diagnostics, 'partial compilation');
      const output = readFileSync(path.join(dir, 'out/test.js'), 'utf8');
      assert.match(output, /customElementPropertyNames: \{ "exact-input": \["readonly"\] \}/);
      const minVersion = /ɵɵngDeclareComponent\(\{ minVersion: "([^"]+)"/.exec(output)?.[1];
      assert.equal(minVersion, '22.3.0', 'partial component minVersion');
    },
  },
  {
    name: 'bare-json-entry-suggests-path',
    finding: '#4',
    description:
      'A bare `custom-elements.json` entry is a module specifier, like tsconfig `extends`. When ' +
      'the project file exists, NG4007 suggests the `./` form.',
    run() {
      const files = {
        'custom-elements.json': manifest('bare-element', 'BareElement', []),
        'test.ts': component('<bare-element></bare-element>'),
      };
      const bare = writeProject(this.name, {
        ...files,
        'tsconfig.json': tsconfig({ customElementsManifests: ['custom-elements.json'] }),
      });
      const { diagnostics } = compile(path.join(bare, 'tsconfig.json'));
      expectDiagnostic(diagnostics, 'NG4007', `', use './custom-elements.json'.`, 'bare entry');

      const relative = writeProject(`${this.name}-relative`, {
        ...files,
        'tsconfig.json': tsconfig({ customElementsManifests: ['./custom-elements.json'] }),
      });
      expectNoErrors(compile(path.join(relative, 'tsconfig.json')).diagnostics, './ entry');
    },
  },
  {
    name: 'inherited-relative-entry-names-project-directory',
    finding: '#5',
    description:
      'Relative entries inherited through `extends` resolve against the final project directory, ' +
      'as for every other angularCompilerOptions value. NG4007 names that directory.',
    run() {
      const dir = writeProject(this.name, {
        'tsconfig.base.json': tsconfig({ customElementsManifests: ['./custom-elements.json'] }),
        'custom-elements.json': manifest('shared-element', 'SharedElement', []),
        'projects/app/tsconfig.json': { extends: '../../tsconfig.base.json', include: ['*.ts'] },
        'projects/app/test.ts': component('<shared-element></shared-element>'),
      });
      const { diagnostics } = compile(path.join(dir, 'projects/app/tsconfig.json'));
      expectDiagnostic(
        diagnostics,
        'NG4007',
        `Relative entries resolve against the project directory '${path.join(dir, 'projects/app')}', ` +
          `including entries inherited through "extends".`,
        'inherited entry',
      );
    },
  },
  {
    name: 'element-class-without-htmlelement-heritage',
    finding: '#3',
    description:
      'A package class whose typings omit its HTMLElement heritage still types local references, ' +
      'and native DOM events on the element do not report missing `addEventListener`.',
    run() {
      const dir = writeProject(this.name, {
        'tsconfig.json': tsconfig({ customElementsManifests: ['@regression/plain-elements'] }),
        'node_modules/@regression/plain-elements/package.json': {
          name: '@regression/plain-elements',
          types: './element.d.ts',
          customElements: './custom-elements.json',
        },
        'node_modules/@regression/plain-elements/element.d.ts': `export declare class PlainButton {
          count: number;
        }`,
        'node_modules/@regression/plain-elements/custom-elements.json': manifest(
          'plain-button',
          'PlainButton',
          [{ kind: 'field', name: 'count', type: { text: 'number' } }],
        ),
        'test.ts': component(
          '<plain-button #button (click)="onClick($event)">{{ button.count.toFixed() }}</plain-button>',
          'onClick(event: MouseEvent) {}',
        ),
      });
      expectNoErrors(compile(path.join(dir, 'tsconfig.json')).diagnostics, 'native click');

      // Native event typing still applies to the same element.
      writeFiles(dir, {
        'test.ts': component(
          '<plain-button (click)="onKey($event)"></plain-button>',
          'onKey(event: KeyboardEvent) {}',
        ),
      });
      const { diagnostics } = compile(path.join(dir, 'tsconfig.json'));
      // The DOM library types `click` as MouseEvent or PointerEvent, depending on its version.
      expectDiagnostic(
        diagnostics,
        'TS2345',
        `is not assignable to parameter of type 'KeyboardEvent'`,
        'mistyped native click handler',
      );
    },
  },
  {
    name: 'rebuild-after-global-type-added',
    finding: '#2',
    description:
      'A manifest property typed with a `global:` reference is unchecked until the global exists. ' +
      'Adding it in a file the component does not import must recheck the component on rebuild.',
    run() {
      const dir = writeProject(this.name, {
        'tsconfig.json': tsconfig({ customElementsManifests: ['./custom-elements.json'] }),
        'custom-elements.json': manifest('late-element', 'LateElement', [
          {
            kind: 'field',
            name: 'config',
            type: {
              text: 'LateConfig',
              references: [{ name: 'LateConfig', package: 'global:', start: 0, end: 10 }],
            },
          },
        ]),
        'globals.ts': 'export {};\n',
        'test.ts': component('<late-element [config]="config"></late-element>', 'config = 1;'),
      });
      const tsconfigPath = path.join(dir, 'tsconfig.json');
      const first = compile(tsconfigPath);
      expectDiagnostic(first.diagnostics, 'NG4011', `'LateConfig'`, 'first build');
      assert.deepEqual(templateDiagnostics(first.diagnostics), [], 'first build template');

      writeFiles(dir, {
        'globals.ts': 'export {};\ndeclare global {\n  interface LateConfig { mode: string; }\n}\n',
      });
      const expected = `Type 'number' is not assignable to type 'LateConfig'.`;
      // Control: a fresh build of the changed project reports the error.
      const fresh = compile(tsconfigPath);
      expectDiagnostic(templateDiagnostics(fresh.diagnostics), 'TS2322', expected, 'fresh build');
      const second = compile(tsconfigPath, { previous: first });
      expectDiagnostic(
        templateDiagnostics(second.diagnostics),
        'TS2322',
        expected,
        'incremental rebuild',
      );
    },
  },
  {
    name: 'rebuild-after-package-declaration-fixed',
    finding: '#2',
    description:
      'A type reference into package declarations outside the application program is unusable ' +
      'until the package exports it. Fixing the package must recheck unchanged templates.',
    run() {
      const packageDir = 'node_modules/@regression/typed-elements';
      const dir = writeProject(this.name, {
        'tsconfig.json': tsconfig({ customElementsManifests: ['@regression/typed-elements'] }),
        [`${packageDir}/package.json`]: {
          name: '@regression/typed-elements',
          types: './element.d.ts',
          customElements: './custom-elements.json',
        },
        [`${packageDir}/element.d.ts`]:
          'export declare class TypedElement extends HTMLElement {}\n',
        [`${packageDir}/custom-elements.json`]: manifest('typed-element', 'TypedElement', [
          {
            kind: 'field',
            name: 'mode',
            type: { text: 'Mode', references: [{ name: 'Mode', module: 'element.js' }] },
          },
        ]),
        'test.ts': component(`<typed-element [mode]="'c'"></typed-element>`),
      });
      const tsconfigPath = path.join(dir, 'tsconfig.json');
      const first = compile(tsconfigPath);
      expectDiagnostic(first.diagnostics, 'NG4011', `'Mode'`, 'first build');
      assert.deepEqual(templateDiagnostics(first.diagnostics), [], 'first build template');

      writeFiles(dir, {
        [`${packageDir}/element.d.ts`]:
          "export type Mode = 'a' | 'b';\nexport declare class TypedElement extends HTMLElement {}\n",
      });
      const expected = `Type '"c"' is not assignable to type 'Mode'.`;
      // Control: a fresh build of the changed project reports the error.
      const fresh = compile(tsconfigPath);
      expectDiagnostic(templateDiagnostics(fresh.diagnostics), 'TS2322', expected, 'fresh build');
      const second = compile(tsconfigPath, { previous: first });
      expectDiagnostic(
        templateDiagnostics(second.diagnostics),
        'TS2322',
        expected,
        'incremental rebuild',
      );
    },
  },
  {
    name: 'unclaimed-event-names-accept-manifest-events',
    finding: 'new',
    description:
      'With `strictUnclaimedEventNames`, events that a manifest declares are not reported as ' +
      'unclaimed, on the element or on an ancestor with a directive. Other names still are.',
    run() {
      const declaredManifest = manifest('count-box', 'CountBox', []);
      declaredManifest.modules[0].declarations[0].events = [
        {
          name: 'countChange',
          type: { text: 'Event', references: [{ name: 'Event', package: 'global:' }] },
        },
      ];
      const testComponent = (template) => `
        import {Component, Directive} from '@angular/core';

        @Directive({selector: '[some-dir]'})
        export class SomeDir {}

        @Component({selector: 'app-test', template: \`${template}\`, imports: [SomeDir]})
        export class TestComponent {
          handle(event: Event) {}
        }
      `;
      const dir = writeProject(this.name, {
        'tsconfig.json': tsconfig({
          customElementsManifests: ['./custom-elements.json'],
          strictUnclaimedEventNames: true,
        }),
        'custom-elements.json': declaredManifest,
        'test.ts': testComponent(
          '<count-box some-dir (countChange)="handle($event)"></count-box>' +
            '<div some-dir (countChange)="handle($event)"><count-box></count-box></div>',
        ),
      });
      expectNoErrors(compile(path.join(dir, 'tsconfig.json')).diagnostics, 'declared event');

      writeFiles(dir, {
        'test.ts': testComponent('<count-box some-dir (countChnage)="handle($event)"></count-box>'),
      });
      expectDiagnostic(
        compile(path.join(dir, 'tsconfig.json')).diagnostics,
        'NG8030',
        `Event 'countChnage' is not emitted`,
        'misspelled event',
      );
    },
  },
  {
    name: 'demo-app-diagnostics-baseline',
    finding: '#10',
    description:
      'All manifests are validated in one type-checking program. The demo keeps its documented ' +
      'baseline: 20 summarized CEM warnings and no errors.',
    run() {
      const start = performance.now();
      const { diagnostics } = compile(path.join(appDir, 'tsconfig.app.json'));
      const elapsed = performance.now() - start;
      expectNoErrors(diagnostics, 'demo app');
      const cemWarnings = diagnostics.filter(
        (d) => d.category === 'Warning' && /^NG40(0[7-9]|1[0-4])$/.test(d.code),
      );
      assert.equal(cemWarnings.length, 20, `CEM warnings\n${format(cemWarnings)}`);
      return `${elapsed.toFixed(0)} ms to diagnose`;
    },
  },
];

const filter = process.argv[2];
const selected = scenarios.filter((scenario) => !filter || scenario.name.includes(filter));
const version = require('@angular/compiler-cli/package.json').version;
console.log(`@angular/compiler-cli ${version}\n`);

let failures = 0;
for (const scenario of selected) {
  try {
    const note = await scenario.run();
    console.log(`PASS ${scenario.finding} ${scenario.name}${note ? ` (${note})` : ''}`);
  } catch (error) {
    failures++;
    console.log(`FAIL ${scenario.finding} ${scenario.name}`);
    console.log(`  ${scenario.description}`);
    console.log(
      String(error instanceof assert.AssertionError ? error.message : error.stack)
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n'),
    );
  }
}
if (existsSync(tmpDir) && failures === 0) {
  rmSync(tmpDir, { recursive: true, force: true });
}
console.log(`\n${selected.length - failures}/${selected.length} scenarios passed`);
process.exitCode = failures === 0 ? 0 : 1;
