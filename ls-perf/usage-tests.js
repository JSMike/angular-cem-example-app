// Exercises the editor review guide through the built language server.
// Edits use unsaved document buffers and leave the application files unchanged.
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { appRoot, child, notifications, notify, request, uriOf, positionOf } = require('./harness');

const htmlPath = path.join(appRoot, 'src/app/integrations/design-systems/design-systems-page.html');
const tsPath = htmlPath.replace(/\.html$/, '.ts');
const htmlUri = uriOf(htmlPath);
const configUri = uriOf(path.join(appRoot, 'tsconfig.app.json'));
const configReports = [];
notifications.on('textDocument/publishDiagnostics', (report) => {
  if (report.uri === configUri) configReports.push(report.diagnostics);
});
let version = 1;
let failures = 0;
let passed = 0;
const filterIndex = process.argv.indexOf('--filter');
const filter = filterIndex === -1 ? '' : process.argv[filterIndex + 1];

function nextDiagnostics(uri = htmlUri) {
  return new Promise((resolve, reject) => {
    const listener = (params) => {
      if (params.uri === uri) {
        clearTimeout(timeout);
        notifications.off('textDocument/publishDiagnostics', listener);
        resolve(params.diagnostics);
      }
    };
    const timeout = setTimeout(() => {
      notifications.off('textDocument/publishDiagnostics', listener);
      reject(new Error('Timed out waiting for template diagnostics'));
    }, 30000);
    notifications.on('textDocument/publishDiagnostics', listener);
  });
}

async function edit(markedText) {
  const position = markedText.includes('|CURSOR|')
    ? positionOf(markedText, '|CURSOR|', 0)
    : { line: 0, character: 0 };
  const diagnostics = nextDiagnostics();
  notify('textDocument/didChange', {
    textDocument: { uri: htmlUri, version: ++version },
    contentChanges: [{ text: markedText.replace('|CURSOR|', '') }],
  });
  return { position, diagnostics: await diagnostics };
}

async function completions(text) {
  const { position } = await edit(text);
  const { result } = await request('textDocument/completion', {
    textDocument: { uri: htmlUri },
    position,
  });
  return Array.isArray(result) ? result : (result?.items ?? []);
}

async function expectLabels(text, expected, excluded = []) {
  const items = await completions(text);
  const labels = items.map((item) => item.label);
  for (const label of expected) assert(labels.includes(label), `Missing ${label}: ${labels}`);
  for (const label of excluded) assert(!labels.includes(label), `Unexpected ${label}: ${labels}`);
  return items;
}

async function hover(text, expected) {
  const { position } = await edit(text);
  const { result } = await request('textDocument/hover', {
    textDocument: { uri: htmlUri },
    position,
  });
  const contents = JSON.stringify(result?.contents);
  assert.match(contents ?? '', expected);
}

async function diagnostics(text, expected) {
  const result = (await edit(text)).diagnostics.filter((diagnostic) => diagnostic.severity === 1);
  if (expected === undefined) assert.deepEqual(result, []);
  else
    assert(
      result.some((diagnostic) => expected.test(diagnostic.message)),
      JSON.stringify(result),
    );
}

async function test(name, run) {
  if (!name.includes(filter)) return;
  try {
    await run();
    passed++;
    console.log(`PASS ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

async function main() {
  await request('initialize', {
    processId: process.pid,
    rootUri: uriOf(appRoot),
    capabilities: { workspace: { configuration: false } },
    initializationOptions: {},
  });
  notify('initialized', {});
  const initial = nextDiagnostics();
  for (const [filePath, languageId] of [
    [tsPath, 'typescript'],
    [htmlPath, 'html'],
  ]) {
    notify('textDocument/didOpen', {
      textDocument: {
        uri: uriOf(filePath),
        languageId,
        version: 1,
        text: fs.readFileSync(filePath, 'utf8'),
      },
    });
  }
  assert.deepEqual(
    (await initial).filter((diagnostic) => diagnostic.severity === 1),
    [],
  );

  await test('manifest diagnostics appear on the project config', () => {
    assert(configReports.length > 0, 'No config diagnostics were published');
    assert(
      configReports.at(-1).some((diagnostic) => diagnostic.code === -994013),
      'Missing warnings about discarded manifest type checks',
    );
  });

  for (const [prefix, tags] of [
    ['md-', ['md-filled-button']],
    ['sp-', ['sp-button', 'sp-theme', 'sp-textfield']],
    ['cem-', ['cem-workspace-example']],
    ['sl-', ['sl-alert', 'sl-input', 'sl-rating']],
  ])
    await test(`${prefix} tag completions`, () => expectLabels(`<${prefix}|CURSOR|`, tags));

  await test('Shoelace property completions', () =>
    expectLabels('<sl-rating |CURSOR|></sl-rating>', [
      '[label]',
      '[value]',
      '[max]',
      '[precision]',
    ]));
  await test('number property hover', () =>
    hover('<sl-rating [preci|CURSOR|sion]="1" />', /precision.*number/));
  await test('unknown property', () =>
    diagnostics('<sl-rating [precison]="1" />', /isn.t a known property/));
  await test('unknown tag', () => diagnostics('<sl-ratting />', /is not a known element/));
  await test('numeric property binding', () => diagnostics('<sl-rating [precision]="1" />'));
  await test('invalid numeric binding', () =>
    diagnostics('<sl-rating [precision]="\'one\'" />', /not assignable to type 'number'/));
  await test('Angular expression checking', () =>
    diagnostics('<sl-rating [precision]="notDeclared" />', /notDeclared.*does not exist/));
  await test('static numeric attributes use serialization', () =>
    diagnostics('<sl-rating precision="not-a-number" />'));
  await test('Box Model finite values', () =>
    expectLabels('<tag-box variant="|CURSOR|" />', [
      'neutral',
      'info',
      'success',
      'warning',
      'danger',
    ]));
  await test('referenced property alias hover', () =>
    hover('<button-box [var|CURSOR|iant]="\'primary\'" />', /ButtonVariant/));
  await test('referenced layout alias hover', () =>
    hover('<columns-box [ga|CURSOR|p]="\'md\'" />', /ColumnsGap/));
  await test('camel-case property completion', () =>
    expectLabels('<columns-box |CURSOR|/>', ['[minWidth]']));
  await test('invalid referenced layout value', () =>
    diagnostics('<columns-box [gap]="\'huge\'" />', /not assignable/));
  await test('valid literal attribute', () => diagnostics('<tag-box variant="success" />'));
  await test('invalid literal attribute', () =>
    diagnostics('<tag-box variant="not-real" />', /not assignable/));
  await test('invalid literal binding', () =>
    diagnostics('<tag-box [variant]="\'not-real\'" />', /not assignable/));
  await test('interpolated literal remains a string', () =>
    diagnostics('<tag-box variant="{{ \'success\' }}" />', /not assignable/));
  await test('exact readonly property', () => diagnostics('<sl-input [readonly]="true" />'));
  await test('native alias is not a custom property', () =>
    diagnostics('<sl-input [readOnly]="true" />', /isn.t a known property/));
  await test('Material target values', () =>
    expectLabels('<md-filled-button target="|CURSOR|" />', ['_blank', '_parent', '_self', '_top']));
  await test('invalid Material target', () =>
    diagnostics('<md-filled-button target="invalid" />', /not assignable/));
  await test('invalid Material type', () =>
    diagnostics('<md-filled-button [type]="\'link\'" />', /not assignable/));
  await test('Material boolean hover', () =>
    hover('<md-filled-button [softDis|CURSOR|abled]="false" />', /softDisabled.*boolean/));
  await test('Spectrum values', () =>
    expectLabels('<sp-button variant="|CURSOR|" />', [
      'accent',
      'primary',
      'secondary',
      'negative',
      'white',
      'black',
      'cta',
      'overBackground',
    ]));
  await test('literal replacement edit', async () => {
    const text = '<sp-button variant="pri|CURSOR|" />';
    const item = (await completions(text)).find((entry) => entry.label === 'primary');
    assert(item?.textEdit, 'Completion has no text edit');
    const range = item.textEdit.range ?? item.textEdit.replace;
    assert.equal(range.start.character, '<sp-button variant="'.length);
    assert.equal(range.end.character, '<sp-button variant="pri'.length);
    assert.equal(item.textEdit.newText, 'primary');
  });
  await test('Spectrum inherited disabled hover', () =>
    hover('<sp-button [dis|CURSOR|abled]="false" />', /disabled.*boolean/));
  await test('unknown member on partially typed element', () =>
    diagnostics('<sp-textfield [notARealProperty]="true" />', /isn.t a known property/));
  await test('rejected type retains existence checking', () =>
    diagnostics('<sp-textfield [type]="\'not-a-spectrum-type\'" />'));
  await test('attr binding uses serialization', () =>
    diagnostics('<sp-button [attr.variant]="\'not-real\'" />'));
  await test('workspace reference type', () =>
    hover('<cem-workspace-example #el /> {{ el.work|CURSOR|spaceOnly }}', /workspaceOnly.*string/));
  await test('workspace reference rejects unknown members', () =>
    diagnostics(
      '<cem-workspace-example #el /> {{ el.notAWorkspaceMember }}',
      /notAWorkspaceMember.*CemWorkspaceExampleElement/,
    ));
  await test('Shoelace reference type', () =>
    hover('<sl-input #el /> {{ el.va|CURSOR|lue }}', /SlInput.*value.*string/));
  await test('Shoelace reference rejects unknown members', () =>
    diagnostics('<sl-input #el /> {{ el.notAShoelaceMember }}', /notAShoelaceMember.*SlInput/));
  await test('custom event completions', () =>
    expectLabels('<sl-input (sl-|CURSOR|)="" />', ['(sl-change)', '(sl-input)']));
  await test('RHDS global event type', () =>
    hover('<rh-switch (change)="recordRhdsSwitch($ev|CURSOR|ent)" />', /Event/));
  await test('UI5 native event fallback', () =>
    hover('<ui5-button (click)="recordUi5Activation($ev|CURSOR|ent)" />', /Event/));
  await test('no inferred two-way binding', () =>
    expectLabels('<sl-input |CURSOR|/>', ['[value]'], ['[(value)]']));

  await test('Angular input owns literal completions', async () => {
    const original = fs.readFileSync(tsPath, 'utf8');
    const changed = original
      .replace('Component, computed, signal', 'Component, computed, signal, Directive, input')
      .replace(
        '@Component({',
        `@Directive({selector: 'sp-button'})\nexport class AngularButton { variant = input<'angular-only'>(); }\n\n@Component({\n  imports: [AngularButton],`,
      );
    try {
      notify('textDocument/didChange', {
        textDocument: { uri: uriOf(tsPath), version: 2 },
        contentChanges: [{ text: changed }],
      });
      await expectLabels(
        '<sp-button variant="|CURSOR|" />',
        ['angular-only'],
        ['primary', 'secondary'],
      );
      await diagnostics('<sp-button variant="primary" />', /not assignable/);
      await diagnostics('<sp-button variant="angular-only" />');
    } finally {
      notify('textDocument/didChange', {
        textDocument: { uri: uriOf(tsPath), version: 3 },
        contentChanges: [{ text: original }],
      });
      await diagnostics('<sp-button variant="primary" />');
    }
  });

  await test('same-name event and inherited property completions', async () => {
    const filePath = path.join(
      appRoot,
      'src/custom-elements/material-web-button.custom-elements.json',
    );
    const text = fs.readFileSync(filePath, 'utf8');
    const manifest = JSON.parse(text);
    const declaration = manifest.modules[0].declarations[0];
    declaration.events = [
      {
        name: 'value',
        type: { text: 'Event', references: [{ name: 'Event', package: 'global:' }] },
      },
    ];
    declaration.attributes.push({ name: 'title', type: { text: 'string' } });
    notify('textDocument/didOpen', {
      textDocument: { uri: uriOf(filePath), languageId: 'json', version: 1, text },
    });
    try {
      notify('textDocument/didChange', {
        textDocument: { uri: uriOf(filePath), version: 2 },
        contentChanges: [{ text: JSON.stringify(manifest) }],
      });
      await expectLabels('<md-filled-button |CURSOR|/>', ['[value]', '(value)', '[title]']);
    } finally {
      notify('textDocument/didChange', {
        textDocument: { uri: uriOf(filePath), version: 3 },
        contentChanges: [{ text }],
      });
      notify('textDocument/didClose', { textDocument: { uri: uriOf(filePath) } });
    }
  });

  await test('requests read updated manifest buffers', async () => {
    const filePath = path.join(
      appRoot,
      'src/custom-elements/material-web-button.custom-elements.json',
    );
    const text = fs.readFileSync(filePath, 'utf8');
    const changed = text.replaceAll(
      "'_blank' | '_parent' | '_self' | '_top'",
      "'_blank' | '_parent' | '_self' | '_top' | 'review-only'",
    );
    assert.notEqual(changed, text);
    notify('textDocument/didOpen', {
      textDocument: { uri: uriOf(filePath), languageId: 'json', version: 1, text },
    });
    const { position } = await edit('<md-filled-button target="review-only|CURSOR|" />');
    try {
      notify('textDocument/didChange', {
        textDocument: { uri: uriOf(filePath), version: 2 },
        contentChanges: [{ text: changed }],
      });
      const completion = await request('textDocument/completion', {
        textDocument: { uri: htmlUri },
        position,
      });
      assert(
        (completion.result.items ?? completion.result).some((item) => item.label === 'review-only'),
      );
      await diagnostics('<md-filled-button target="review-only" />');
      notify('textDocument/didChange', {
        textDocument: { uri: uriOf(filePath), version: 3 },
        contentChanges: [{ text }],
      });
      const restored = await request('textDocument/completion', {
        textDocument: { uri: htmlUri },
        position,
      });
      assert(
        !(restored.result.items ?? restored.result).some((item) => item.label === 'review-only'),
      );
      await diagnostics('<md-filled-button target="review-only" />', /not assignable/);
    } finally {
      notify('textDocument/didClose', { textDocument: { uri: uriOf(filePath) } });
    }
  });
  await test('manifest diagnostics clear after unsaved fixes', async () => {
    const filePath = path.join(
      appRoot,
      'src/custom-elements/material-web-button.custom-elements.json',
    );
    const text = fs.readFileSync(filePath, 'utf8');
    const errors = nextDiagnostics(configUri);
    notify('textDocument/didOpen', {
      textDocument: { uri: uriOf(filePath), languageId: 'json', version: 1, text: '{' },
    });
    try {
      const reported = await errors;
      assert(
        reported.some(
          (diagnostic) =>
            diagnostic.code === -994008 && diagnostic.message.includes(path.basename(filePath)),
        ),
      );
      const fixed = nextDiagnostics(configUri);
      notify('textDocument/didChange', {
        textDocument: { uri: uriOf(filePath), version: 2 },
        contentChanges: [{ text }],
      });
      const remaining = await fixed;
      assert(!remaining.some((diagnostic) => diagnostic.message.includes(path.basename(filePath))));
      assert(
        remaining.some((diagnostic) => diagnostic.code === -994013),
        'Unrelated manifest warnings were lost',
      );
    } finally {
      notify('textDocument/didClose', { textDocument: { uri: uriOf(filePath) } });
    }
  });
  console.log(`Editor checks: ${passed} passed, ${failures} failed`);
  assert(passed + failures > 0, `No checks match ${filter}`);
  process.exitCode = failures ? 1 : 0;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => child.kill());
