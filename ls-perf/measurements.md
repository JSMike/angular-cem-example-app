# Language-service measurements: oversized-manifest hash cadence

Measured 2026-07-17 with `ls-perf/harness.js` against the LS built from `../angular`
(`dist/bin/vscode-ng-language-service/vsix_sandbox`), WSL2 ext4, warm page cache. Completion
timed at the `<sp-theme system="…">` attribute value of the design-systems page.

## Steady-state completion latency

| Configuration                            | cold    | warm | after ts edit (×5)  | after html edit (×5) |
| ---------------------------------------- | ------- | ---- | ------------------- | -------------------- |
| Committed tsconfig (focused 4 KB Lion)   | 3773 ms | 1 ms | 174 97 99 110 143   | 110 100 149 108 103  |
| Full 5.6 MB `@lion/ui` manifest via path | 3178 ms | 1 ms | 234 132 161 121 155 | 126 153 130 144 126  |

Per-edit delta for the oversized manifest: roughly +30–60 ms, inside the run-to-run noise of the
baseline (97–174 ms).

## Cost decomposition (5.6 MB file, warm cache, mean of 5)

| Operation           | ms/op |
| ------------------- | ----- |
| `readFileSync`      | 1.5   |
| read + SHA-256      | 4.4   |
| read + `JSON.parse` | 18.9  |

The adapter's oversized-resource re-hash on a TypeScript project-version advance costs ~4–5 ms
per occurrence on this hardware; with the historical ~4 compiler constructions per edit that
bounds the re-hash overhead at ~20 ms/edit — under 15 % of the per-edit completion latency, and
parse (~19 ms) only occurs on an actual content change thanks to the post-strip loader cache.

## Decision (2026-07-17)

Defer the optimization. The measured warm-cache cost does not justify adding watcher-generation
or metadata-cache bookkeeping whose own correctness must then be defended across VS Code
client-side watchers, server-side watchers, remote workspaces, and `node_modules`; correctness
currently comes from re-hashing, which is cheap here. Revisit with the same harness if evidence
appears of slow-filesystem environments (cold caches, network drives, native Windows I/O) where
the read+hash dominates. Any future change must preserve the existing same-size edit,
non-advancing timestamp, delete/recreate, and unsaved-buffer regression coverage.

Reproduce: `node ls-perf/harness.js --edits 5`, once with the committed tsconfig and once with
the Lion entry swapped to `./node_modules/@lion/ui/custom-elements.json`.

# Navigable-diagnostics retention measurement

Measured 2026-07-17 with `node --expose-gc` (parse once, GC twice, heap delta = retained):

| Input            | `JSON.parse`   | `ts.parseJsonText` (AST with offsets) |
| ---------------- | -------------- | ------------------------------------- |
| Lion 5.5 MB      | 23 ms / 5.5 MB | 323 ms / 60.9 MB                      |
| Shoelace 0.62 MB | 6 ms / 0.6 MB  | 26 ms / 6.7 MB                        |

Retaining offset ASTs costs ~11× the manifest size in heap (~90 MB for this gallery's 8.3 MB of
manifests) in every process that holds them — unacceptable as steady-state LS memory.

## Recommendation (go, but only with lazy span computation)

Never retain the JSON AST. Diagnostics should carry a stable manifest-relative identity
(manifest path + declaration/member identity); spans are computed by re-parsing exactly one
manifest on demand — at diagnostic-emission time in batch `ngc` (transient peak, discarded
after span extraction) and at editor-navigation time in the LS (one-shot 26–323 ms). Remaining
open questions before implementation: LSP routing of diagnostics to non-TypeScript files,
unsaved-buffer position mapping, and whether `ts.Diagnostic`'s `file` requirement can be met
without holding a parsed `SourceFile` (line-starts over retained text may suffice).
