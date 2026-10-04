# Manifest performance measurements

## Language Service: re-hashing an oversized manifest

Measured 2026-07-17 with `ls-perf/harness.js` against the Language Service built in `../angular`
(`dist/bin/vscode-ng-language-service/vsix_sandbox`), on WSL2 ext4 with a warm page cache.
Completions were timed in the `<sp-theme system="…">` attribute value on the design-systems page.

### Completion latency

| Configuration                            | cold    | warm | after ts edit (×5)  | after html edit (×5) |
| ---------------------------------------- | ------- | ---- | ------------------- | -------------------- |
| Committed tsconfig (focused 4 KB Lion)   | 3773 ms | 1 ms | 174 97 99 110 143   | 110 100 149 108 103  |
| Full 5.6 MB `@lion/ui` manifest via path | 3178 ms | 1 ms | 234 132 161 121 155 | 126 153 130 144 126  |

The oversized manifest adds about 30–60 ms per edit, which is within the run-to-run variation of the
baseline (97–174 ms).

### Cost breakdown (5.6 MB file, warm cache, mean of 5)

| Operation           | ms/op |
| ------------------- | ----- |
| `readFileSync`      | 1.5   |
| read + SHA-256      | 4.4   |
| read + `JSON.parse` | 18.9  |

When the TypeScript project version changes, the Language Service adapter re-hashes the oversized
manifest, which takes about 4–5 ms on this machine. At about 4 compiler constructions per edit,
that adds up to about 20 ms per edit, under 15% of the completion time. Parsing (about 19 ms) happens
only when the content actually changes, because the manifest loader caches its result.

### Decision (2026-07-17)

Don't optimize this yet. Avoiding the re-hash would need extra bookkeeping of file-watcher events or
file metadata, which would have to stay correct across VS Code client and server watchers, remote
workspaces, and `node_modules`. Re-hashing is correct and cheap here. Measure again with the same
harness if a slow file system, such as a cold cache, a network drive, or native Windows I/O, makes
reading and hashing dominate. Any change must keep the existing tests for same-size edits,
timestamps that don't change, deletion and recreation, and unsaved edits.

To reproduce, run `node ls-perf/harness.js --edits 5` once with the committed tsconfig and once with
the Lion entry changed to `./node_modules/@lion/ui/custom-elements.json`.

## Memory for diagnostics that link into manifests

Measured 2026-07-17 with `node --expose-gc`: parse once, garbage-collect twice, and take the heap
growth as retained memory.

| Input            | `JSON.parse`   | `ts.parseJsonText` (AST with offsets) |
| ---------------- | -------------- | ------------------------------------- |
| Lion 5.5 MB      | 23 ms / 5.5 MB | 323 ms / 60.9 MB                      |
| Shoelace 0.62 MB | 6 ms / 0.6 MB  | 26 ms / 6.7 MB                        |

Keeping a JSON AST with offsets costs about 11 times the manifest size (about 90 MB for this app's
8.3 MB of manifests) in every process that keeps it. That is too much for the Language Service to
hold all the time.

### Recommendation

Linking diagnostics to manifest entries is feasible only if spans are computed when needed. Don't
keep the JSON AST. Diagnostics would record the manifest path and the declaration or member they
refer to, and Angular would re-parse only that manifest when a span is needed: when `ngc` reports
diagnostics (a short memory peak, freed afterwards), and when the editor navigates to one (26–323 ms
once). Open questions before implementing it:

- how the Language Server Protocol reports diagnostics for non-TypeScript files;
- how to map positions in unsaved edits; and
- whether `ts.Diagnostic`'s `file` can be provided without keeping a parsed `SourceFile`; line starts
  computed from the kept text may be enough.

## Compiler: manifest loading time

Measured 2026-09-29 with `node --cpu-prof` on `ngc -p tsconfig.app.json --noEmit` with the 17
configured manifests, before and after validating all manifests' types in one TypeScript program:

| Stage (CPU profile, ms)         | One program per manifest (1 run) | One program (mean of 3) |
| ------------------------------- | -------------------------------- | ----------------------- |
| Whole `ngc` run                 | 3,635                            | 3,724                   |
| `loadCustomElementsManifests`   | 1,493                            | 1,561                   |
| Creating type-checking programs | 667                              | 581                     |

Loading time didn't change meaningfully. Most of it goes to package declarations that the application
doesn't import: parsing, binding, and processing them takes about 650 ms, and module resolution about
200 ms. The CLI's compiler host uses a custom module resolver, which turns off the manifest loader's
cache, so this cost repeats on every rebuild. Caching parsed declarations across rebuilds would
address it.
