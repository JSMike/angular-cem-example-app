# shoelace CEM consumer validation

This example-app branch validates the corresponding fork change with the local Angular CEM compiler. It does not modify shared dependencies or suppress diagnostics with `CUSTOM_ELEMENTS_SCHEMA`.

The runner uses the actual `npm pack` file list from the fork, including its generated Custom Elements Manifest and declarations.

## Run

Build the Angular checkout and install this worktree's example-app dependencies using the repository setup instructions. Keep the original example app's installed library packages as the published baseline. In `../shoelace`, install dependencies, run `npm run test:metadata`, then `npm exec -- tsc --project tsconfig.prod.json --outdir dist`. This compile-only check does not require the runtime JavaScript bundle.

```sh
npm run test:cem-fork
```

The baseline package defaults to `../angular-cem-example-app/node_modules`. Override `CEM_BASELINE_NODE_MODULES` to point to another unmodified published installation. The temporary probe project is created inside this worktree, and its independent package copy is removed after the run. Existing `node_modules` contents are read only.

The published manifest accepts an invalid animation direction and cannot type the selection event detail. The fixed manifest rejects the invalid direction, accepts a valid direction, and exposes `SlSelectionChangeEvent.detail.selection` to an Angular event handler. Unknown/non-public types and qualified namespace types are outside this fix.

The runner records the fork commit and diagnostic counts in `cem-validation/results.json`; full before/after logs are retained in ignored `.cem-validation-output/`. These are compiler/template checks, not runtime browser or accessibility tests.

Local branch: `validate/cem-shoelace`. Worktree: `~/dev/angular-cem-validate-shoelace`.

## Recorded result

With Angular `aa4fd8f5f82e4f77f8f603a22e4d66497b841f4d`, all seven compiler checks passed against the actual fork package. The published manifest accepted the invalid direction `sideways`; the fork rejects it (`TS2322`) while accepting `normal`. Selection-event detail previously failed with `TS2339`; the fork accepts the element-array handler and rejects an incompatible numeric handler (`TS2345`). Unsupported-type warnings (`NG4013`) fell from 113 to 9. The remaining warnings concern function syntax unsupported by this Angular compiler and non-root-exported `VirtualElement`/`SnapFunction` names.
