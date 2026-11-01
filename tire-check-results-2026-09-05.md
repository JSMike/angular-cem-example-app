# Refactor verification — 2026-09-05

No CEM compiler or Language Service regression was found in the exercised scenarios.
Manifest discovery, strict member/value checks, completions, hovers, typed references,
event typing and narrow fallbacks still meet the feature's documented intent.

Verified Angular `6a7c826f34b850fe1ff82d74be553d2b4f1f2da3` plus the existing staged
refactor, whose SHA-256 remains
`fbfb731055e03c3d8cb366ce8763dbf57b27ea60222bfd1002e1a04c75318984`.
The code and declarations in all eight installed Angular packages match the local
distribution byte-for-byte. Distribution and language-server artifacts postdate the
modified sources. Angular source and staged changes were preserved.

Several harness presentation/accessibility issues were found and fixed:

- Initialize Fluent's required light theme. Its button previously had no background
  or padding; it now renders with the library's colors, spacing and focus tokens.
  Declare the already installed `@fluentui/tokens` version as a direct dependency.
- Wrap Box Model tag text in the child spans that the package styles as badges.
- Give the labeled gallery controls an explicit ARIA group role.
- Let mobile grid tracks shrink, constrain card action widths, and bind the Box Model
  column minimum to `min(17rem, 100%)`. The exact camel-case property binding remains
  exercised, while narrow screens no longer overflow.
- Darken the Shoelace progress button's local success token. Its default text contrast
  was 3.16:1 against the article; the corrected contrast is 4.81:1.

All final checks passed:

| Check                                       | Result                               |
| ------------------------------------------- | ------------------------------------ |
| Production build                            | Passed                               |
| Development build/server                    | Passed                               |
| Vitest                                      | 8 tests passed                       |
| Compiler configuration suite                | 9 checks passed                      |
| Language-server protocol suite              | 44 checks passed                     |
| Angular manifest parser/loader Bazel target | Passed; existing valid cached result |
| Prettier and diff whitespace checks         | Passed                               |

Compiler warnings remain at the existing baseline: 28 summaries and zero errors.
Verbose mode still reports 1,936 findings. The full published Lion manifest also
passes, with its expected 32 summaries. Existing vendor metadata, Sass and CommonJS
warnings remain visible.

Chromium interactions covered Shoelace input/select/switch, keyboard rating, details,
alert dismissal and progress wraparound; Box Model variant/gap cycles, computed
progress, exact property mapping and the typed close event; all 13 gallery buttons,
the RHDS switch, UI5 shift-click detail, Spectrum input and the workspace reference.
All 14 controlled gallery elements disabled and re-enabled. Keyboard activation and
the skip link worked. Core interactions were repeated against the optimized
production output, including all gallery buttons and shared disabled state.

Production screenshots were inspected and Axe 4.12.1 scanned all three routes at
1440, 390 and 320 CSS pixels. All nine scans reported zero violations, no horizontal
page overflow, no unregistered library elements, no browser errors and no failed
network requests. Some shadow-DOM contrast and ARIA checks were marked inconclusive.
Manual follow-up verified Shoelace's listbox reference and the sampled button text
colors; that follow-up caught the corrected Shoelace contrast issue. This was not a
complete assistive-technology or cross-browser accessibility audit.

The focused Lion completion measurement was 2,735 ms cold, 1–2 ms warm, 83–115 ms
after TypeScript edits and 84–103 ms after HTML edits. These are observations, not
performance thresholds. The full Lion compiler path was tested; its performance
measurement was not repeated in this run.

The Language Service was tested through its built server, not the VS Code UI.
The previously documented unsaved-JSON diagnostic-publication limitation was not
retested. Both temporary web servers were stopped after verification.

Session evidence is saved locally under
`.playwright-mcp/tire-check-2026-09-05/` (gitignored), including final logs, the full
production Axe results, and screenshots such as
[the desktop gallery](.playwright-mcp/tire-check-2026-09-05/design-systems-1440.png),
[mobile Box Model](.playwright-mcp/tire-check-2026-09-05/box-model-320.png), and
[mobile Shoelace](.playwright-mcp/tire-check-2026-09-05/shoelace-320.png).
