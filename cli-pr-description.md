# Draft PR body: Angular CLI companion for `customElementsManifests` diagnostics

> Ready to file against `angular/angular-cli` from the changes in `../angular-cli`
> (currently uncommitted; see proposed commits at the end). **Do not file until the framework PR
> has landed** — this PR references its option and is a no-op against older framework versions.
> Replace `<framework-pr>` with the real link before posting.

---

## PR body

### What does this PR do?

Companion to `<framework-pr>` (framework support for
`angularCompilerOptions.customElementsManifests`). Two developer-experience improvements for the
manifest diagnostics that feature introduces:

1. **`--verbose` expands summarized manifest diagnostics.** The framework summarizes repeated
   Custom Elements Manifest warnings per manifest by default and offers a
   `customElementsManifestsDiagnostics: 'summary' | 'verbose'` compiler option. The application
   builder now maps `--verbose` to that option, so the familiar CLI flag expands the summaries
   without a tsconfig edit. An explicit per-invocation flag intentionally overrides a tsconfig
   `'summary'` setting.

2. **Watch rebuilds no longer re-print unchanged option warnings.** Angular compiler _option_
   diagnostics (such as manifest warnings) are recomputed on every rebuild even when nothing about
   them changed, which made `ng serve` re-print the same warnings after every edit. A pure helper,
   `filterRepeatedOptionWarnings`, suppresses warning-category option diagnostics whose flattened
   text set is identical to the previous build; any change (a warning added _or_ removed)
   re-reports the full set, and error-category diagnostics always pass through.

### Implementation

- `tools/esbuild/compiler-plugin-options.ts` sets `verboseDiagnostics: !!options.verbose` from the
  normalized builder options.
- `tools/esbuild/angular/compiler-plugin.ts` declares the `verboseDiagnostics` plugin option and
  applies `customElementsManifestsDiagnostics: 'verbose'` in the compiler-options transformer when
  set.
- `tools/angular/compilation/option-diagnostics.ts` adds the pure
  `filterRepeatedOptionWarnings(diagnostics, previouslyReported)` helper; `AotCompilation` holds
  the reported-texts set between builds and delegates to it in `collectDiagnostics` (Option mode).

The mapping covers the application/esbuild builder (which `dev-server` composes). Other builders
that surface Angular compiler diagnostics (e.g. the `unit-test`/karma paths) do not map
`--verbose` and can be followed up separately if wanted.

### Compatibility

Against a framework version without `customElementsManifestsDiagnostics`, the transformer merely
sets an unknown option the compiler ignores — no behavior change. The watch dedupe applies to all
warning-category option diagnostics, not only manifest ones; errors are never suppressed.

### Tests

- `compiler-plugin-options_spec.ts`: `--verbose` maps the option on; off by default.
- `option-diagnostics_spec.ts`: first-build reporting, unchanged suppression, added-warning
  re-report, removed-warning re-report, errors always repeat, message-chain flattening.
- `rebuild-custom-elements-manifest_spec.ts` (application builder behavior test): watch mode
  picks up an in-place edit of a manifest under `node_modules` (new warning reported on rebuild)
  and recovers when a missing configured manifest is created after startup (NG4007 clears
  without a restart). Requires a framework version with `customElementsManifests`; both behaviors
  were verified end-to-end against the locally built framework before writing the spec. Watcher
  mechanics: the compiler reports manifest paths as watch files, and the default watch mode
  watches that explicit list — the `**/node_modules/**` ignore only applies in the opt-in
  `NG_BUILD_WATCH_ROOT` mode, where package content changes are instead inferred from
  manifest/lock files; an in-place `node_modules` edit may not be observed there (documented
  limitation, not asserted by the spec).
- Verified end-to-end on the current seventeen-manifest demo application: `ng serve` prints the 25 summaries
  once; an unrelated source edit re-prints nothing; a manifest edit that changes the warning set
  re-reports everything plus the new warning in detail; `ng build --verbose` itemizes all 1,802
  warnings.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

## Proposed commits

Two commits, one concern each:

```
feat(@angular/build): expand custom-elements-manifest diagnostics with --verbose

The Angular compiler summarizes repeated Custom Elements Manifest
warnings per manifest by default and exposes the
customElementsManifestsDiagnostics option to itemize them. Map the
builder's --verbose flag to that option so the summaries can be
expanded from the CLI; an explicit flag overrides a tsconfig 'summary'.
The option is ignored by framework versions that predate it.
```

```
fix(@angular/build): do not re-print unchanged option warnings on watch rebuilds

Angular compiler option diagnostics are recomputed on every rebuild,
so ng serve re-printed identical warnings after each edit. Suppress
warning-category option diagnostics whose text set is unchanged from
the previous build; any change re-reports the full set, and errors are
never suppressed.
```
