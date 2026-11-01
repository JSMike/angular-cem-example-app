# Angular CLI follow-up: customElementsManifests diagnostics UX

The CLI half of the Custom Elements Manifest diagnostics work lives in `../angular-cli` and ships
separately from the Angular framework PR. This document tracks the companion PR's scope, the
upstream issues discovered along the way, and what deliberately stays out of scope. File-ready
texts (2026-07-17): [`cli-pr-description.md`](./cli-pr-description.md) for the companion PR and
[`upstream-issue-verbose-double-print.md`](./upstream-issue-verbose-double-print.md) for the
double-print issue; filing awaits the framework PR landing first. The framework
PR is fully functional without any of this — the
`customElementsManifestsDiagnostics: 'summary' | 'verbose'` compiler option is authoritative and
the adev docs qualify the CLI shortcut accordingly.

## Companion PR scope (implemented on the local `../angular-cli` checkout, tests green)

1. **`--verbose` maps to verbose manifest diagnostics.**
   - `packages/angular/build/src/tools/esbuild/compiler-plugin-options.ts` sets
     `verboseDiagnostics: !!options.verbose` from the normalized builder options.
   - `packages/angular/build/src/tools/esbuild/angular/compiler-plugin.ts` declares the
     `verboseDiagnostics` plugin option and, in the compiler-options transformer, applies
     `customElementsManifestsDiagnostics: 'verbose'` when set. An explicit per-invocation flag
     intentionally overrides a tsconfig `'summary'`.
   - Spec: `compiler-plugin-options_spec.ts` (mapping on, and off by default).

2. **Watch rebuilds no longer re-print unchanged manifest warnings.**
   - `packages/angular/build/src/tools/angular/compilation/option-diagnostics.ts` — pure
     `filterRepeatedOptionWarnings(diagnostics, previouslyReported)`: suppresses
     warning-category option diagnostics whose flattened text set is unchanged from the previous
     build; any change (added or removed warning) re-reports the full set; error-category
     diagnostics always pass through.
   - `AotCompilation` holds the reported-texts set between builds and delegates to the helper in
     `collectDiagnostics` (Option mode).
   - Spec: `option-diagnostics_spec.ts` — six cases: first-build reporting, unchanged
     suppression, added-warning re-report, removed-warning re-report, errors always repeat,
     message-chain flattening.
   - Verified end-to-end on the current demo app: `ng serve` prints the 25 summaries once; an unrelated
     source edit re-prints nothing; a manifest edit that changes the warning set re-reports
     everything plus the new warning in detail.

3. **Watch coverage.** `rebuild-custom-elements-manifest_spec.ts` (application builder behavior
   test, added 2026-07-17) covers the two watch scenarios: in-place edit of a `node_modules`
   manifest (rebuild reports the new warning) and creation of a missing configured manifest
   (NG4007 clears without restart). Both were verified empirically on the demo app with the
   locally built framework before the spec was written; the spec itself only runs green once the
   CLI repo's Angular dependencies include `customElementsManifests`. Finding worth keeping: the
   default watch mode watches the compiler-reported watch-file list explicitly, so manifests
   under `node_modules` are covered; only the opt-in `NG_BUILD_WATCH_ROOT` mode ignores
   `**/node_modules/**` (relying on package manifest/lock files), where in-place edits of
   installed packages may go unnoticed — a pre-existing, documented limitation.

4. **Sequencing.** Land the framework PR first (compiler option + summarization). The CLI PR
   references it and is a no-op against older framework versions: the transformer merely sets an
   option the compiler ignores if unknown. Note in the CLI PR that the mapping currently covers
   the application/esbuild builder (which `dev-server` composes); other builders that surface
   Angular compiler diagnostics (e.g. `unit-test`/karma paths) do not map `--verbose` and can be
   followed up separately if wanted.

## Upstream issue to file: `--verbose` double-prints all plugin diagnostics

Not introduced by this work, and deliberately not patched in the companion PR — it changes
`--verbose` presentation for every diagnostic, so it deserves its own issue and review.

- **Symptom:** with `ng build --verbose`, every warning emitted by the `angular-compiler` esbuild
  plugin is printed twice: once _during_ the build (uncolored) and once after
  "Application bundle generation complete" (colored). The current gallery's 1,802 itemized
  manifest warnings make the duplication especially visible, but any plugin-emitted template
  diagnostic duplicates the same way. Builder-level warnings
  (e.g. the CommonJS dependency warning) print once because they bypass the plugin result path.
- **Mechanism:** `packages/angular/build/src/tools/esbuild/application-code-bundle.ts` (and
  `global-scripts.ts`) set esbuild `logLevel: options.verbose && !jsonLogs ? 'debug' : 'silent'`.
  At `'debug'`, esbuild's own logger prints `onEnd` result messages itself; the builder then
  formats and logs the same result warnings through its logger. At `'silent'` (non-verbose) only
  the builder prints, so no duplication.
- **Fix directions to propose:** keep esbuild's logger at `'silent'` and let `--verbose` affect
  only the builder's own logging; or have the builder skip re-logging result messages when the
  esbuild log level already printed them. Either needs a decision about which formatting (with
  or without color) should win.

## Related CLI quirk (observed, low priority): Chrome DevTools workspace JSON under WSL

`packages/angular/build/src/tools/vite/middlewares/chrome-devtools-middleware.js` serves
`/.well-known/appspecific/com.chrome.devtools.json` unconditionally with the project root as a
POSIX path. When the dev server runs in WSL and the browser is Windows Chrome, DevTools'
Automatic Workspace Folders feature cannot map the path and logs
`Unable to add filesystem: <illegal path>` whenever DevTools is open. Harmless but alarming (it
was initially mistaken for a page-load failure in this project), and there is no builder option
to disable the middleware. Worth an upstream issue proposing a WSL-aware path (translate to
`\\wsl.localhost\...`), an opt-out option, or at minimum documentation.

## Local development notes (not upstream material)

- The demo app consumes the CLI as `file:` **tarballs** (`../angular-cli/dist/_angular_*.tgz`).
  npm pins their integrity in `package-lock.json`, so after every `pnpm build` in
  `../angular-cli` the lock entries must be refreshed:
  `npm install ../angular-cli/dist/_angular_build.tgz ../angular-cli/dist/_angular_cli.tgz`.
- Framework and other same-version `file:` directory dependencies can remain stale in
  `node_modules`; `npm ci --force` reconstructs the installed copies after a dist rebuild.
