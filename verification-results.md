# Current feature verification

Verified on 2026-09-04 in WSL2 against Angular
`6a7c826f34b850fe1ff82d74be553d2b4f1f2da3` and its staged cleanup changes.
The staged diff's SHA-256 was
`fbfb731055e03c3d8cb366ce8763dbf57b27ea60222bfd1002e1a04c75318984`.

The installed framework, compiler, and language service are
`22.2.0-next.4+sha-6a7c826-with-local-changes`. All code and declaration files in the eight
installed Angular packages match the rebuilt distribution. The app keeps its pinned published
CLI and builder, both `22.1.0-rc.0`. Verification used Node `26.8.1` and TypeScript `6.0.3`.

## Build and automated tests

All checks below passed:

- Angular distribution and language-server VSIX builds, with Bazel limited to one job.
- `ngc -p tsconfig.app.json --noEmit`.
- Production and development app builds.
- All eight Vitest tests. They now await scheduled Angular updates.
- Nine compiler configuration checks through `npm run test:cem`.
- All 44 editor-protocol checks through `npm run test:cem`.
- Completion replacement with `strictAttributeTypes: false`.
- Completion latency checks with the focused and full Lion manifests.

The compiler checks include malformed and missing manifests, invalid diagnostic options,
summary and verbose diagnostics, the full Lion manifest, removal of Material metadata, and
Spectrum's uncorrected vendor metadata. Deliberately invalid configurations produce the expected
errors. The normal app compiles without errors.

The editor checks cover tags, properties, events, literal values, replacement edits, hovers,
typed local references, directive-owned inputs, and narrow type fallbacks. Same-name properties
and events both appear, and a manifest attribute does not remove an inherited DOM property.
Test inputs use in-memory compiler overrides and unsaved document buffers.

## Warning baseline

The configured manifests produce 28 warnings and zero errors. Verbose mode reports 1,936 findings:

| Code   | Findings |
| ------ | -------: |
| NG4009 |       19 |
| NG4010 |      134 |
| NG4011 |      330 |
| NG4013 |    1,153 |
| NG4014 |      300 |

The increase from the previously documented 25 summaries is three NG4010 summaries covering
134 repeated registrations in UI5, Fluent, and RHDS. The other verbose counts are unchanged.
The full Lion manifest compiles with zero errors and 32 summary warnings.

Builds also report the existing Nord Sass import deprecation. Production reports Spectrum's
CommonJS `focus-visible` dependency. No warning suppression was added.

## Browser usage

Chromium checks exercised all three routes:

- Shoelace input, select, switch, progress, keyboard rating, details, and alert dismissal.
- Box Model variant and gap changes, exact `minWidth` binding, progress and computed label,
  and the manifest-typed close event.
- Every gallery button, the RHDS switch, Spectrum text input, and the workspace class reference.
  All 14 controls disabled and re-enabled through the shared Angular signal.
- Lazy navigation, route titles, and keyboard focus.

Axe 4.10.3 reported zero violations on all three routes at desktop and 390-pixel viewport widths
after custom elements finished updating. There was no horizontal page overflow at 390 pixels.
The Box Model code sample needed `tabindex="0"` so keyboard users could scroll it. That fix is
included. An automated scan does not replace a full accessibility review.

No browser errors occurred. Development warnings came from Lit development mode, multiple Lit
versions, Spectrum development mode, and Auro scheduling another update.

## Manifest reload and editor limits

Saving additions and removals in the Material manifest updated template diagnostics and completion
values without changing TypeScript or HTML and without restarting the language server. This used
the server's filesystem watcher. The manifest was restored byte-for-byte afterward.

Unsaved manifest buffers affect subsequent completion requests and template checks, but a JSON
buffer change alone did not publish updated template diagnostics. Saving the manifest or editing
the template refreshed them. This remains an editor limitation.

The new VSIX is at `../angular/dist/bin/vscode-ng-language-service/ng-template.vsix`. Tests launched
its built server directly. The installed WSL extension remains `angular.ng-template@22.0.0-rc.0`;
installing the new VSIX affects other WSL projects and was left pending user approval. VS Code UI
interactions and its client-side file watchers were not tested in this run.

## Completion latency

These are single-run measurements in milliseconds, not performance thresholds.

| Manifest configuration |  Cold | Warm requests | After TS edits | After HTML edits |
| ---------------------- | ----: | ------------- | -------------- | ---------------- |
| Focused Lion           | 3,352 | 2, 1, 1       | 115, 85, 83    | 95, 106, 82      |
| Full Lion              | 2,905 | 9, 1, 1       | 155, 102, 196  | 104, 131, 99     |

Both runs returned the expected Spectrum variant and Material target values. The focused Lion
configuration and strict attribute checking were restored after verification. The development
server was stopped, and pre-existing staged changes and untracked files were preserved.
