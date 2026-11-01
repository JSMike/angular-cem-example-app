# Draft issue: `ng build --verbose` prints every esbuild-plugin diagnostic twice

> Ready to file against `angular/angular-cli`. Pre-existing behavior, independent of the
> Custom Elements Manifest work (which only made it very visible); deliberately not patched in the
> companion PR because the fix changes `--verbose` presentation for every diagnostic.

---

## Issue body

**Command:** `ng build --verbose` (application builder)

### Description

With `--verbose`, every warning emitted by the `angular-compiler` esbuild plugin is printed twice:
once _during_ the build (uncolored, from esbuild's own logger) and once after
"Application bundle generation complete" (colored, from the builder). Builder-level warnings such
as the CommonJS dependency warning print once, because they bypass the plugin result path.

The duplication exists for any plugin-emitted diagnostic (template diagnostics included). It
becomes very visible with warning sets of any size — e.g. a project whose Angular compiler options
produce a few hundred itemized warnings sees every one of them twice.

### Mechanism

`packages/angular/build/src/tools/esbuild/application-code-bundle.ts` (and `global-scripts.ts`)
set:

```ts
logLevel: options.verbose && !jsonLogs ? 'debug' : 'silent';
```

At `'debug'`, esbuild's own logger prints `onEnd` result messages itself; the builder then formats
and logs the same result warnings through its logger. At `'silent'` (the non-verbose default) only
the builder prints, so there is no duplication.

### Minimal reproduction

1. Any application-builder project where a plugin emits a warning — e.g. add a template that
   triggers an Angular template diagnostic warning.
2. `ng build` → warning printed once.
3. `ng build --verbose` → the same warning printed twice (uncolored during the build, colored
   after completion).

### Possible fix directions

- Keep esbuild's logger at `'silent'` and let `--verbose` affect only the builder's own logging
  (esbuild's internal debug output would need a separate opt-in if still wanted), or
- Have the builder skip re-logging result messages when the esbuild log level already printed
  them.

Either direction needs a decision about which formatting (with or without color) should win.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
