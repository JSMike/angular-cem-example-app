# Fluent UI consumer validation

Branch: `validate/cem-fluentui`. Source fix: [JSMike/fluentui#1](https://github.com/JSMike/fluentui/pull/1), commit `4f290428`.

Run `node validation/validate-cem.mjs` from this worktree after installing the gallery dependencies with the local Angular CEM compiler and generating the source fork manifest. An optional first argument overrides the manifest path. The script creates isolated temporary declaration packages; it never modifies installed dependencies.

Validated with Angular `22.3.0-next.0+sha-aa4fd8f`, local Angular commit `aa4fd8f5f82e4f77f8f603a22e4d66497b841f4d` (angular/angular#69957), and published `@fluentui/web-components` 3.0.2 declarations. The fixture substitutes the actual fork-generated full manifest into the published declaration package. This verifies metadata and public declaration compatibility, not a complete fork runtime build or browser behavior.

| Strict-template case | Published manifest | Fork-generated manifest |
| --- | --- | --- |
| Button template reference passed as `Button` | TS2345 (`HTMLElement`) | Pass |
| Actual `fluent-textarea` and `fluent-option` tags | Two NG8001 errors | Pass |
| Invalid Button appearance | Incorrectly accepted | TS2322 |

The valid fixture has zero errors after the change. Verbose manifest warnings fall from 332 to 82; remaining warnings concern other unhandled types/private modules and duplicate declarations/definition records. The focused PR does not resolve every manifest issue. Machine-readable diagnostics, compiler version and generated manifest SHA-256 are in [results.json](results.json).
