# @cds/core consumer validation

This branch compares the gallery's published 6.17.0 package with the actual locally built fork package. It compiles isolated Angular templates using the Angular feature branch in `../angular`, never a registry Angular release. Baseline and changed packages are unpacked into separate child projects; the gallery's installed vendor files are not modified.

1. In `../angular`, run `pnpm install --frozen-lockfile` and `pnpm build` with its pinned Node/pnpm versions.
2. In this worktree, run `npm ci --force` (all Angular dependencies retain the existing local `file:` locations).
3. Build the library: `cd ../core && npm run build:lib --workspace core-ws`.
4. Back in this worktree, run `npm run test:library-cem`.

The script packs the built fork and downloads the pinned baseline package, then checks both the original failure and positive/negative behavior after the fix. Clarity release tooling normally injects a version, so a temporary copy of its generated package receives version 0.0.0-cem-validation for packing; source and built output remain unchanged.

`results.json` records compiler and library commit identities, diagnostic counts and expected errors. Full per-case diagnostics are under ignored `regression/.tmp/library-cem`. These tests validate compiler/manifest interoperability; they do not claim browser or full gallery UI coverage.
