# UI5 consumer validation

Branch: `validate/cem-webcomponents`. Source fix: [JSMike/webcomponents#1](https://github.com/JSMike/webcomponents/pull/1), commit `bd44bc9`.

Run `node validation/validate-cem.mjs` from this worktree after installing the gallery dependencies with the local Angular CEM compiler and generating the source fork manifest. An optional first argument overrides the manifest path. The script creates isolated temporary declaration packages; it never modifies installed dependencies.

The fixture substitutes the actual fork-generated full manifest into the installed published declaration package. This verifies metadata and declaration compatibility, not a complete fork runtime build or browser behavior. The valid template passes a Button click event to a `CustomEvent<ButtonClickEventDetail>` handler; the negative case passes its boolean `shiftKey` detail to a number handler.

The focused source change does not fix every UI5 manifest issue: 70 default-only enum references remain unresolved as named exports, and other missing global references need follow-up. Machine-readable diagnostics, compiler version and generated manifest SHA-256 are recorded in [results.json](results.json) when the script runs.

Validated with Angular `22.3.0-next.0+sha-aa4fd8f`, local Angular commit `aa4fd8f5f82e4f77f8f603a22e4d66497b841f4d` (angular/angular#69957), and published UI5 2.24.0 declarations.

| Strict-template case | Published manifest | Fork-generated manifest |
| --- | --- | --- |
| Button click passed to `CustomEvent<ButtonClickEventDetail>` handler | TS2345 (`PointerEvent`) | Pass |
| Boolean `shiftKey` detail passed to number handler | TS2339 (`detail` inferred as number) | TS2345 (`boolean` rejected as number) |

The valid fixture has zero errors after the change. Verbose manifest warnings fall from 319 to 155. The negative case verifies that the corrected event detail is strongly typed.
