# red-hat-design-system CEM consumer validation

This example-app branch validates the corresponding fork change with the local Angular CEM compiler. It does not modify shared dependencies or suppress diagnostics with `CUSTOM_ELEMENTS_SCHEMA`.

The runner copies the installed published package and applies only the explicit manifest export from the fork. This is a package-metadata fixture, not a complete rebuild of the upstream repository; the published JavaScript and declarations remain unchanged.

## Run

Build the Angular checkout and install this worktree's example-app dependencies using the repository setup instructions. Keep the original example app's installed library packages as the published baseline. The fork must contain the explicit `./custom-elements.json` export in its root `package.json`.

```sh
npm run test:cem-fork
```

The baseline package defaults to `../angular-cem-example-app/node_modules`. Override `CEM_BASELINE_NODE_MODULES` to point to another unmodified published installation. The temporary probe project is created inside this worktree, and its independent package copy is removed after the run. Existing `node_modules` contents are read only.

The published package fails to resolve the explicit `@rhds/elements/custom-elements.json` specifier (`NG4007`). The fixed export resolves, accepts a boolean `disabled` binding, and rejects a numeric binding. Existing imported-definition duplication warnings are not suppressed or treated as fixed.

The runner records the fork commit and diagnostic counts in `cem-validation/results.json`; full before/after logs are retained in ignored `.cem-validation-output/`. These are compiler/template checks, not runtime browser or accessibility tests.

Local branch: `validate/cem-red-hat-design-system`. Worktree: `~/dev/angular-cem-validate-red-hat-design-system`.

## Recorded result

With Angular `aa4fd8f5f82e4f77f8f603a22e4d66497b841f4d`, all four compiler checks passed. The published package failed to resolve the explicit JSON specifier (`NG4007`). Applying the fork's export entry made the valid `disabled` binding compile and rejected the numeric binding (`TS2322`). The existing 91 repeated-definition warnings (`NG4010`) and 59 unsupported-type warnings (`NG4013`) remain. This export fix does not resolve the separate interpretation of registration records propagated through imports.
