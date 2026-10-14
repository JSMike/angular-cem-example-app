# Open Angular issues related to Custom Elements Manifest support

Checked against the [`angular/angular` open issue tracker](https://github.com/angular/angular/issues)
on 2026-07-26. These issues overlap the proposed `customElementsManifests` feature or mark where it
stops. Most `@angular/elements` bugs about lifecycle, styling, and packaging of elements that Angular
produces are left out.

## Direct overlap or useful precedent

| Issue                                                                                                                             | Relationship to this feature                                                                                                                                                                                                                                                                                                                                                                                                        | Suggested PR treatment                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#36893 — Language Service: integration with custom-elements.json specification](https://github.com/angular/angular/issues/36893) | The closest match. It asks for custom-element property and event completions, descriptions, and types in Angular templates. The issue shows the older VS Code custom-data JSON format rather than today's Custom Elements Manifest schema. A maintainer later preferred `.d.ts` declarations; this implementation uses both, because CEM `type.references` point to the TypeScript declarations that Angular validates and imports. | Use `Closes #36893`. Explain that the PR provides the requested editor features through the current CEM schema and checks the referenced `.d.ts` declarations.                                                 |
| [#12045 — `[RFC]` elements schema: add support for custom schemas](https://github.com/angular/angular/issues/12045)               | Describes the underlying problem: `CUSTOM_ELEMENTS_SCHEMA` allows every custom tag and property instead of describing the known elements, properties, and events. A configured CEM is a standard source of such a schema, but this PR doesn't add a general API for custom schemas.                                                                                                                                                 | Cite as the long-standing motivation. Don't claim that the broader custom-schema request is solved.                                                                                                            |
| [#58483 — TypeScript interface for element definitions](https://github.com/angular/angular/issues/58483)                          | Proposes an augmentable TypeScript interface, like JSX's `IntrinsicElements`, for custom and built-in elements. Manifests cover much of the same need for custom elements, through metadata that packages publish. They don't let users augment built-in elements or describe elements in TypeScript alone.                                                                                                                         | Compare the approaches in the PR's design discussion: manifests are found through packages, carry documentation, and reference validated `.d.ts` types. Interface augmentation would remain a separate option. |
| [#36355 — Angular binding DOM property instead of web component property](https://github.com/angular/angular/issues/36355)        | Reports Angular renaming a custom element's `readonly` property to the native `readOnly`. The CEM branch fixes this for properties a manifest declares; standard DOM properties keep Angular's mapping.                                                                                                                                                                                                                             | Cite as an example of why exact names matter. It is fixed only for manifest-declared elements; elements allowed only by `CUSTOM_ELEMENTS_SCHEMA` behave as before.                                             |
| [#61001 — Recommended way to use web components from within an Angular app?](https://github.com/angular/angular/issues/61001)     | Asks for guidance and built-in support for loading web components, binding to them, and handling their events. Manifest support covers bindings and events at compile time, but doesn't load component scripts, register elements, or coordinate `@defer`.                                                                                                                                                                          | Cite as broader user demand. Keep the PR to compile-time support, separate from loading and registering elements at runtime.                                                                                   |
| [#44110 — Support scoped custom element registries](https://github.com/angular/angular/issues/44110)                              | Scoped registries may allow different definitions of the same tag in separate DOM scopes. The proposed option describes one set of tags for the whole program, where the first declaration of a tag wins. A maintainer comment on the issue notes the value of Angular knowing custom-element definitions at compile time.                                                                                                          | Treat as a future design constraint, not work for this PR. Don't imply that the first version supports scoped or per-component registries.                                                                     |

## Related gaps that manifests don't solve

| Issue                                                                                                                         | Why it is related                                                                                                                                       | Boundary of this feature                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [#28491 — Namespaced custom events](https://github.com/angular/angular/issues/28491)                                          | Some web components emit valid event names containing `:`, while Angular parses `:` as a global event-target separator.                                 | A manifest can describe the event, but can't change how Angular's template parser reads `:` or where it attaches the listener.              |
| [#63174 — Support for built-in custom elements](https://github.com/angular/angular/issues/63174)                              | Customized built-ins use `<button is="custom-button">` and require `createElement` options rather than an autonomous hyphenated tag.                    | The feature covers autonomous custom elements with their own tags. Supporting the `is` form needs separate compiler and runtime changes.    |
| [#45712 — Web-component properties are undefined inside `connectedCallback`](https://github.com/angular/angular/issues/45712) | Angular creates and attaches an element before update-mode property bindings run, so a component may observe missing values during `connectedCallback`. | Exact property names fix which property is set, but don't change the order of creation and binding.                                         |
| [#63015 — Additional `ngDefaultControl`-style directives for value types](https://github.com/angular/angular/issues/63015)    | Form-associated custom elements need Angular Forms adapters for boolean, numeric, and other non-string values.                                          | CEM validates properties and events; it does not create `ControlValueAccessor` behavior or define how event payloads update a form control. |
| [#69232 — Signal Forms support for custom elements](https://github.com/angular/angular/issues/69232)                          | Requests native-like Signal Forms behavior for form-associated custom elements, including metadata such as `min` and `max`.                             | Manifest typing can describe these members but does not make Signal Forms recognize or coordinate the element at runtime.                   |
| [#48746 — Platform-server support for Shadow DOM and custom elements](https://github.com/angular/angular/issues/48746)        | Covers executing/rendering custom elements and Shadow DOM in Angular SSR's server DOM environment.                                                      | Manifests are used only at compile time. A successful SSR build doesn't provide a server-side implementation of the custom elements.        |
| [#52275 — Client hydration for web components hydrated on the server](https://github.com/angular/angular/issues/52275)        | Server-side component transforms, such as Stencil's rendering, can change Angular's expected DOM and produce hydration mismatches.                      | Manifests don't change the rendered DOM or hydration. This stays a runtime problem even when templates are fully typed.                     |

## Typing for elements that Angular produces

| Issue                                                                                          | Relationship                                                                                                                                                                                                              | Boundary of this feature                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#53795 — Add typing for `NgElement` outputs](https://github.com/angular/angular/issues/53795) | Asks for an `@angular/elements` TypeScript helper that types custom-event outputs. If Angular Elements libraries published a manifest, Angular applications that use them would get the same `$event` types in templates. | This feature reads manifests; it doesn't generate them or add typing helpers to `@angular/elements`. Generating manifests for Angular Elements would be a separate change. |

## Recommended cross-references when opening the PR

1. Use **Closes #36893** in the commit footer. Explain that the PR supports the current Custom
   Elements Manifest format and uses the TypeScript declarations that manifests reference.
2. Cite **#12045**, **#58483**, and **#36355** in the motivation or design section. Don't use
   `Fixes` or `Closes`, because each goes beyond this PR.
3. Mention **#61001** when explaining that the PR covers compilation and the editor, and leaves
   loading scripts and registering elements to applications and libraries.
4. List **#28491**, **#44110**, **#48746**, **#52275**, **#63015**, **#63174**, and **#69232** only
   as related or follow-up work. They shouldn't widen the PR.
5. Once the PR exists, comment briefly on #36893 about the change from the older custom-data format
   and ask for testing before merge. Comment, without closing, on #12045, #58483, and #36355 so their
   authors and maintainers can review the overlap.

## Library producer follow-ups (2026-10-14)

The library review compared the gallery's published package versions with current upstream source.
These are producer follow-ups, separate from the Angular issues above. Repairs target review PRs
in `JSMike` forks; none were submitted to the source repositories.

### Fork review and consumer validation

Each repair has a separate source branch and a separate worktree of this example project at
`~/dev/angular-cem-validate-<repository>`, on `validate/cem-<repository>`. The validation runners
compare published metadata with the repaired producer output and exercise strict Angular template
checking. They use the locally built `../angular` branch for Angular framework/compiler packages;
Angular CLI/build tooling remains the gallery's configured CLI version. Results are recorded in
each worktree's validation README/results: `validation/` for Auro, Clarity, UI5, and Fluent;
`cem-validation/` for Lion, PatternFly, Red Hat, and Shoelace; and the root `README.md` with
`regression/library-cem.mjs` for Spectrum and Calcite.

| Library    | Source repository                                                                     | Fork review PR                                                                               | Example validation worktree suffix | Repair                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Auro       | [AlaskaAirlines/auro-button](https://github.com/AlaskaAirlines/auro-button)           | [JSMike/auro-button#1](https://github.com/JSMike/auro-button/pull/1)                         | `auro-button`                      | Publish usable class declarations and point CEM at the public class entry point.                       |
| Clarity    | [vmware-clarity/core](https://github.com/vmware-clarity/core)                         | [JSMike/core#1](https://github.com/JSMike/core/pull/1)                                       | `core`                             | Expose shipped element declaration modules to type resolution; correct loading-state literal metadata. |
| UI5        | [UI5/webcomponents](https://github.com/UI5/webcomponents)                             | [JSMike/webcomponents#1](https://github.com/JSMike/webcomponents/pull/1)                     | `webcomponents`                    | Add reference spans/global event metadata and remove redundant same-module definition records.         |
| Fluent     | [microsoft/fluentui](https://github.com/microsoft/fluentui)                           | [JSMike/fluentui#1](https://github.com/JSMike/fluentui/pull/1)                               | `fluentui`                         | Correct public module/type references and element tag metadata.                                        |
| Spectrum   | [adobe/spectrum-web-components](https://github.com/adobe/spectrum-web-components)     | [JSMike/spectrum-web-components#1](https://github.com/JSMike/spectrum-web-components/pull/1) | `spectrum-web-components`          | Add references for exported local named types.                                                         |
| Calcite    | [Esri/calcite-design-system](https://github.com/Esri/calcite-design-system)           | [JSMike/calcite-design-system#1](https://github.com/JSMike/calcite-design-system/pull/1)     | `calcite-design-system`            | Expose shipped declaration subpaths referenced by CEM through type-only package exports.               |
| Lion       | [ing-bank/lion](https://github.com/ing-bank/lion)                                     | [JSMike/lion#1](https://github.com/JSMike/lion/pull/1)                                       | `lion`                             | Exclude test/helper registrations and correct the input-range tag name.                                |
| PatternFly | [patternfly/patternfly-elements](https://github.com/patternfly/patternfly-elements)   | [JSMike/patternfly-elements#1](https://github.com/JSMike/patternfly-elements/pull/1)         | `patternfly-elements`              | Export the published manifest through the package export map.                                          |
| Red Hat    | [RedHat-UX/red-hat-design-system](https://github.com/RedHat-UX/red-hat-design-system) | [JSMike/red-hat-design-system#1](https://github.com/JSMike/red-hat-design-system/pull/1)     | `red-hat-design-system`            | Export the published manifest through the package export map.                                          |
| Shoelace   | [shoelace-style/shoelace](https://github.com/shoelace-style/shoelace)                 | [JSMike/shoelace#1](https://github.com/JSMike/shoelace/pull/1)                               | `shoelace`                         | Add resolvable global/public type and event references without changing wrapper generation.            |

Validation scope is deliberately recorded per worktree. Spectrum uses published declarations plus
its fork's actual reference-enrichment plugin; Calcite, PatternFly, and Red Hat use isolated copies
of published packages with their package metadata fixes. These checks do not imply a complete
monorepo build or browser/accessibility audit. Auro, Clarity, Lion, and Shoelace checks consume built
fork package artifacts. UI5 and Fluent record their generated-manifest fixture details alongside
results. Cursor CLI with `grok-4.7-high` reviewed each source fix; accepted findings are described in
the corresponding fork PR.

The complete Angular build (`pnpm build`) succeeded at commit
`aa4fd8f5f82e4f77f8f603a22e4d66497b841f4d`, producing
`22.3.0-next.0+sha-aa4fd8f`. The existing example-app regression suite passed **8/8** scenarios
against those local packages. Consumer checks demonstrate both successful valid bindings and
rejection of invalid values; passing a check does not mean every warning in the package is gone.

Run the dedicated consumer checks from the corresponding worktree:

- Auro, Clarity, Spectrum, Calcite: `npm run test:library-cem`.
- UI5, Fluent: `node validation/validate-cem.mjs`.
- Lion, PatternFly, Red Hat, Shoelace: `npm run test:cem-fork`.

Validated example-project branch commits (all targeted checks passed):

| Worktree suffix           | Local validation commit |
| ------------------------- | ----------------------- |
| `auro-button`             | `f253559`               |
| `core`                    | `a315847`               |
| `webcomponents`           | `de27b06`               |
| `fluentui`                | `0630fd2`               |
| `spectrum-web-components` | `4659f95`               |
| `calcite-design-system`   | `1ce9701`               |
| `lion`                    | `2131e76`               |
| `patternfly-elements`     | `1b7066e`               |
| `red-hat-design-system`   | `c3df481`               |
| `shoelace`                | `a9257d1`               |

### Remaining interoperability questions

- UI5's current generated main manifest references 70 distinct local enum modules through named
  types that the modules only export as `default`. Fixing reference spans alone does not resolve
  those exports. Adding public named exports or supporting export aliases requires a separate
  compatibility decision.
- The Angular branch currently requires an offset-based reference's selected text to equal
  `reference.name`. CEM references identify exported names, so renamed imports need further
  consumer review; emitting a correct export reference alone does not establish Angular support
  for a differently named local alias.
- Fluent retains private helper modules and additional type-reference gaps outside its repaired
  public class/options exports. UI5 also has global-reference gaps beyond Event/CustomEvent.
- Spectrum's local named-type repairs do not cover every imported or platform type. Shoelace's
  repair is similarly limited to symbols resolvable through standard libraries or its public
  exports. Unresolved/private types should not be guessed.
- Repeated definition records associated with dependency imports and barrel modules need separate
  producer/consumer interpretation. Do not remove registrations merely to silence `NG4010`, or
  assume each warning proves a second runtime `customElements.define()` call.
- Clarity's source repository is archived, and Shoelace's contribution guide states that the
  project is sunset. Fork review does not imply that an upstream submission can be accepted.

### Material Web: missing manifest already resolved

The gallery depends on `@material/web` 2.4.1 and supplies its own manifest. Published 2.5.0 now
includes `custom-elements.json`, its `package.json#customElements` field, and generated declarations
for `md-filled-button`. The current
[`material-components/material-web`](https://github.com/material-components/material-web) build
generates the manifest with `@lit-labs/gen-manifest`. The 2.5.0 tarball was inspected to verify that
the manifest actually ships (330 modules). A fork and local checkout at `~/dev/material-web` were
prepared for investigation; no redundant missing-manifest patch or PR was created.

### Libraries without a confirmed producer defect in this review

The configured `@box-model/web` package maps to
[`JSMike/box-model.dev`](https://github.com/JSMike/box-model.dev), and `@vaadin/button` maps to
[`vaadin/web-components`](https://github.com/vaadin/web-components). No repair was identified for
their configured declarations. Vaadin mixin traversal remains an Angular scope limitation.
`@microsoft/fast-element` is a component foundation, `@microsoft/focusgroup-polyfill` is a polyfill,
and `@nordhealth/css` is a stylesheet package; absence of an element manifest in those dependencies
does not by itself establish a missing component-library feature.

### Library follow-up: Nord source access

On 2026-10-14, the library manifest review confirmed that `@nordhealth/components` publishes
references to unshipped `src/*.ts` modules, which prevents consumers from resolving element class
and event types through the manifest. Nord's package metadata points to
[`nordhealth/design-system`](https://github.com/nordhealth/design-system), but GitHub returns
“not found” for the authenticated `JSMike` account, and the repository is absent from Nord's public
repository listing. It may be private or no longer available at that location.

**Deferred at the user's request:** skip Nord for now. No Nord fork, local source fix, or PR was
created. Resume when an accessible source repository or checkout is available; the published
manifest alone is not enough to repair and validate its generation pipeline.

## Search notes

The review searched open issues for `custom elements`, `web components`,
`CUSTOM_ELEMENTS_SCHEMA`, `custom-elements.json`, `custom element` plus compiler/language-service
terms, `HTMLElementTagNameMap`, and the `cross-cutting: custom elements` label. The issue states and
descriptions above were then checked one by one. Issues use varied terms, so this list may miss some;
it covers the issues most relevant to the PR.
