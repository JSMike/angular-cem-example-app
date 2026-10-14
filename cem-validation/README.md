# lion CEM consumer validation

This example-app branch validates the corresponding fork change with the local Angular CEM compiler. It does not modify shared dependencies or suppress diagnostics with `CUSTOM_ELEMENTS_SCHEMA`.

The runner uses the actual `npm pack` file list from the fork, including its generated Custom Elements Manifest and declarations.

## Run

Build the Angular checkout and install this worktree's example-app dependencies using the repository setup instructions. Keep the original example app's installed library packages as the published baseline. In `../lion`, run `npm run custom-elements-manifest --workspace @lion/ui` and `npm run types --workspace @lion/ui` using Node 22.

```sh
npm run test:cem-fork
```

The baseline package defaults to `../angular-cem-example-app/node_modules`. Override `CEM_BASELINE_NODE_MODULES` to point to another unmodified published installation. The temporary probe project is created inside this worktree, and its independent package copy is removed after the run. Existing `node_modules` contents are read only.

The published manifest reproduces invalid fixture-tag warnings (`NG4009`). The fixed manifest removes those warnings, accepts a boolean `active` binding, and rejects a numeric binding. Other pre-existing metadata warnings remain visible in the logs.

The runner records the fork commit and diagnostic counts in `cem-validation/results.json`; full before/after logs are retained in ignored `.cem-validation-output/`. These are compiler/template checks, not runtime browser or accessibility tests.

Local branch: `validate/cem-lion`. Worktree: `~/dev/angular-cem-validate-lion`.

## Recorded result

With Angular `aa4fd8f5f82e4f77f8f603a22e4d66497b841f4d`, all four compiler checks passed using the fork's actual npm pack contents. The published 0.18.1 manifest reports four invalid tags (`NG4009`), one repeated definition (`NG4010`), 658 unsupported types (`NG4013`), and one inheritance warning (`NG4014`). The current-source 0.23.0 fork has no invalid tags, repeated definitions, or inheritance warnings; 98 unsupported-type warnings remain. The valid `active` binding compiles, and a numeric value is rejected with `TS2322` before and after. Since versions differ, the entire warning-count reduction cannot be attributed solely to this patch. This is focused metadata validation, not a full application upgrade test.
