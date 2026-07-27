# VS Code Angular CEM plugin review guide

This guide provides a repeatable manual review of the proposed Angular
`customElementsManifests` integration through the Angular Language Service VS Code extension. It
uses the examples already present in this repository and covers both successful metadata and the
feature's intentional fail-closed behavior.

The review should establish that manifest-backed custom elements behave like known HTML or Angular
component APIs in templates without enabling `CUSTOM_ELEMENTS_SCHEMA`:

- tags, properties, attributes, and events are discoverable;
- finite string values are offered as completions;
- property bindings are type-checked;
- static string-literal-union attributes are type-checked;
- hover text reports manifest documentation and type information;
- resolvable element classes type local template references;
- unusable metadata degrades only the affected check rather than disabling template checking; and
- app-owned manifests can add or correct vendor metadata.

## 1. Protect the starting state

The checks below deliberately introduce temporary template and manifest errors. Before beginning:

1. Open this repository as a WSL workspace, not as a Windows filesystem folder:

   ```bash
   cd ~/dev/angular-cem-example-app
   code .
   ```

2. Record the current state so pre-existing work is not confused with review edits:

   ```bash
   git status --short
   ```

3. Undo each temporary edit as soon as its expected behavior is observed. Do not use a bulk Git
   restore command in a working tree containing unrelated changes.

4. Keep the VS Code **Problems** and **Output** panels visible. Select **Angular Language Service**
   in the Output panel when investigating stale or unexpected results.

## 2. Build and install the correct extension

The extension bundles its own Angular Language Service. Installing local Angular packages into this
application does not update editor behavior.

1. Build the extension from the sibling Angular working tree:

   ```bash
   cd ../angular
   pnpm --filter=ng-template run package
   ```

2. Return to this repository and install the VSIX into the WSL extension host:

   ```bash
   cd ../angular-cem-example-app
   code --install-extension ../angular/dist/bin/vscode-ng-language-service/ng-template.vsix --force
   ```

   Do not convert the path with `wslpath`. The `code` command launched from a VS Code WSL terminal
   expects the Linux path because the extension is installed into the WSL host.

3. Confirm the extension is installed:

   ```bash
   code --list-extensions --show-versions | rg -i '^angular.ng-template@'
   ```

4. In VS Code, run **Developer: Reload Window**, followed by **Angular: Restart Angular Language
   Server**.

5. Open the Angular Language Service Output channel. Confirm that the server starts without a
   compatibility error. If editor results differ from compiler results, reinstall the VSIX and
   repeat the reload/restart before debugging the feature.

## 3. Establish the compiler baseline

From the application repository root:

```bash
node -e "console.log(require('./node_modules/@angular/compiler-cli/package.json').version)"
./node_modules/.bin/ngc -p tsconfig.app.json --noEmit
npm test -- --watch=false
```

Expected result:

- the installed compiler is the locally built Angular 22.1 development package;
- `ngc` exits successfully with zero template errors;
- the current third-party compatibility matrix emits 25 bounded summary warnings; and
- all eight application tests pass.

The third-party warnings are fixtures, not a failed setup. Their compatibility boundaries are
summarized in the
[implementation summary](./angular-cem-implementation-summary.md#real-package-results).

Confirm that blanket schema suppression is absent:

```bash
rg 'CUSTOM_ELEMENTS_SCHEMA|NO_ERRORS_SCHEMA' src
```

Expected result: no matches. The configured manifests are in
[`tsconfig.json`](./tsconfig.json), under
`angularCompilerOptions.customElementsManifests`.

## 4. Verify custom-element tag completion

Open
[`src/app/integrations/design-systems/design-systems-page.html`](./src/app/integrations/design-systems/design-systems-page.html).
In a temporary blank line inside the page, type each prefix and invoke Ctrl+Space:

```html
<md-
<sp-
<cem-
```

Expected suggestions include:

- `md-filled-button` from the app-owned Material manifest;
- `sp-button`, `sp-theme`, and `sp-textfield` from the Spectrum manifests; and
- `cem-workspace-example` from the local package manifest.

Repeat in
[`src/app/integrations/shoelace/shoelace-page.html`](./src/app/integrations/shoelace/shoelace-page.html)
with `<sl-`. Shoelace elements such as `sl-alert`, `sl-input`, and `sl-rating` should appear.

Remove the incomplete lines after checking the suggestions.

## 5. Verify member completion, documentation, and unknown-member errors

Use the existing `<sl-rating>` in `shoelace-page.html`.

1. Place the cursor after `<sl-rating` or on a new line among its attributes and invoke Ctrl+Space.

2. Confirm that members such as `label`, `value`, `max`, and `precision` are suggested.

3. Hover `precision`. Its quick info should identify a numeric property and show available manifest
   documentation.

4. Temporarily add a misspelled property binding:

   ```html
   [precison]="1"
   ```

   Expected result: NG8002 reports that `precison` is not a known property of `sl-rating`.

5. Temporarily misspell the tag as `<sl-ratting>...</sl-ratting>`.

   Expected result: NG8001 reports that `sl-ratting` is not a known element.

Undo both typos. These checks demonstrate that the feature adds knowledge rather than suppressing
unknown tags and properties.

## 6. Distinguish expression errors from value-type errors

Continue with the existing `<sl-rating>`.

1. Confirm that the current binding is valid:

   ```html
   [precision]="1"
   ```

2. Change it temporarily to:

   ```html
   [precision]="'one'"
   ```

   Expected result: a type diagnostic reports that `string` is not assignable to `number`.

3. Change it temporarily to:

   ```html
   [precision]="notDeclared"
   ```

   Expected result: NG2339 reports that `notDeclared` does not exist on `ShoelacePage`. This is an
   Angular expression error: unquoted text inside `[]` is a component expression, not a string
   value.

4. Restore `[precision]="1"`.

5. As an intentional boundary check, temporarily use a static value:

   ```html
   precision="not-a-number"
   ```

   Expected result: hover still reports the numeric metadata, but there is no static-value error.
   CEM describes the deserialized property type and does not standardize each library's numeric or
   boolean attribute converter. Angular therefore reserves static value validation for explicit
   string-literal unions; property bindings remain strictly checked.

Restore the original binding.

## 7. Verify static and bound string-union behavior

Open
[`src/app/integrations/box-model/box-model-page.html`](./src/app/integrations/box-model/box-model-page.html)
and use the first `<tag-box variant="info">`.

1. Clear only the value so the markup reads `variant=""`, then invoke Ctrl+Space between the
   quotes.

2. Confirm that the suggestions include `neutral`, `info`, `success`, `warning`, and `danger`.

3. Hover `variant`. Quick info should show the referenced `TagVariant` type and its documentation.

4. Enter `variant="not-real"`.

   Expected result: the static string-union value is rejected.

5. Change the attribute to a bound literal:

   ```html
   [variant]="'not-real'"
   ```

   Expected result: the property binding is also rejected against `TagVariant`.

6. Change it to `[variant]="'success'"` and confirm that the error clears.

7. Restore the original `variant="info"`.

Optional serialization boundary: `variant="{{ 'success' }}"` is typed as a serialized `string`,
not preserved as the literal type `'success'`. A finite-union diagnostic is therefore expected;
use a static value or `[variant]="'success'"` when literal precision is required.

## 8. Verify `type.references` and exact property names

Remain in `box-model-page.html`.

1. Hover `[variant]` on `<button-box [variant]="buttonVariant()">`.

   Expected result: quick info reports the public `ButtonVariant` alias resolved through the
   manifest's `type.references`.

2. Hover `[gap]` and `[minWidth]` on `<columns-box>`.

   Expected result: `gap` reports `ColumnsGap`, and the camel-case `minWidth` property remains
   distinct from its `min-width` attribute spelling.

3. Temporarily change `[gap]="columnGap()"` to `[gap]="'huge'"`.

   Expected result: the invalid literal is rejected. Restore the original binding.

4. In `shoelace-page.html`, temporarily add `[readonly]="true"` to `<sl-input>` and confirm it is
   accepted. Change the name to `[readOnly]="true"`.

   Expected result: the incorrectly cased property is rejected. Restore the original element.

This verifies that manifest property names are not silently rewritten to similarly spelled DOM
properties.

## 9. Verify the app-owned Material manifest

Open `design-systems-page.html` and use `<md-filled-button>`.

1. Clear `target="_self"` to `target=""` and invoke Ctrl+Space between the quotes.

   Expected suggestions: `_blank`, `_parent`, `_self`, and `_top`.

2. Enter `target="_invalid"`.

   Expected result: the static string-union value is rejected.

3. Restore `target="_self"`.

4. Hover `[type]`, `[softDisabled]`, and `[disabled]`. Confirm their app-owned types are visible.

5. Temporarily change `[type]="materialButtonType()"` to `[type]="'link'"`.

   Expected result: `'link'` is rejected because the local manifest declares only `button`,
   `reset`, and `submit`. Restore the signal binding.

To prove that this is genuinely filling missing vendor metadata:

1. Temporarily remove
   `"./src/custom-elements/material-web-button.custom-elements.json"` from `tsconfig.json`.

2. Save the configuration and run **Angular: Restart Angular Language Server**.

3. Return to `<md-filled-button>`.

   Expected result: Material tag/member completions disappear and the element becomes unknown,
   because `@material/web@2.4.1` does not publish a CEM and this app does not use
   `CUSTOM_ELEMENTS_SCHEMA`.

4. Restore the manifest entry, save, restart the language server, and confirm completion and
   checking return.

## 10. Verify the corrected Spectrum replacement manifest

Use `<sp-button>` in `design-systems-page.html`.

1. Temporarily replace `[variant]="spectrumVariant()"` with `variant=""`, then invoke Ctrl+Space
   between the quotes.

2. Confirm suggestions include `accent`, `primary`, `secondary`, `negative`, `white`, `black`,
   `cta`, and `overBackground`.

3. Enter `variant="not-real"`.

   Expected result: the local replacement manifest rejects the value.

4. Restore `[variant]="spectrumVariant()"`.

5. Hover `[disabled]`. Confirm that the inherited property deliberately added by the app-owned
   projection is known and typed as `boolean`.

Optional before/after comparison:

1. In `tsconfig.json`, replace
   `"./src/custom-elements/spectrum-button.corrected.custom-elements.json"` with
   `"@spectrum-web-components/button"`.

2. Save and restart the Angular Language Server.

3. Repeat the `variant=""` and invalid-value checks.

   Expected result: the vendor spelling remains available as descriptive metadata, but its named
   type lacks the references Angular needs for trusted value checking and finite completions. The
   corresponding NG4013 warning explains the narrow fallback.

4. Restore the local manifest entry and restart the language server.

This demonstrates that the consumer override replaces unusable metadata; Angular does not silently
substitute a different type from the vendor's `.d.ts` files.

## 11. Verify typed local references

The design-systems page already contains:

```html
<cem-workspace-example #workspaceCem [variant]="'primary'">
  Workspace manifest element
</cem-workspace-example>
<p>Local reference: {{ workspaceCem.workspaceOnly }}</p>
```

1. Hover `workspaceCem` and `workspaceOnly`.

   Expected result: the local reference is a `CemWorkspaceExampleElement`, and `workspaceOnly` is a
   string member from that class rather than a generic `HTMLElement` property.

2. Temporarily replace `workspaceOnly` with `notAWorkspaceMember`.

   Expected result: the diagnostic says that the member does not exist on
   `CemWorkspaceExampleElement`. Restore `workspaceOnly`.

3. For a published-library check, add `#shoelaceInput` to the existing `<sl-input>` in
   `shoelace-page.html` and temporarily add:

   ```html
   <p>{{ shoelaceInput.value }}</p>
   ```

   Hover the reference, then replace `value` with `notAShoelaceMember`.

   Expected result: the valid member is known, and the invalid member is rejected against the
   Shoelace element class. Remove the temporary reference and paragraph.

## 12. Verify event discovery and honest fallback types

Use the existing `(sl-change)` binding on `<sl-rating>` or `(sl-input)` on `<sl-input>`.

1. Place the cursor after `(sl-` and invoke Ctrl+Space.

   Expected result: manifest event names are suggested.

2. Hover the event name and `$event`.

   Expected result for the current Shoelace manifest: documentation is available, while `$event`
   remains `Event`. Shoelace omits a standards-valid event payload type, so Angular does not invent
   one.

3. In `design-systems-page.html`, hover `$event` in the RHDS switch `(change)` binding.

   Expected result: it is `Event`, resolved from RHDS's explicit `global:` reference.

4. Hover `$event` in UI5's `(click)` binding.

   Expected result: it remains the native event fallback because the nested manifest reference
   lacks the exact `start`/`end` spans required for safe substitution.

The Language Service should not offer Angular-style two-way bindings for manifest properties.
Writing `[(value)]` manually would listen for `valueChange`, which most web components do not emit;
use separate property and documented event bindings.

## 13. Verify narrow fallback rather than blanket suppression

Use `<sp-textfield>` in `design-systems-page.html`. Its vendor manifest has some unusable named type
metadata, but the element and its unrelated valid members remain known.

1. Hover `value`, `maxlength`, and `type` to compare usable and descriptive metadata.

2. Temporarily add `[notARealTextfieldProperty]="true"`.

   Expected result: NG8002 still rejects the unknown property.

3. Temporarily add the affected property binding:

   ```html
   [type]="'not-a-spectrum-type'"
   ```

   Expected result: only that dependent value check is absent because the vendor's `type` metadata
   was rejected; the tag, other members, hover text, and unknown-property checking remain active.

4. Remove both temporary properties.

As an explicit attribute escape hatch, `[attr.variant]="'not-real'"` writes an attribute and does
not use the manifest property type. This matches Angular's normal `[attr.*]` semantics and should
not be mistaken for a failed property check.

## 14. Verify manifest resource reload

This check proves that editor state updates when a configured manifest changes without requiring a
TypeScript source edit.

1. Open
   [`src/custom-elements/material-web-button.custom-elements.json`](./src/custom-elements/material-web-button.custom-elements.json).

2. The `target` union appears twice: once on the field and once on the attribute. Add
   `'review-only'` to both unions and save the manifest.

3. Without restarting the language server, return to `<md-filled-button>`, temporarily change
   `target="_self"` to `target=""`, and invoke Ctrl+Space.

   Expected result: `review-only` appears in the value suggestions.

4. Set `target="review-only"` and confirm there is no value diagnostic.

5. Remove `review-only` from both manifest unions and save, without editing the template.

   Expected result: the existing template value becomes invalid. This proves the manifest resource
   invalidated and rebuilt the template checker.

6. Restore `target="_self"` and confirm the error clears.

If the update does not arrive within a few seconds, inspect the Angular Language Service Output
channel before restarting it; needing a restart is itself a review finding.

## 15. Verify configured-manifest diagnostics

These checks are optional but useful when reviewing the error contract. Perform them one at a time
and restore each edit immediately.

### Missing configured resource

Temporarily change the Material manifest entry in `tsconfig.json` to a nonexistent path and save.

Expected result: NG4007 identifies the configured manifest as unresolved or unreadable, and the
Material schema is not loaded. Restore the correct path.

### Malformed manifest

Temporarily introduce invalid JSON into the Material manifest and save.

Expected result: NG4008 identifies the invalid manifest; Angular does not ingest a partial schema
from malformed JSON. Undo the JSON edit and save.

### Invalid diagnostics option

Temporarily add the following sibling option under `angularCompilerOptions`:

```json
"customElementsManifestsDiagnostics": "loud"
```

Expected result: NG4012 identifies the invalid compiler-option value. Valid values are `summary`
and `verbose`. Remove the temporary option.

### Verbose producer diagnostics

Temporarily set:

```json
"customElementsManifestsDiagnostics": "verbose"
```

Run:

```bash
./node_modules/.bin/ngc -p tsconfig.app.json --noEmit
```

Expected result: the same successful compilation expands the 25 bounded summary warnings into
1,802 individual findings (19 NG4009 + 330 NG4011 + 1,153 NG4013 + 300 NG4014). Restore the
default by removing the option.

## 16. Run the automated editor-protocol smoke test

The repository includes a protocol-level harness that launches the freshly built language server
from `../angular`, measures completion latency, and asserts the two consumer-owned completion sets:

```bash
node ls-perf/harness.js --edits 3
```

Expected result includes lines equivalent to:

```text
variant="" completions: accent primary secondary negative
target="" completions: _blank _parent _self _top
```

Exact timings vary by machine. Missing completion labels make the harness exit unsuccessfully.

## 17. Runtime and final cleanup

After all temporary edits have been undone:

```bash
./node_modules/.bin/ngc -p tsconfig.app.json --noEmit
npm test -- --watch=false
npm run build
npm start
```

Visit:

- `http://localhost:4200/` for Shoelace;
- `http://localhost:4200/box-model` for referenced aliases; and
- `http://localhost:4200/design-systems` for the compatibility matrix and both app-owned manifests.

Confirm that the controls render and respond. Runtime behavior does not replace Language Service
review, but it catches a manifest projection that describes a property name differently from the
actual custom element implementation.

Finally:

1. Stop the development server.
2. Check `git status --short` against the state recorded in step 1.
3. Inspect diffs for the files used during the review and make sure every deliberate error and
   diagnostics option was removed.
4. Restart the Angular Language Server once more and confirm the Problems panel contains no
   template errors from the manual review.

## Review result checklist

- [ ] Correct locally built VSIX is installed in the WSL extension host.
- [ ] Manifest tags appear in element completions.
- [ ] Manifest members and documentation appear in completions and hovers.
- [ ] Unknown custom-element tags and properties still produce NG8001/NG8002.
- [ ] Property bindings reject incompatible values.
- [ ] Static string-literal unions provide completions and reject invalid values.
- [ ] Numeric/boolean static attributes retain metadata without assuming a universal converter.
- [ ] Exact property names and casing are preserved.
- [ ] `type.references` resolve public named aliases.
- [ ] Resolvable element classes type local references.
- [ ] Event names are discoverable and untrusted payload metadata falls back honestly.
- [ ] Unusable metadata degrades narrowly without disabling unrelated checks.
- [ ] The Material app-owned manifest fills a package-level metadata gap.
- [ ] The Spectrum app-owned manifest replaces defective vendor typing.
- [ ] Saved manifest edits refresh diagnostics and completions without a server restart.
- [ ] NG4007, NG4008, NG4012, and summary/verbose diagnostics behave as documented.
- [ ] Protocol smoke test, compiler check, unit tests, production build, and runtime smoke pass.
