/**
 * LSP measurement harness for the Angular language server built from `../angular`.
 *
 * Measures completion latency before and after TypeScript and HTML edits.
 * Compare the configured Lion projection with the full published manifest.
 *
 * Usage:
 *   node ls-perf/harness.js [--edits N]
 *
 * `--ngProbeLocations` points at the built VSIX sandbox. Reinstalling the app's
 * dependencies does not rebuild this language server.
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

const notifications = new EventEmitter();

const appRoot = path.resolve(__dirname, '..');
const sandbox = path.resolve(
  appRoot,
  '../angular/dist/bin/vscode-ng-language-service/vsix_sandbox',
);
const serverEntry = path.join(sandbox, 'server/index.js');

const htmlPath = path.join(appRoot, 'src/app/integrations/design-systems/design-systems-page.html');
const tsPath = path.join(appRoot, 'src/app/integrations/design-systems/design-systems-page.ts');

const editCount = (() => {
  const index = process.argv.indexOf('--edits');
  return index === -1 ? 5 : Number(process.argv[index + 1]);
})();

function uriOf(filePath) {
  return 'file://' + filePath;
}

const child = spawn(
  'node',
  [
    serverEntry,
    '--stdio',
    '--tsProbeLocations',
    path.join(appRoot, 'node_modules'),
    '--ngProbeLocations',
    path.join(sandbox, 'node_modules'),
  ],
  { stdio: ['pipe', 'pipe', 'inherit'] },
);

let nextId = 1;
const pending = new Map();
let buffer = Buffer.alloc(0);

child.stdout.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      return;
    }
    const header = buffer.slice(0, headerEnd).toString();
    const match = /Content-Length: (\d+)/i.exec(header);
    if (match === null) {
      throw new Error(`Bad LSP header: ${header}`);
    }
    const length = Number(match[1]);
    const start = headerEnd + 4;
    if (buffer.length < start + length) {
      return;
    }
    const message = JSON.parse(buffer.slice(start, start + length).toString());
    buffer = buffer.slice(start + length);
    onMessage(message);
  }
});

function send(message) {
  const body = Buffer.from(JSON.stringify(message));
  child.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
  child.stdin.write(body);
}

function request(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timed out waiting for ${method}`));
    }, 30000);
    pending.set(id, (message) => {
      clearTimeout(timeout);
      if (message.error) {
        reject(new Error(JSON.stringify(message.error)));
      } else {
        resolve(message);
      }
    });
    send({ jsonrpc: '2.0', id, method, params });
  });
}

function notify(method, params) {
  send({ jsonrpc: '2.0', method, params });
}

function onMessage(message) {
  if (message.id !== undefined && message.method === undefined) {
    const resolve = pending.get(message.id);
    if (resolve !== undefined) {
      pending.delete(message.id);
      resolve(message);
    }
    return;
  }
  if (message.id !== undefined) {
    // These tests do not provide client configuration or file watchers.
    send({ jsonrpc: '2.0', id: message.id, result: null });
  }
  if (message.method !== undefined) {
    notifications.emit(message.method, message.params);
  }
}

function positionOf(text, needle, offsetInNeedle) {
  const index = text.indexOf(needle);
  if (index === -1) {
    throw new Error(`Needle not found: ${needle}`);
  }
  const upTo = text.slice(0, index + offsetInNeedle);
  const lines = upTo.split('\n');
  return { line: lines.length - 1, character: lines[lines.length - 1].length };
}

function completionLabels(message) {
  const result = message.result;
  const items = Array.isArray(result) ? result : (result?.items ?? []);
  return items.map((item) => (typeof item.label === 'string' ? item.label : item.label.label));
}

async function requestCompletion(position) {
  return request('textDocument/completion', {
    textDocument: { uri: uriOf(htmlPath) },
    position,
  });
}

async function timeCompletion(position) {
  const startedAt = process.hrtime.bigint();
  await requestCompletion(position);
  return Number(process.hrtime.bigint() - startedAt) / 1e6;
}

async function verifyValueCompletions(text, needle, expected, version) {
  notify('textDocument/didChange', {
    textDocument: { uri: uriOf(htmlPath), version },
    contentChanges: [{ text }],
  });
  const position = positionOf(text, needle, needle.length - 1);
  const labels = completionLabels(await requestCompletion(position));
  const missing = expected.filter((label) => !labels.includes(label));
  if (missing.length > 0) {
    throw new Error(
      `Missing completions for ${needle}: ${missing.join(', ')} (received: ${labels.join(', ')})`,
    );
  }
  console.log(`${needle} completions: ${expected.join(' ')}`);
}

async function main() {
  const htmlText = fs.readFileSync(htmlPath, 'utf8');
  const tsText = fs.readFileSync(tsPath, 'utf8');
  // Completion inside the value of `system="spectrum"` on <sp-theme>.
  const position = positionOf(htmlText, 'system="spectrum"', 'system="'.length);

  await request('initialize', {
    processId: process.pid,
    rootUri: uriOf(appRoot),
    capabilities: { workspace: { configuration: false } },
    initializationOptions: {},
  });
  notify('initialized', {});
  notify('textDocument/didOpen', {
    textDocument: { uri: uriOf(htmlPath), languageId: 'html', version: 1, text: htmlText },
  });
  notify('textDocument/didOpen', {
    textDocument: { uri: uriOf(tsPath), languageId: 'typescript', version: 1, text: tsText },
  });

  const cold = await timeCompletion(position);
  const warm = [];
  for (let i = 0; i < 3; i++) {
    warm.push(await timeCompletion(position));
  }

  const afterTsEdit = [];
  for (let i = 0; i < editCount; i++) {
    notify('textDocument/didChange', {
      textDocument: { uri: uriOf(tsPath), version: 2 + i },
      contentChanges: [{ text: tsText + `\n// edit ${i}\n` }],
    });
    afterTsEdit.push(await timeCompletion(position));
  }

  const afterHtmlEdit = [];
  for (let i = 0; i < editCount; i++) {
    notify('textDocument/didChange', {
      textDocument: { uri: uriOf(htmlPath), version: 2 + i },
      contentChanges: [{ text: htmlText + `\n<!-- edit ${i} -->\n` }],
    });
    afterHtmlEdit.push(await timeCompletion(position));
  }

  const fmt = (values) => values.map((value) => value.toFixed(0)).join(' ');
  console.log(`cold: ${cold.toFixed(0)} ms`);
  console.log(`warm x3: ${fmt(warm)} ms`);
  console.log(`after ts edit x${editCount}: ${fmt(afterTsEdit)} ms`);
  console.log(`after html edit x${editCount}: ${fmt(afterHtmlEdit)} ms`);

  const spectrumText = htmlText.replace('[variant]="spectrumVariant()"', 'variant=""');
  await verifyValueCompletions(
    spectrumText,
    'variant=""',
    ['accent', 'primary', 'secondary', 'negative'],
    editCount + 2,
  );

  const materialText = htmlText.replace('target="_self"', 'target=""');
  await verifyValueCompletions(
    materialText,
    'target=""',
    ['_blank', '_parent', '_self', '_top'],
    editCount + 3,
  );

  child.kill();
  process.exit(0);
}

module.exports = { appRoot, child, notifications, notify, request, uriOf, positionOf };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    child.kill();
    process.exit(1);
  });
}
