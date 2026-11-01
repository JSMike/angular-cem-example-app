# Follow-up CEM contribution candidates

Audited: 2026-07-26

This is a point-in-time review of published npm artifacts for established design systems and web
component libraries. A **JSON-Schema-valid CEM** here means a document that passes the official
schema for its declared supported version, not merely a document with a string `schemaVersion` and
a `modules` array. Requirements expressed in the schema's TypeScript contract, such as JavaScript
module paths and declaration relationships, are called out separately when the generated JSON
Schema cannot express them. Stencil collection metadata, Stencil documentation JSON, and the older
`{ "version": "experimental", "tags": [...] }` format remain useful metadata, but they are not
standards-based CEMs.

This document tracks changes to third-party manifests, generators, and package publishing only.
Continuing Angular compiler and language-service work is tracked in
[`2nd-pass-considerations.md`](./2nd-pass-considerations.md).

The stricter definition above corrects earlier shallow-validation descriptions in this file.
Notably, the currently published Clarity and Calcite files fail the official 2.1.0 JSON Schema even
though Angular's projection parser can recover useful custom-element records from them.

## 2026-07-19 additional discovery

| Package                                                                                  | Published result                                                                                                                                                                                       | Recommended producer action                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@github/relative-time-element@5.3.0`](https://github.com/github/relative-time-element) | The CEM passes the official JSON Schema, but supplies neither a declaration `tagName` nor a `custom-element-definition`; a standards-based consumer has no mapping to the runtime `relative-time` tag. | Emit a definition export (or the appropriate self-registering `tagName` plus definition) and add a packed-artifact consumer test. Angular should not infer the package's runtime registration. |
| [`@awesome.me/webawesome@3.10.0`](https://github.com/shoelace-style/webawesome)          | The 1.8 MB CEM validates and maps 66 tags, but has no `type.references` and produces 438 narrow parser warnings in the Angular audit.                                                                  | Add standard event types and exact references for named types. It is a useful scale fixture but does not add a new gallery behavior beyond Shoelace.                                           |
| [`@shopify/polaris-types@1.0.7`](https://www.npmjs.com/package/@shopify/polaris-types)   | The manifest fails the official JSON Schema (42 validator branches), has 59 `tagName` declarations without definition exports, and omits type references.                                              | Fix generator shape and class/tag linkage before treating this type-only package as a portable CEM source. Angular should not add compatibility inference for it.                              |
| [`jb-calendar@5.2.0`](https://www.npmjs.com/package/jb-calendar)                         | The file passes the generated JSON Schema, but its module path ends in `.ts` and its events omit required types, contrary to requirements in the schema TypeScript contract.                           | Emit the published JavaScript module path and standard event types.                                                                                                                            |

Package popularity is not ranked precisely. The list favors established projects whose missing or
invalid manifest would make a useful upstream contribution after Angular's CEM integration ships.

## Source repositories

| Library or package                                            | Source repository                                                                                                                       |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum Web Components (`@spectrum-web-components/*`)        | [adobe/spectrum-web-components](https://github.com/adobe/spectrum-web-components)                                                       |
| Fluent UI Web Components (`@fluentui/web-components`)         | [microsoft/fluentui](https://github.com/microsoft/fluentui)                                                                             |
| Calcite Design System (`@esri/calcite-components`)            | [Esri/calcite-design-system](https://github.com/Esri/calcite-design-system)                                                             |
| Carbon Web Components (`@carbon/web-components`)              | [carbon-design-system/carbon](https://github.com/carbon-design-system/carbon)                                                           |
| Material Web (`@material/web`)                                | [material-components/material-web](https://github.com/material-components/material-web)                                                 |
| Ionic Core (`@ionic/core`)                                    | [ionic-team/ionic-framework](https://github.com/ionic-team/ionic-framework)                                                             |
| Microsoft FAST Components (`@microsoft/fast-components`)      | [microsoft/fast](https://github.com/microsoft/fast)                                                                                     |
| Duet Design System (`@duetds/components`)                     | No public component-source repository was identified; see the official [duetds GitHub organization](https://github.com/duetds).         |
| Telekom Scale (`@telekom/scale-components`)                   | [telekom/scale](https://github.com/telekom/scale)                                                                                       |
| Refinitiv UI Elements (`@refinitiv-ui/elements`)              | [Refinitiv/refinitiv-ui](https://github.com/Refinitiv/refinitiv-ui)                                                                     |
| PatternFly Elements (`@patternfly/elements`)                  | [patternfly/patternfly-elements](https://github.com/patternfly/patternfly-elements)                                                     |
| Lion (`@lion/ui`)                                             | [ing-bank/lion](https://github.com/ing-bank/lion)                                                                                       |
| Wired Elements (`wired-elements`)                             | [wiredjs/wired-elements](https://github.com/wiredjs/wired-elements)                                                                     |
| Shoelace (`@shoelace-style/shoelace`)                         | [shoelace-style/shoelace](https://github.com/shoelace-style/shoelace)                                                                   |
| UI5 Web Components (`@ui5/webcomponents`)                     | [UI5/webcomponents](https://github.com/UI5/webcomponents)                                                                               |
| Vaadin Web Components (`@vaadin/button` and related packages) | [vaadin/web-components](https://github.com/vaadin/web-components)                                                                       |
| Clarity Core (`@cds/core`)                                    | [vmware-clarity/core](https://github.com/vmware-clarity/core)                                                                           |
| Nord Design System (`@nordhealth/components`)                 | No public component-source repository was identified; see the official [nordhealth GitHub organization](https://github.com/nordhealth). |
| Red Hat Design System (`@rhds/elements`)                      | [RedHat-UX/red-hat-design-system](https://github.com/RedHat-UX/red-hat-design-system)                                                   |
| Auro (`@aurodesignsystem/auro-button`)                        | [AlaskaAirlines/auro-button](https://github.com/AlaskaAirlines/auro-button)                                                             |
| Box Model UI (`@box-model/web`)                               | [JSMike/box-model.dev](https://github.com/JSMike/box-model.dev)                                                                         |

## Contribution candidates

| Priority           | Project and package                                                                                                                      | Published state                                                                                                                                                                                                                                                                                                                | Recommended contribution                                                                                                                                                                                                                                                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High / small fix   | [Spectrum Web Components bundle](https://www.npmjs.com/package/@spectrum-web-components/bundle) `@spectrum-web-components/bundle@1.12.2` | Declares `customElements: "custom-elements.json"`, and its `files` list names that file, but the published bundle tarball does not contain it. Individual packages publish CEMs, but some named property types omit `type.references` and inherited public members are incomplete.                                             | Fix the bundle packaging/release pipeline, add references or inline unions for named types such as `ButtonVariants`, `ButtonTreatments`, and `TextfieldType`, and include inherited public fields such as `disabled`. Test the packed artifact in CI.                                                                                                                |
| High / small fix   | [Shoelace](https://www.npmjs.com/package/@shoelace-style/shoelace) `@shoelace-style/shoelace@2.20.1`                                     | Publishes a discoverable, valid CEM, but events such as `sl-change` omit standard `type` data and expose their TypeScript spelling only through non-standard `eventName`.                                                                                                                                                      | Emit standards-based event `type` records with references to the published event declarations, while retaining framework-specific extension fields for existing consumers.                                                                                                                                                                                           |
| High               | [Fluent UI Web Components](https://www.npmjs.com/package/@fluentui/web-components) `@fluentui/web-components@3.0.2`                      | Publishes a CEM, but its element declarations reference private `dist/esm/...` module paths excluded by the package export map. It emits base class names as invalid custom-element tags and combines declaration `tagName` seeds with 42 same-tag definition exports in separate `define.js` modules.                         | Generate references against public package exports, filter base/test declarations from custom-element definitions, preserve references or literal values for named property types, and model each registration once: either omit `tagName` for separately registered declarations or emit the matching definition in the self-registering declaration's home module. |
| High               | [Calcite Design System](https://www.npmjs.com/package/@esri/calcite-components) `@esri/calcite-components@5.1.2`                         | Publishes a CEM-like document that fails the official JSON Schema across non-schema declaration records; many `type.references` also target internal `components/.../interfaces` and utility modules that the package export map cannot resolve.                                                                               | Make the complete document schema-conforming, then point manifest references at public declaration entry points or add specific type-only exports. Validate the full packed manifest and all references in CI.                                                                                                                                                       |
| High               | [Carbon Web Components](https://www.npmjs.com/package/@carbon/web-components) `@carbon/web-components@2.58.1`                            | Exports `./custom-elements.json` but has no `customElements` package field. The exported file is the legacy `{ version: "experimental", tags: [...] }` format. The `2.59.0-rc.0` artifact has the same shape.                                                                                                                  | Generate a module-based CEM, expose it through `package.json.customElements`, retain an explicit export, and include resolvable type references and event types. Plan compatibility for consumers of the legacy file.                                                                                                                                                |
| High               | [Material Web](https://www.npmjs.com/package/@material/web) `@material/web@2.4.1`                                                        | No `customElements` package field and no manifest-like JSON file in the published artifact.                                                                                                                                                                                                                                    | Add standards-based CEM generation for its Lit components, publish the result, and add both `customElements` and an explicit JSON export.                                                                                                                                                                                                                            |
| High               | [Ionic Core](https://www.npmjs.com/package/@ionic/core) `@ionic/core@8.8.13`                                                             | No standard CEM. Publishes Stencil-specific `dist/docs.json` and `dist/collection/collection-manifest.json`.                                                                                                                                                                                                                   | Add a CEM output stage derived from Ionic's source/compiler metadata, with typed events, public declaration paths, and package discovery metadata.                                                                                                                                                                                                                   |
| Medium             | [Microsoft FAST Components](https://www.npmjs.com/package/@microsoft/fast-components) `@microsoft/fast-components@2.30.6`                | No JSON CEM and no `customElements` field. Files named `custom-elements.js` are registration/runtime modules, not manifests.                                                                                                                                                                                                   | Coordinate with FAST maintainers on CEM generation if this package remains an active integration target. Fluent UI Web Components already publishes a valid CEM and may provide reusable build precedent.                                                                                                                                                            |
| Medium             | [Duet Design System](https://www.npmjs.com/package/@duetds/components) `@duetds/components@10.3.1`                                       | No standard CEM or package discovery field. Publishes only the Stencil collection manifest at `lib/collection/collection-manifest.json`.                                                                                                                                                                                       | Add a standards-based manifest alongside the existing Stencil metadata and expose it through `customElements` and an export map entry.                                                                                                                                                                                                                               |
| Medium             | [Telekom Scale](https://www.npmjs.com/package/@telekom/scale-components) `@telekom/scale-components@3.0.0-beta.161`                      | No standard CEM or `customElements` field. Publishes `dist/collection/collection-manifest.json`.                                                                                                                                                                                                                               | Generate a CEM from the same Stencil source metadata and verify literal values and custom-event detail types survive conversion.                                                                                                                                                                                                                                     |
| Medium             | [Refinitiv UI Elements](https://www.npmjs.com/package/@refinitiv-ui/elements) `@refinitiv-ui/elements@7.15.6`                            | No package-level `customElements` field. Individual component directories contain legacy `{ version: "experimental", tags: [...] }` files rather than module-based CEMs.                                                                                                                                                       | Produce one discoverable package-level CEM, or standards-based per-package manifests if the library is split. Preserve its useful literal unions while adding module/reference information.                                                                                                                                                                          |
| Medium / small fix | [PatternFly Elements](https://www.npmjs.com/package/@patternfly/elements) `@patternfly/elements@5.0.0`                                   | Publishes a structurally valid CEM and declares `customElements`, but its export map exposes neither the package root nor `./custom-elements.json`, so package-specifier discovery fails. Some named aliases also omit references.                                                                                             | Export `./custom-elements.json` explicitly, test package-specifier resolution, and add references or inline unions for named types such as `ButtonVariant`.                                                                                                                                                                                                          |
| Medium             | [Lion](https://www.npmjs.com/package/@lion/ui) `@lion/ui@0.18.1`                                                                         | Publishes a 5.8 MB CEM, but its export map prevents package-specifier discovery. The manifest includes test and `node_modules` declarations, duplicate tags, identifier-like tag names, and one backtick-quoted tag.                                                                                                           | Restrict generator inputs to public source, normalize tag extraction, export the manifest explicitly, and add resolvable references for named types. Add uniqueness and valid-custom-element-name checks to CI.                                                                                                                                                      |
| High / small fix   | [Nord Design System](https://www.npmjs.com/package/@nordhealth/components) `@nordhealth/components@5.0.3`                                | Publishes a discoverable, valid CEM with excellent inline literal unions and typed events, but every module `path` names an unshipped TypeScript source such as `src/button/Button.ts`. The declarations actually ship at `lib/src/*.d.ts`. Event types name `NordEvent` without `type.references`.                            | Point manifest module paths at the published `lib/src/*.js` output (the analyzer appears to have run against source paths), and add `type.references` for `NordEvent`. This restores element instance typing and typed `$event` payloads for every consumer.                                                                                                         |
| High               | [Clarity Core](https://www.npmjs.com/package/@cds/core) `@cds/core@6.17.0`                                                               | Publishes a discoverable manifest that fails the official JSON Schema because one default export's declaration lacks its required name. Module paths such as `accordion/accordion-content.element.js` are also hidden by the export map, and one member type is invalid TypeScript (`default \| loading \| success \| error`). | Correct the default export record, then add export entries for referenced `*.element.js` modules or rewrite paths to public subpaths. Quote literal union members and validate both the full schema and references against the packed artifact.                                                                                                                      |
| Low                | [Wired Elements](https://www.npmjs.com/package/wired-elements) `wired-elements@3.0.0-rc.6`                                               | No `customElements` field and no manifest-like JSON in the published artifact.                                                                                                                                                                                                                                                 | Add lightweight CEM generation and package discovery metadata. This could be a relatively small Lit-oriented contribution.                                                                                                                                                                                                                                           |

## Standards-alignment actions found during Angular review

The Angular review identified several consumed CEM relationships that should be represented more
precisely by producers. These are upstream portability improvements, not reasons for Angular to
reject the rest of an otherwise useful manifest. Angular should report repeated inconsistencies as
one per-manifest warning with an affected-entry count by default; its verbose diagnostics mode can
expand that summary into one diagnostic per entry.

The CEM schema does not state whether a JavaScript module `path` is rooted at the package directory
or at the manifest file. Angular's package-root resolution should remain primary, with its existing
manifest-relative resolution retained as a validated fallback. Shoelace demonstrates why this is
important: its CEM is published under `dist/`, its module paths start with `components/`, and all 58
element class types resolve through the manifest-relative interpretation. This path convention is
therefore not listed below as a producer defect.

| Project                  | Standards gap affecting portable consumers                                                                                                                                                                                                                                                                                                                             | Recommended producer change                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shoelace                 | Event records omit the required standard `type`, and self-registering declarations with `tagName` do not include matching `custom-element-definition` exports.                                                                                                                                                                                                         | Emit standard event types, including explicit `global:` references for `Event`/`CustomEvent` occurrences and exact spans for nested detail types. Emit one definition export for each self-registering tag. Keep `eventName` only as additional compatibility metadata.                                                                                                                                                                              |
| Box Model UI             | Eight close events use `CustomEvent<void>` without a `type.references` entry for the global `CustomEvent` identifier. The local Angular example therefore receives the safe `Event` fallback while its exact public property aliases remain typed.                                                                                                                     | Update `libs/web/generators/component-metadata.ts` so every named global in emitted type text receives a `package: "global:"` reference with exact offsets. In particular, `CustomEvent<void>` needs a `CustomEvent` reference covering indices `0..11`. Keep the existing exact references for public aliases such as `ButtonVariant` and `ColumnsGap`.                                                                                             |
| UI5 Web Components       | Many same-package references name declarations such as `ButtonDesign`, while the referenced module publicly exports only `default`. Compound event/property references also omit required offsets, `CustomEvent` is generally not identified with a `global:` reference, and `ui5-textarea` carries the same definition export twice in `dist/TextArea.js`.            | Publish named exports for referenced enum/detail declarations (a named export alongside the existing default is sufficient), point the CEM at those public names, emit exact `start`/`end` offsets for every identifier inside compound text, explicitly reference platform globals, and deduplicate the TextArea definition export. Keep the separate inline string unions on attributes because they provide portable serialized-value completion. |
| Spectrum Web Components  | The bundle packaging issue remains; individual manifests also omit references for some named types. Some definition references use a leading-slash module spelling such as `/src/Button.js`, and some public events/global-containing types lack complete metadata.                                                                                                    | Publish the bundle CEM, normalize definition references to the manifest's actual module identities, add missing event types and `global:` references, preserve named-type references, and validate the packed artifact rather than only source output.                                                                                                                                                                                               |
| Calcite Design System    | Most affected references point at modules hidden by the package export map; one retained public type also contains an unreferenced `Promise`.                                                                                                                                                                                                                          | Move references to public declaration entry points or add targeted type exports, and emit a `global:` reference for `Promise`. Resolve every reference against the packed package in CI.                                                                                                                                                                                                                                                             |
| Fluent UI Web Components | Element identities use private module paths, invalid base-class names are emitted as tags, named option types have no references, retained `Event`/DOM collection types lack global references, and all 42 elements combine a self-registering `tagName` with a same-tag definition in a separate `define.js` module.                                                  | Use public export paths, filter non-element base declarations, emit named-type references or inline unions, add exact `global:` references for `Event`, `HTMLElement`, `Node`, and other platform types, and choose one conforming registration model per declaration rather than describing both self-registration and separate registration.                                                                                                       |
| Nord Design System       | Module paths name unpublished TypeScript sources, `NordEvent` lacks references, and many retained DOM types are written as unreferenced globals.                                                                                                                                                                                                                       | Emit paths for the published JavaScript/declaration output, reference `NordEvent`, and add exact `global:` references for platform types such as `HTMLElement` and `Promise`.                                                                                                                                                                                                                                                                        |
| Clarity Core             | Referenced element modules are hidden by the export map, one intended string union is emitted as unquoted identifiers, events can omit required type metadata, self-registering tags lack definition exports, and retained DOM types omit global references.                                                                                                           | Expose or rewrite referenced element modules, quote literal strings, emit event types and matching definition exports, and add exact `global:` references for platform names such as `HTMLElement` and `Element`.                                                                                                                                                                                                                                    |
| Red Hat Design System    | RHDS already demonstrates the correct `package: "global:"` form for `rh-switch`'s `Event`, but a few other retained `HTMLElement` occurrences remain implicit. It also emits 91 extra same-tag definition records from aggregator or consuming-element modules; 41 declaration identities occur more than once, including `rh-tooltip` from several unrelated modules. | Apply the same explicit-global generation rule consistently to every named platform type. Emit each `custom-element-definition` only for the module that performs the authoritative registration; ordinary imports/re-exports of an already registered element should not create additional definition records.                                                                                                                                      |
| Auro                     | The published element names an unpublished source module, its self-registering tag has no matching definition export, and a retained `HTMLElement` occurrence is implicit.                                                                                                                                                                                             | Point the declaration at published output, add the definition export, and emit an exact `global:` reference for `HTMLElement`.                                                                                                                                                                                                                                                                                                                       |
| Vaadin                   | The tested button metadata is otherwise strong, but its self-registering declaration has no matching `custom-element-definition` export.                                                                                                                                                                                                                               | Emit the required definition export while retaining the existing class, member, and tag metadata.                                                                                                                                                                                                                                                                                                                                                    |
| PatternFly Elements      | Package discovery is blocked by the export map, several events omit types, named aliases omit references, and a small set of `Event`/`Element`/`Set` occurrences are implicit globals.                                                                                                                                                                                 | Export the CEM, emit required event types, add alias references, and add exact `global:` references for platform types.                                                                                                                                                                                                                                                                                                                              |
| Lion                     | The full manifest contains out-of-scope declarations and invalid/duplicate tags in addition to its discovery problem. Its size makes every structural defect more expensive to process.                                                                                                                                                                                | Keep generation limited to public package sources, validate tag uniqueness and definition linkage, publish the manifest through the export map, and emit complete type/global references for the retained public declarations.                                                                                                                                                                                                                       |

For all of these projects, malformed or incomplete metadata should be corrected in the producer or
in a consumer-maintained replacement CEM. Angular should not silently substitute a `.d.ts` type
for type text that the manifest itself declares but cannot safely use.

Number and boolean attribute declarations are not producer defects merely because the manifest
does not describe their converter. Their types remain valuable for property bindings, hovers, and
documentation. The standard does not currently expose a universal attribute conversion algorithm,
so producers should not be asked to replace accurate `number`/`boolean` metadata with string unions.
When a component really accepts a closed set of serialized string tokens, however, an explicit
string-literal union remains the most portable way to provide static-value validation and editor
completion.

## Notes by project

### Shoelace event types

Shoelace is the motivating integration and its element, property, attribute, documentation, and
static-value metadata work well. Event records such as `sl-change`, however, contain `name`,
`reactName`, and the non-standard `eventName: "SlChangeEvent"` but no standard CEM `type`. Angular
therefore recognizes and documents the event but correctly types `$event` as the normal fallback
`Event`.

The package already publishes declarations such as
`dist/events/sl-change.d.ts`, where `SlChangeEvent` is a `CustomEvent` type. The generator should
emit a standard event `type` with a resolvable reference to that declaration. Acceptance should
cover an event with empty detail and an event with structured detail, then verify that a generic CEM
consumer can type the payload without understanding `reactName` or `eventName`.

### Spectrum Web Components bundle

This appears to be the smallest and clearest upstream fix. The bundle package metadata already
claims the manifest exists, but `npm pack @spectrum-web-components/bundle@1.12.2` does not include
it. By contrast, packages such as
[`@spectrum-web-components/button`](https://unpkg.com/@spectrum-web-components/button@1.12.2/custom-elements.json)
and
[`@spectrum-web-components/textfield`](https://unpkg.com/@spectrum-web-components/textfield@1.12.2/custom-elements.json)
ship valid CEM 1.0 files.

Suggested acceptance criteria:

- `npm pack` contains the bundle-level `custom-elements.json`.
- The package's `customElements` path resolves in Node/bundler package resolution.
- The aggregated manifest retains module paths that resolve against published JavaScript and
  declarations.
- A release test parses the packed file and asserts `schemaVersion` and `modules`.

The individual manifests also have a smaller type-fidelity issue. The audit confirmed that inline
types work well: for example, `sp-button` completes and rejects invalid `type` values, and primitive
boolean/number bindings are checked. However, properties such as `variant` use a named spelling such
as `ButtonVariants` without a `type.references` entry. Angular must safely fall back to
existence-only checking, so arbitrary values are accepted and the editor cannot offer variant
values. The public declarations export these types, making this suitable for an upstream generator
correction.

The full Angular integration page uncovered an inherited-member omission as well. `sp-button`
supports the standard `disabled` state at runtime through its base classes, but the button CEM does
not declare a bindable `disabled` member or attribute. Angular correctly rejects
`[disabled]="..."` when the vendor manifest is authoritative. The demo now replaces that one
manifest entry with a focused consumer projection derived from the public declarations. This
recovers strict `variant`/`treatment` unions and the inherited `disabled` member while leaving the
theme and textfield vendor manifests configured. Spectrum's generator should provide the same
metadata upstream so consumers do not need this maintenance burden.

### Carbon Web Components

Carbon's
[`custom-elements.json`](https://unpkg.com/@carbon/web-components@2.58.1/custom-elements.json)
is discoverable only through the explicit export and is not a standard CEM. It contains useful
property, attribute, event, description, and type spelling data, so migration should preserve that
information rather than merely changing the root shape.

Important contribution details:

- Generate module declarations and `custom-element-definition` exports.
- Emit `type.references` for named types such as `BUTTON_KIND`, including module/package and spans
  when used inside a larger type expression.
- Ensure referenced declaration subpaths are publicly resolvable from the published package.
- Emit useful custom-event types rather than only event names.
- Decide how to avoid breaking Storybook or other consumers that still expect the legacy `tags`
  format. A transitional legacy filename may be safer than changing the existing file in place.

### Material Web

The published `@material/web@2.4.1` package contains neither a CEM nor package discovery metadata.
Because its elements are Lit-based, the standard CEM analyzer's Lit support may provide a starting
point, followed by project-specific corrections for inherited members, event typing, and public
module paths.

The demo now includes a consumer-authored projection for `md-filled-button`, sourced from the
package's public declarations. It verifies property checking and literal-union completions for a
library with no vendor manifest, but deliberately remains a focused application contract rather
than pretending to replace a complete package-owned CEM.

### Stencil-based packages

Ionic, Duet, and Telekom Scale publish Stencil compiler metadata, but those files should not be
advertised directly as CEMs. A contribution should generate or convert to the module-based schema
and then validate the final packed artifact rather than only the source-tree output.

The most important fidelity checks are:

- property versus attribute names;
- readonly/writable status where available;
- literal unions and their static attribute values;
- custom event names and payload types;
- public declaration module references;
- class/tag linkage through `custom-element-definition` exports.

### Refinitiv UI Elements

Refinitiv already publishes substantial legacy metadata per component. For example,
`lib/button/custom-elements.json` describes `ef-button` with inline literal unions and primitive
types, but uses the experimental `tags` root. A package-level standards migration would improve
discoverability and avoid requiring consumers to enumerate many component-specific files.

## Integration audit of published CEMs

The following packages were retested on 2026-07-26 with the final strict-reference and structural
diagnostic contract. The audit covered manifest loading, string-union static values, property
bindings, local-reference typing, representative language-service completions, and a production
build. Counts are individual findings in `verbose` mode; the parenthesized number is the bounded
default summary-line count. Across all seventeen configured manifests the result is 1,802 verbose
findings folded into 25 default warnings, with zero template errors.

| Package / configured manifest                                | Verbose findings (default summaries)                       | Behavioral result                                                                                                                                                                                                                                        |
| ------------------------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shoelace `2.20.1`                                            | 113 `NG4013` + 160 `NG4014` (2)                            | Elements, properties, literal-union attributes, docs, and completions remain useful. Missing standard event types and definition exports are visible; affected events use `Event`. Manifest-relative module fallback preserves class resolution.         |
| Box Model UI `0.0.1`                                         | Clean (0)                                                  | Exact public aliases such as `TagVariant`, `ButtonVariant`, and `ColumnsGap` retain static/property checks and completions. Close events now carry explicit global `CustomEvent` references, and the package also ships its version-matched Agent Skill. |
| Clarity Core `6.17.0`                                        | 68 `NG4011` + 239 `NG4013` + 79 `NG4014` (3)               | Valid inline string unions remain strict. Hidden element modules, unsupported/unreferenced type text, missing event types, and missing definition exports degrade narrowly and are now visible.                                                          |
| Spectrum theme/local button/textfield `1.12.2` (3 manifests) | 10 `NG4013` + 3 `NG4014` (4)                               | The app-owned button projection expands `ButtonVariants`/`ButtonTreatments` from public declarations, restoring strict values and eliminating the vendor button's 10 findings. Theme/textfield defects remain visible.                                   |
| UI5 Web Components `2.24.0`                                  | 71 `NG4011` + 247 `NG4013` (2)                             | Separate inline attribute unions remain strict. References to non-exported names, index-less nested references, and implicit globals fail closed. Repeated definition records for the same declaration/tag identity are deduplicated.                    |
| Calcite `5.1.2`                                              | 31 `NG4011` + 17 `NG4013` (2)                              | Inline string unions and resolvable element identities remain active. Types behind private export-map paths and unreferenced globals lose only their dependent checks.                                                                                   |
| Fluent UI Web Components `3.0.2`                             | 19 `NG4009` + 42 `NG4011` + 229 `NG4013` + 42 `NG4014` (4) | Invalid base-class tags are skipped. Primitive/property metadata remains usable, while private paths, missing references, and missing definitions/events fall back narrowly. Repeated same-identity definitions are deduplicated.                        |
| Nord `5.0.3`                                                 | 117 `NG4011` + 191 `NG4013` (2)                            | Inline string unions, unknown-property checks, and unknown-tag checks remain active. Unpublished source paths and missing named/global references prevent instance and event precision.                                                                  |
| Red Hat Design System `4.2.0`                                | 59 `NG4013` (1)                                            | The declaration-home-module tiebreak preserves real instance types across barrel re-exports. Repeated same-identity definitions are deduplicated; remaining implicit globals and unsupported type forms degrade individually.                            |
| Auro Button `12.3.2`                                         | 1 `NG4011` + 1 `NG4014` (2)                                | Self-contained property metadata remains usable; the unpublished class module loses instance typing and the missing definition export is reported.                                                                                                       |
| Vaadin Button `25.2.4`                                       | 1 `NG4014` (1)                                             | Declared member and instance typing remains strong. Only the missing required definition export is reported; undeclared mixin members remain out of scope.                                                                                               |
| PatternFly Elements `5.0.0`                                  | 48 `NG4013` + 14 `NG4014` (2)                              | Direct-file configuration loads the manifest and retains unrelated inline types. Missing event, alias/global, and structural metadata loses only the affected checks.                                                                                    |
| Focused Lion projection                                      | Clean (0)                                                  | The consumer-maintained standards-compliant projection demonstrates the replacement-manifest escape hatch with strict primitive, event, and member metadata.                                                                                             |
| Material Web local projection                                | Clean (0)                                                  | An app-owned manifest adds strict button properties and finite values for a package that publishes no CEM. Upstream publication remains preferable for complete package coverage and automatic discovery.                                                |
| Local workspace package                                      | Clean (0)                                                  | Bare-package discovery, strict literal-union property checking, and class-typed local references all work through the symlinked consumer-authored package.                                                                                               |

### UI5: references need public export names and exact spans

UI5's property references commonly name a local declaration such as `AvatarSize`, while the
referenced module publicly exposes that declaration only as its `default` export. Angular does not
reinterpret that reference through a different CEM export record: portable `type.references`
should identify the exact public export directly. The most compatible producer fix is to publish a
named export alongside the existing default and reference that named export from the CEM. Because
these declarations are actual TypeScript string enums, property bindings can then retain nominal
enum checking with values such as `ButtonDesign.Emphasized`; raw serialized strings remain
appropriate for UI5's separate static-attribute literal unions.

UI5 also declares its button `click` event as `CustomEvent<ButtonClickEventDetail>`, and the detail
type is publicly exported. Its reference omits `start`/`end`, even though
`ButtonClickEventDetail` is only one identifier inside the compound type. Per the CEM
specification an index-less reference names the **entire** type string, so this shape is
nonconforming. Angular briefly shipped a unique-occurrence compatibility rule for it, but that
rule was removed by decision on 2026-07-17 (Angular decision context: compatibility extensions
for one producer's nonconforming output effectively establish new de-facto formats; the fix
belongs in the producer). Nested references without exact offsets now fail closed to
existence-only checking with an `NG4013` warning.

After Angular's readonly/static/visibility filters, UI5 has 139 compound references with missing
spans: 103 events and 36 bindable fields. **Emitting exact `start`/`end` offsets in UI5's
manifest generator is therefore the primary and now the only path** to typed `$event` payloads
and typed compound field types for UI5 consumers — of Angular and of every CEM consumer that
implements only the specification rule. Whole-text index-less references remain the conforming
form when the referenced identifier is also an actual public export. References such as
`design`'s `ButtonDesign` additionally need the named-export correction described above because
the current module exports only `default`.

The current demo build reports 71 verbose UI5 `NG4011` findings. They include same-package and
cross-package references whose module does not export the exact named type. Examples in
`@ui5/webcomponents-base` include `ValueState`, `MovePlacement`, `Orientation`, and `SortOrder`;
those modules default-export their declarations, but the UI5 manifest does not name an importable
public export. Generic consumers should not need a cross-manifest export graph to reinterpret that
reference. Named public exports or directly importable reference names give every CEM consumer the
portable metadata it needs.

### Calcite: references do not match public exports

Calcite's manifest points many references at paths such as
`@esri/calcite-components/components/interfaces`, component-specific `interfaces` modules, and
internal utility/controller paths. Corresponding declaration files exist in the package, but the
export-map patterns route public component paths to component `index` files and do not expose these
file-style type modules. Angular therefore strips affected types and emits 31 `NG4011` warnings.

The element declaration paths themselves are public, so local references still receive the correct
component class type. Inline attribute unions also retain completion and static-value checking.
Calcite should either rewrite CEM references to public declaration modules or add more-specific
type-only export entries. A packed-package validation step should resolve every `type.references`
module through the package's actual export map. (Angular decision context 2026-07-17: Angular
respects `exports` maps as authored and will not probe unexported files — the physical
`dist/components/*.d.ts` layout is unreachable by design, so this upstream fix is the only path
to checked values for the affected references.)

### Fluent UI: private paths and false custom-element definitions

Fluent's CEM links element classes through paths such as
`@fluentui/web-components/dist/esm/button/button.js`, while the package exposes public paths such as
`./button/class.js`. This prevents Angular from validating element instance types and produces 42
`NG4011` warnings. The generator also emits `custom-element-definition` records whose names are base
class identifiers such as `BaseButton`, producing 19 invalid-tag `NG4009` warnings.

Properties backed by primitives are still checked, but values such as button `appearance`, `shape`,
and text-input `type` use named type spellings without references and accept arbitrary strings. The
manifest generator should be taught the package's public module mapping, exclude base declarations
from registration exports, and preserve named-type references or inline literal unions.

Editor-facing confirmation (2026-07-15 VSIX smoke test): `fluent-button` attribute hovers show the
descriptive type text (e.g. `ButtonAppearance | undefined`) but offer no literal-value tab
completions, while other integrated libraries do. Measured root cause: the Fluent manifest contains
**zero** `type.references` entries anywhere (and no manifest `exports` records for the option
types), so the check-type scanner rejects every named type at the reference-coverage step — exactly
the designed fail-closed path. The union values do ship on disk
(`dist/esm/button/button.options.d.ts`, `export type ButtonAppearance = ValuesOf<typeof
ButtonAppearance>` — Angular's semantic resolver would expand that to
`'primary' | 'outline' | 'subtle' | 'transparent'` if a reference pointed at it), but with no
reference there is nothing to resolve. The fix is purely upstream — emit standard
`type.references` (the stock `@custom-elements-manifest/analyzer` does this; Fluent's custom
generator does not), against module paths the export map actually exposes: Angular respects
`exports` maps as authored and does not recover declarations from unexported files (decision
2026-07-17).

### PatternFly: export-map discovery and named aliases

PatternFly's CEM content is structurally sound and its inline types produced strong diagnostics.
However, the package's export map exposes neither `.` nor `./custom-elements.json`; consequently,
the declared `customElements` target cannot be loaded through the bare package specifier. A direct
file path works for content checks but does not provide Angular with a package name for resolving
the element instance class, so local references fall back to `HTMLElement`.

An explicit `./custom-elements.json` export is the primary fix. Some values, including
`pf-v5-button`'s `variant`, also use an unreferenced named alias (`ButtonVariant`) and would benefit
from the same reference/inline-union improvements described for Spectrum.

Angular decision context (2026-07-17): Angular will not infer package ownership for path-loaded
manifests and will not add an opt-in ownership option — discovery through `customElements` /
`./custom-elements.json` is the standards-based contract. Exporting the manifest is therefore not
only a discoverability fix: it is the one change that restores bare-package loading and with it
element instance typing (`#ref` currently falls back to `HTMLElement` under path loading) for
every Angular consumer. Suggested outreach framing: "PatternFly declares `customElements` but the
export map blocks the package-specifier path every generic CEM consumer uses; adding
`"./custom-elements.json": "./custom-elements.json"` to `exports` makes the declared metadata
reachable."

### Lion: generator scope, discovery, and manifest size

Lion's export map similarly prevents its `customElements` target from resolving as a bare package.
The CEM itself is unusually large (5,797,856 bytes in `0.18.1`) because it includes test-suite
modules and even a dependency under `node_modules`. Those inputs produce two declarations for the
tag `choice-input`, identifier-like tag values such as `tagString` and `wrapperTagName`, and a
literal value that still includes backticks (`` `lion-input-range` ``). Angular reports three
`NG4009` invalid-tag warnings and one `NG4010` duplicate-tag warning.

The upstream generator should exclude tests and dependencies, validate every tag with the custom
element naming rules, remove source-code quoting from extracted literal values, and reject duplicate
tag ownership. Besides producing cleaner metadata, this would substantially reduce consumer parse
cost.

Angular decision context (2026-07-17): as with PatternFly, Angular will not infer package
ownership for path-loaded manifests, so Lion's export-map fix (exposing the `customElements`
target — an explicit `./custom-elements.json` export entry) is the change that restores
bare-package loading and element instance typing for Angular consumers; the demo's path-based
workaround permanently loses that package context by design.

The large file also exposed an Angular language-service robustness bug. TypeScript applies an
oversized-file policy above approximately 4 MB and can provide an empty snapshot for a closed JSON
resource. Angular now attaches the resource before querying its snapshot, reads closed resources
through the server filesystem, respects open editor buffers, and tracks content changes without
depending on the oversized snapshot. The full Lion manifest no longer triggers the internal
assertion. Shrinking Lion's CEM remains valuable because its unrelated declarations still add
parsing, diagnostics, and editor invalidation cost.

### Vaadin: no unexpected manifest defect

Vaadin's package loaded cleanly. The button manifest describes the directly declared `disabled`
member and lists mixins without flattening all inherited members. Angular correctly checks
`disabled` and types a local element reference as the Vaadin button class. It rejects unknown
property bindings that are not present in the manifest; static global/custom attributes remain
available through normal HTML rules. This matches the feature's documented no-mixin-resolution
boundary and does not currently suggest an upstream manifest correction.

### Nord: source paths instead of published output

Nord's manifest quality is otherwise among the best audited: 117 tags, inline literal unions for
essentially every enumerated property, and a declared type on all 116 events. However, every module
`path` names the repository source (`src/button/Button.ts`) rather than the published output. Angular
deliberately rejects `.ts`-suffixed specifiers because an unpublished source path is not a stable
public type entrypoint, so all 117 element modules lose instance typing and produce one `NG4011`
each.

The package ships complete declarations at `lib/src/<component>/<Class>.d.ts` (its `types` field is
`lib/src/index.d.ts`), so the fix is confined to the generator configuration: emit `lib/src/...js`
module paths. Event typing needs one further step: `NordEvent` is spelled without
`type.references`, so even with resolvable modules Angular would fall back to `Event` for `$event`.
The package has no `exports` map, which means corrected deep paths resolve without packaging
changes.

Separate runtime integration hazard (found 2026-07-15, browser smoke test): `@nordhealth/css`'s
`nord.min.css` ships an **unscoped** FOUC guard, `:not(:defined) { visibility: hidden }`. In a
mixed application this matches far more than Nord components: Angular component host elements are
hyphenated tags that are never registered with `customElements.define`, so `<app-root>` itself
matches and — `visibility` being inherited — the entire application renders invisible. Neither
unit tests (jsdom) nor the production build catch it; only a real browser render does. This demo
neutralizes it in `src/styles.scss` (a later same-specificity `visibility: inherit` override, plus
a re-scoped `nord-button:not(:defined)` guard). Upstream suggestion for Nord: scope the guard to
`nord-*` element names, or document that `@nordhealth/css` assumes a Nord-only page.

### Clarity Core: export map hides physically present declarations

Clarity publishes both a valid, discoverable CEM and complete per-module declaration files
(`button/button.element.d.ts` ships beside `button/button.element.js`). The manifest references
those exact modules, but the export map exposes only directory entry points such as
`./button` → `./button/index.js`. Angular's module resolution honors the export map, so all 68
element modules fail declaration resolution and instance typing is lost.

Two upstream options: add targeted type-only export entries for the referenced `*.element.js`
modules, or regenerate the manifest against exported subpaths. Clarity's generated type text also
needs quoting fixes: `loadingState` is published as `default | loading | success | error`, which is
not valid TypeScript (bare identifiers rather than string literals). Angular's scanner rejects it
and degrades to existence-only checking, so consumers silently lose a check the library intended to
provide.

Angular decision context (2026-07-17): Angular respects `exports` maps as authored and will not
recover declarations from unexported files, even when they demonstrably ship (a working fallback
prototype recovered all 68 references and was reverted on principle). The upstream export fix is
therefore the only path to instance typing for Clarity consumers of any standards-based CEM
tooling, which strengthens the case for this contribution.

### Runtime packaging notes from the gallery

These are integration observations rather than CEM-schema defects:

- Fluent's runtime requires `@microsoft/fast-element` and `@microsoft/focusgroup-polyfill`, which it
  declares as peer dependencies. This app installs both explicitly; without them, the Angular
  bundler cannot resolve Fluent's button implementation.
- PatternFly's button runs successfully, but its icon resolver uses a variable package import that
  Vite cannot statically analyze. The development server reports a dynamic-import warning even
  when the button does not request an icon.
- Red Hat Design System uses the same variable-import pattern for `rh-icon`. This app installs
  `@rhds/icons` transitively and statically maps the switch's `microns/checkmark` icon through the
  supported `RhIcon.resolve` hook; without that resolver, scrolling the lazy icon into view leaves
  a bare `@rhds/icons/...` specifier for the browser and fails at runtime under Vite.
- Calcite's runtime imports its package CSS from JavaScript. Browser builds work, while Node-based
  unit tests need to mock the runtime module unless the test runner is configured to transform CSS
  imported from external packages.

## Suggested upstream manifest checklist

Use this checklist when contributing to any project:

- The packed npm artifact contains valid JSON with `schemaVersion` and `modules`.
- `package.json.customElements` points to the packed file.
- The manifest is also exported explicitly when the package uses an `exports` map.
- Every element is connected to its public class declaration and registration tag.
- Every self-registering declaration with `tagName` has a matching
  `custom-element-definition` export.
- Property names preserve exact JavaScript casing; attributes use their actual HTML spelling.
- A field's `attribute` name also appears in the declaration's `attributes` array; consumers should
  not need to synthesize a missing attribute declaration.
- Non-inline named types have `type.references` that resolve to published declaration files.
- References used inside compound types include accurate `start` and `end` offsets.
- Named platform types such as `Event`, `CustomEvent`, `HTMLElement`, `Array`, and `Promise` have
  explicit `package: "global:"` references, with offsets when nested in compound type text.
- Literal string values remain discoverable for editor completion.
- Events include the schema-required trustworthy type, ideally `CustomEvent<Detail>` when
  applicable.
- Deprecated APIs and documentation are retained.
- CI validates the result from `npm pack`, not only an un-published build directory.
- A small consumer test verifies element, property, static value, event, and local-reference typing.

## Other checked projects with module-based CEMs

These do not need a basic “publish a CEM” contribution. The packages called out in the integration
audit above may still need packaging, generator, or type-fidelity corrections:

- `@shoelace-style/shoelace`
- `@ui5/webcomponents`
- `@vaadin/button` and other component packages
- Individual `@spectrum-web-components/*` component packages
- `@box-model/web`

`@cds/core` (Clarity Core) and `@nordhealth/components` also publish module-based CEMs, but the
2026-07-15 integration audit above moved them to the contribution candidates table for module-path
and export-map corrections.

## Scope boundary

Angular should continue to distinguish standards-based CEMs from similarly named JSON formats.
Accepting Stencil collection metadata or the legacy experimental `tags` format would be a separate
compatibility feature with weaker type and module guarantees. Upstream standards-based manifests
provide the more portable solution for Angular, editors, documentation tools, and other consumers.

This file does not track Angular implementation work. Completed Angular behavior is recorded in
[`angular-cem-implementation-summary.md`](./angular-cem-implementation-summary.md), and remaining
Angular compiler/language-service work is tracked in
[`2nd-pass-considerations.md`](./2nd-pass-considerations.md).
