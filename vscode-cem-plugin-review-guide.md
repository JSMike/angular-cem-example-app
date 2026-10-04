# VS Code Angular CEM plugin review guide

This guide is a repeatable manual review of Angular's proposed `customElementsManifests` option in
the Angular Language Service VS Code extension. It uses the examples in this repository and covers
both usable metadata and what Angular does with metadata it can't use.

The review checks that, without `CUSTOM_ELEMENTS_SCHEMA`, manifest-declared custom elements behave in
templates like known HTML elements or Angular components:

- tags, properties, attributes, and events are discoverable;
- finite string values are offered as completions;
- property bindings are type-checked;
- static string-literal-union attributes are type-checked;
- hover text reports manifest documentation and type information;
- resolvable element classes type local template references;
- unusable metadata turns off only the check that needs it; and
- manifests in the app can add or correct a library's metadata.

## 1. Protect the starting state

The checks below add temporary template and manifest errors on purpose. Before you begin:

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

- the installed compiler is the locally built Angular 22.3 development package;
- `ngc` succeeds with no template errors;
- the configured libraries produce 20 summarized manifest warnings; and
- all eight application tests pass.

The warnings come from the libraries' manifests and are expected. The
[implementation summary](./angular-cem-implementation-summary.md#real-package-results) explains them.

Confirm that no component uses `CUSTOM_ELEMENTS_SCHEMA` or `NO_ERRORS_SCHEMA`:

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

- `md-filled-button` from the app's Material manifest;
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

Undo both typos. These checks show that manifests tell Angular about elements instead of hiding
errors for unknown tags and properties.

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

5. To check a known limit, temporarily use a static value:

   ```html
   precision="not-a-number"
   ```

   Expected result: hover still shows the numeric type, but there is no static-value error. CEM
   describes the property's type but doesn't define how a library converts attribute strings to
   numbers or booleans, so Angular checks static values only against unions of string literals.
   Property bindings are still type-checked.

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

Optional: `variant="{{ 'success' }}"` has the type `string`, not the literal type `'success'`,
because interpolation produces a string, so an error is expected. Use a static value or
`[variant]="'success'"` instead.

## 8. Verify `type.references` and exact property names

Remain in `box-model-page.html`.

1. Hover `[variant]` on `<button-box [variant]="buttonVariant()">`.

   Expected result: quick info shows the exported `ButtonVariant` type that the manifest's
   `type.references` points to.

2. Hover `[gap]` and `[minWidth]` on `<columns-box>`.

   Expected result: `gap` reports `ColumnsGap`, and the camel-case `minWidth` property remains
   distinct from its `min-width` attribute spelling.

3. Temporarily change `[gap]="columnGap()"` to `[gap]="'huge'"`.

   Expected result: the invalid literal is rejected. Restore the original binding.

4. In `shoelace-page.html`, temporarily add `[readonly]="true"` to `<sl-input>` and confirm it is
   accepted. Change the name to `[readOnly]="true"`.

   Expected result: the incorrectly cased property is rejected. Restore the original element.

This shows that Angular doesn't rename manifest properties to similarly spelled DOM properties.

## 9. Verify the app's Material manifest

Open `design-systems-page.html` and use `<md-filled-button>`.

1. Clear `target="_self"` to `target=""` and invoke Ctrl+Space between the quotes.

   Expected suggestions: `_blank`, `_parent`, `_self`, and `_top`.

2. Enter `target="_invalid"`.

   Expected result: the static string-union value is rejected.

3. Restore `target="_self"`.

4. Hover `[type]`, `[softDisabled]`, and `[disabled]`. Confirm that the types from the app's
   manifest are shown.

5. Temporarily change `[type]="materialButtonType()"` to `[type]="'link'"`.

   Expected result: `'link'` is rejected because the local manifest declares only `button`,
   `reset`, and `submit`. Restore the signal binding.

To confirm that this manifest supplies metadata the library doesn't publish:

1. Temporarily remove
   `"./src/custom-elements/material-web-button.custom-elements.json"` from `tsconfig.json`.

2. Save the configuration and run **Angular: Restart Angular Language Server**.

3. Return to `<md-filled-button>`.

   Expected result: Material tag/member completions disappear and the element becomes unknown,
   because `@material/web@2.4.1` does not publish a CEM and this app does not use
   `CUSTOM_ELEMENTS_SCHEMA`.

4. Restore the manifest entry, save, restart the language server, and confirm completion and
   checking return.

## 10. Verify the app's corrected Spectrum manifest

Use `<sp-button>` in `design-systems-page.html`.

1. Temporarily replace `[variant]="spectrumVariant()"` with `variant=""`, then invoke Ctrl+Space
   between the quotes.

2. Confirm suggestions include `accent`, `primary`, `secondary`, `negative`, `white`, `black`,
   `cta`, and `overBackground`.

3. Enter `variant="not-real"`.

   Expected result: the app's manifest rejects the value.

4. Restore `[variant]="spectrumVariant()"`.

5. Hover `[disabled]`. Confirm that the inherited property, which the app's manifest adds on
   purpose, is known and typed as `boolean`.

Optional before/after comparison:

1. In `tsconfig.json`, replace
   `"./src/custom-elements/spectrum-button.corrected.custom-elements.json"` with
   `"@spectrum-web-components/button"`.

2. Save and restart the Angular Language Server.

3. Repeat the `variant=""` and invalid-value checks.

   Expected result: hover still shows the library's type text, but its named type has no references,
   so Angular doesn't check the value or suggest values. An NG4013 warning reports this.

4. Restore the local manifest entry and restart the language server.

This shows that the app's manifest replaces unusable metadata. Angular doesn't substitute a type from
the library's `.d.ts` files.

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

## 12. Verify event completions and fallback types

Use the existing `(sl-change)` binding on `<sl-rating>` or `(sl-input)` on `<sl-input>`.

1. Place the cursor after `(sl-` and invoke Ctrl+Space.

   Expected result: manifest event names are suggested.

2. Hover the event name and `$event`.

   Expected result for the current Shoelace manifest: documentation is shown, and `$event` is
   `Event`. Shoelace's manifest has no usable event type, so Angular doesn't make one up.

3. In `design-systems-page.html`, hover `$event` in the RHDS switch `(change)` binding.

   Expected result: it is `Event`, resolved from RHDS's explicit `global:` reference.

4. Hover `$event` in UI5's `(click)` binding.

   Expected result: it has the native event type, because the manifest's reference for the name
   inside the type has no `start` and `end` offsets.

The Language Service doesn't suggest two-way bindings for manifest properties. A hand-written
`[(value)]` listens for `valueChange`, which most web components don't dispatch; bind the property
and the library's event separately.

## 13. Verify that unusable types turn off only their own checks

Use `<sp-textfield>` in `design-systems-page.html`. Some of its manifest's named types are unusable,
but the element and its other members are still known.

1. Hover `value`, `maxlength`, and `type` to compare types Angular uses with types it only shows.

2. Temporarily add `[notARealTextfieldProperty]="true"`.

   Expected result: NG8002 still rejects the unknown property.

3. Temporarily add the affected property binding:

   ```html
   [type]="'not-a-spectrum-type'"
   ```

   Expected result: only this value isn't checked, because Angular rejected the manifest's type for
   `type`. The tag, other members, hover text, and unknown-property checks still work.

4. Remove both temporary properties.

`[attr.variant]="'not-real'"` sets an attribute and isn't checked against the manifest's property
type. This is Angular's usual `[attr.*]` behavior, not a missed check.

## 14. Verify manifest resource reload

This check shows that the editor updates when a configured manifest changes, without a TypeScript
edit.

1. Open
   [`src/custom-elements/material-web-button.custom-elements.json`](./src/custom-elements/material-web-button.custom-elements.json).

2. The `target` union appears twice: once on the field and once on the attribute. Add
   `'review-only'` to both unions and save the manifest.

3. Without restarting the language server, return to `<md-filled-button>`, temporarily change
   `target="_self"` to `target=""`, and invoke Ctrl+Space.

   Expected result: `review-only` appears in the value suggestions.

4. Set `target="review-only"` and confirm there is no value diagnostic.

5. Remove `review-only` from both manifest unions and save, without editing the template.

   Expected result: the unchanged template value is now an error, so saving the manifest rebuilt the
   template checks.

6. Restore `target="_self"` and confirm the error clears.

If the update doesn't appear within a few seconds, check the Angular Language Service Output channel
before restarting the server. Needing a restart is itself a bug to report.

## 15. Verify configured-manifest diagnostics

These checks are optional and review the error diagnostics. Do them one at a time and undo each edit
right away.

### Missing configured resource

Temporarily change the Material manifest entry in `tsconfig.json` to a nonexistent path and save.

Expected result: NG4007 reports that the entry doesn't resolve to a file, and the Material elements
are unknown. Restore the correct path.

### Malformed manifest

Temporarily introduce invalid JSON into the Material manifest and save.

Expected result: NG4008 reports that the manifest isn't valid JSON, and Angular loads nothing from
it. Undo the JSON edit and save.

### Invalid diagnostics option

Temporarily add the following sibling option under `angularCompilerOptions`:

```json
"customElementsManifestsDiagnostics": "loud"
```

Expected result: NG4012 reports the invalid option value. The valid values are `summary` and
`verbose`. Remove the temporary option.

### Verbose diagnostics

Temporarily set:

```json
"customElementsManifestsDiagnostics": "verbose"
```

Run:

```bash
./node_modules/.bin/ngc -p tsconfig.app.json --noEmit
```

Expected result: compilation still succeeds, and the 20 summarized warnings become 1,636 individual
warnings (19 NG4009, 134 NG4010, 330 NG4011, and 1,153 NG4013). Remove the option to restore the
default.

## 16. Run the automated editor-protocol smoke test

`ls-perf/harness.js` starts the language server built in `../angular` over the Language Server
Protocol, times completions, and checks the completions from the app's two manifests:

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
- `http://localhost:4200/design-systems` for the design systems and the app's two manifests.

Confirm that the controls render and respond. This doesn't replace the editor review, but it catches
a manifest whose property names differ from the element's actual properties.

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
- [ ] Number and boolean static attributes show their type but aren't value-checked.
- [ ] Exact property names and casing are preserved.
- [ ] `type.references` resolve public named aliases.
- [ ] Resolvable element classes type local references.
- [ ] Event names complete, and events without a usable type use the native event type.
- [ ] Unusable metadata turns off only the checks that need it.
- [ ] The app's Material manifest supplies metadata the library doesn't publish.
- [ ] The app's Spectrum manifest replaces the library's unusable types.
- [ ] Saved manifest edits refresh diagnostics and completions without a server restart.
- [ ] NG4007, NG4008, NG4012, and summary/verbose diagnostics behave as documented.
- [ ] Protocol smoke test, compiler check, unit tests, production build, and runtime smoke pass.
