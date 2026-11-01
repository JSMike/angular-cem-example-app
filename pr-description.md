## PR Checklist

Please check if your PR fulfills the following requirements:

- [x] The commit message follows our guidelines: https://github.com/angular/angular/blob/main/contributing-docs/commit-message-guidelines.md
- [x] Tests for the changes have been added (for bug fixes / features)
- [x] Docs have been added / updated (for bug fixes / features)

## PR Type

What kind of change does this PR introduce?

- [ ] Bugfix
- [x] Feature
- [ ] Code style update (formatting, local variables)
- [ ] Refactoring (no functional changes, no api changes)
- [ ] Build related changes
- [ ] CI related changes
- [ ] Documentation content changes
- [ ] angular.dev application / infrastructure changes
- [ ] Other... Please describe:

## What is the current behavior?

Web components are currently second-class citizens in Angular templates. Angular's built-in schema
mechanism, `CUSTOM_ELEMENTS_SCHEMA`, does not describe custom elements — it disables schema
checking for _every_ hyphenated tag name, so misspelled tags, unknown properties, invalid binding
values, and mistyped `$event` payloads all compile silently.

Angular does not currently consume the ecosystem-standard `custom-elements.json` metadata that
web component libraries publish. As a result, the compiler and Angular Language Service cannot
provide component-like template checking, completions, documentation, or event and local-reference
types for those elements.

Issue Number: #36893

Closes #36893

## What is the new behavior?

This PR adds an `angularCompilerOptions.customElementsManifests` option that ingests
[Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest)
(`custom-elements.json`) files — the ecosystem-standard machine-readable description that most
major web component libraries already publish — and integrates the declared elements into
Angular's template type-checking system. Custom elements described by a manifest are checked like
supported native elements: unknown tags and unknown bindings are diagnosed, binding _values_ and
`$event` are type-checked under strict templates, and the Angular Language Service offers
completions, hovers, documentation, and deprecation status for them. Applications using such
libraries no longer need `CUSTOM_ELEMENTS_SCHEMA` in AOT-compiled application templates.

```jsonc
// tsconfig.json
{
  "angularCompilerOptions": {
    "customElementsManifests": [
      "@shoelace-style/shoelace", // bare package (via package.json "customElements")
      "@my/lib/custom-elements.json", // module specifier of a .json inside a package
      "./manifests/local-custom-elements.json", // tsconfig-relative path
    ],
  },
}
```

Schema v1 and v2 manifests are supported. Angular is explicitly a projection reader: it strictly
validates the CEM records used for template checking without claiming whole-document JSON Schema
validation. An invalid semantic version or unknown major produces one summarizable NG4014 warning,
then Angular reads the known projection best-effort.

If a vendor manifest is defective, the option can point to a corrected manifest controlled by the
consumer instead. A relative replacement can use self-contained types or explicit
`package`/`module` references; a local workspace package can also provide package identity for
strictly typed local references. A corrected subset can intentionally precede the vendor manifest:
duplicate tags are first-wins, and the expected NG4010 names both configured entries. Relative
entries always resolve against the final project's tsconfig directory, including when the option
is inherited through `extends`.

Manifest warnings are **summarized per manifest by default** — a large design system with dozens
of affected declarations produces one warning with a count and examples rather than dozens of
lines. The companion option `customElementsManifestsDiagnostics: 'summary' | 'verbose'` restores
individual reporting; Angular CLI versions with the companion builder change also map
`--verbose` to it for one run. Errors are never summarized.

## Does this PR introduce a breaking change?

- [ ] Yes
- [x] No

The feature is opt-in. Projects that do not configure `customElementsManifests` retain their
existing compiler, runtime, schema, and Language Service behavior. `CUSTOM_ELEMENTS_SCHEMA` and
`NO_ERRORS_SCHEMA` remain available and retain their existing behavior. Configuring a manifest
intentionally enables stricter checking for the tags it declares.

## Other information

### Prior discussion

This feature was proposed in the talk **"Custom Elements Everywhere: The Lost Levels"**
at the Angular Enterprise Summit (March 19, 2026) and discussed there with Alex Rickabaugh @alxhub:
[proposal slide](https://angular-lost-levels.box-model.dev/14), with reproductions in
[JSMike/angular-custom-elements-lost-levels](https://github.com/JSMike/angular-custom-elements-lost-levels).
It is also a long-standing community ask:
[#12045](https://github.com/angular/angular/issues/12045) (custom schemas RFC, open since 2016),
[#36893](https://github.com/angular/angular/issues/36893) (Language Service integration with
`custom-elements.json`, resolved by this PR), and
[#58483](https://github.com/angular/angular/issues/58483) (typed element definitions);
[#36355](https://github.com/angular/angular/issues/36355) (exact property names) is fixed for
manifest-declared properties. A fuller issue-by-issue mapping is in
[`angular-cem-related-open-issues.md`](https://github.com/JSMike/angular-cem-example-app/blob/master/angular-cem-related-open-issues.md).

### What this enables

With a configured manifest, for its declared elements:

- **Existence checking** (any mode): unknown tags still produce NG8001; bindings to properties
  the manifest doesn't declare produce NG8002 with a manifest-aware message. `readonly` members
  are excluded (assigning to them can never work). Attribute-only declarations do not authorize
  same-named property bindings. A `custom-element-definition` export whose declaration cannot be
  resolved still registers its tag with a closed, empty member schema plus an NG4013 warning: the
  tag is recognized, but unknown bindings remain NG8002 errors. Applications that deliberately
  need permissive handling can opt into `CUSTOM_ELEMENTS_SCHEMA` separately.
- **Value checking** (strict templates): binding values are checked against the manifest's
  declared types when those types are trustworthy (see _Security model_) — primitives, literal
  unions, inline object types, and exact public types resolved through the manifest's
  `type.references` to the package's actual TypeScript declarations. Named globals require
  `package: 'global:'`. Static values are checked only for explicit string-literal unions; CEM
  does not define universal number or boolean attribute converters. Number and boolean property
  bindings remain fully typed.
- **Event typing** (strict templates): `$event` is typed from the manifest's event `type`;
  manifest events take precedence over colliding native events on that element, while directive
  outputs still win and `(window:…)`/`(document:…)` targets remain native.
- **Instance typing**: local template references (`#el`) retain the web component's class type
  instead of `HTMLElement` when the class is importable from the package's public API.
- **Language Service**: tag/property/attribute/event completions, literal-union value
  completions for static attributes, quick-info with the manifest's documentation, type text,
  default values, and deprecation strikethrough. Manifest load results are cached across the
  compiler instances the language service creates per edit (content-validated, including unsaved
  manifest and declaration editor buffers, referenced globals, and module-resolution inputs),
  keeping steady post-edit completion latency around a tenth of a second for multi-megabyte
  manifest sets instead of re-parsing them on every keystroke.
- **Exact property names at runtime**: property bindings on manifest-declared elements bypass
  the registry's HTML attribute→property remapping so the exact JavaScript property named by the
  manifest is set. Partial declarations that use this emit `minVersion: '22.1.0'`; the linker and
  runtime instruction signatures are extended backward-compatibly (a new optional trailing
  argument), so existing compiled output is unaffected.

Manifest metadata is compile-time-only. Components compiled at runtime — classic
Karma/webpack TestBed templates, templates introduced by `TestBed.overrideComponent`, and JIT
bootstrap — still need `CUSTOM_ELEMENTS_SCHEMA` when Angular's runtime checks cannot recognize the
custom element. Angular's modern Vitest builder AOT-compiles tests and uses the manifest normally.

When both a manifest and `CUSTOM_ELEMENTS_SCHEMA` are present, the manifest remains authoritative
for its own tags while the schema continues to cover other hyphenated tags — supporting
incremental migration.

### Reading guide

The feature commit decomposes into five layers, reviewable in this order. (They are
separable into a PR series if preferred — each layer is independently green — at the cost that
only the combination is meaningfully testable against real component libraries.)

1. **Data model + registry** (`packages/compiler/src/schema/custom_elements_manifest_schema.ts`,
   `dom_element_schema_registry.ts`): plain serializable schema types and an optional
   `DomElementSchemaRegistry` constructor argument that seeds custom-element entries from
   `[HTMLElement]`. No behavior change when unused; `@angular/compiler` stays free of file I/O.
2. **Manifest ingestion** (`packages/compiler-cli/src/ngtsc/custom_elements_manifest/`): resolver
   (three entry forms, resolved strictly through the project's module resolution), projection parser, the
   check-type validator (`check_type.ts` — the security boundary), and the loader that verifies
   every emitted type reference against the package's real TypeScript declarations, plus
   `NgCompiler` wiring, incremental-rebuild dependencies, and diagnostics NG4007–NG4014.
3. **Type-check block integration** (`packages/compiler/src/typecheck/ops/`,
   `packages/compiler-cli/src/ngtsc/typecheck/`): contextual assignments for property bindings
   and static attributes, `$event` parameter typing, instance-typed `document.createElement`
   casts, and manifest-aware NG8001/NG8002 messages.
4. **Runtime exact property names** (`packages/compiler/src/template/pipeline/`,
   `packages/core/src/render3/instructions/`, partial linker): the optional
   `exactDomPropertyName` argument on `property`/`twoWayProperty`, reified only for
   manifest-declared tags.
5. **Language Service** (`packages/language-service/`): completions, quick info, and the
   large-manifest resource handling.

### Security model

Manifest type text is untrusted input, and validated check types are spliced verbatim into
generated type-check code. The validation boundary is
`custom_elements_manifest/src/check_type.ts`, which only passes through text where **every
character and identifier is vetted**: a character whitelist (no statements, comments, escapes,
decorators, or template interpolation), an identifier whitelist limited to TypeScript type
keywords, exact-coverage substitution of named types via the manifest's
`type.references` into `import("<pkg>").Name` queries, and a final parse proving the result is
exactly one syntactically valid type. Anything else fails closed to existence-only checking and
produces a bounded NG4013 warning. The loader then additionally verifies that every emitted
`import()` specifier resolves to real
TypeScript declarations that export the referenced name as a type — so generated code never
contains an unvalidated or unresolvable reference. Relaxing any of these rules is called out in
the code as requiring security review. Named platform and default-library types are not guessed:
they require an explicit `type.references` entry with `package: "global:"`.

Same-package module paths first resolve package-relative. If that fails, Angular tries the path
relative to the manifest directory because the CEM schema identifies a module path but does not
unambiguously define its base for a manifest published below the package root. Both paths still go
through normal module resolution and exact export validation.

### Diagnostics

Narrow, fail-closed recovery so one bad declaration never erases unrelated valid schemas:

| Code   | Category | Meaning / recovery                                                                                                                                                    |
| :----- | :------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NG4007 | Error    | Manifest entry cannot be resolved/read. Entry skipped; other entries load.                                                                                            |
| NG4008 | Error    | Resolved file is not valid JSON / not a manifest. File contributes nothing; others load.                                                                              |
| NG4009 | Warning  | Invalid custom-element tag declaration skipped; rest of the manifest remains usable.                                                                                  |
| NG4010 | Warning  | Duplicate tag (within or across manifests) skipped; first declaration wins, mirroring `customElements.define`.                                                        |
| NG4011 | Warning  | A type reference doesn't resolve to usable TypeScript declarations; only dependent check types are stripped (existence checks remain).                                |
| NG4012 | Error    | The option is not an array of non-empty strings; no manifests load until corrected.                                                                                   |
| NG4013 | Warning  | Declared type metadata cannot be safely used or element-instance export selection is ambiguous; the declaration remains known and affected checks use safe fallbacks. |
| NG4014 | Warning  | Consumed CEM records are structurally inconsistent; Angular applies the narrow local fallback and keeps unrelated valid metadata.                                     |

Within a manifest, a declaration may own only one tag and registration is first-wins. Its single
matching home-module definition export may refine a bare `tagName` seed without warning; later
same-tag definitions produce NG4010, while a conflicting second tag produces NG4014. Duplicate
diagnostics identify both the retained and ignored registration origins. Across manifests, the
configured array order remains authoritative and NG4010 identifies both entries.

### Validation against real libraries

A public
[reproduction and review harness](https://github.com/JSMike/angular-cem-example-app#readme)
contains the complete setup and verification workflow: building the
[`custom-elements-manifest-support`](https://github.com/JSMike/angular/tree/custom-elements-manifest-support)
fork, installing its snapshot packages, running compiler/build/test checks, and manually reviewing
the locally built VS Code extension. It also documents the optional, separately scoped
[`cem-cli-followups`](https://github.com/JSMike/angular-cli/tree/cem-cli-followups) workflow.

The harness integrates **seventeen manifests** covering twelve published design systems —
Shoelace, Vaadin, UI5, Fluent UI, Calcite, Adobe Spectrum, Nord, Clarity, Red Hat Design System (the
first CEM v2.1 producer), Auro, PatternFly, and Material Web — plus the published `@box-model/web`
package, focused hand-written Lion, Material Web, and Spectrum button manifests, and a
consumer-authored local workspace package. Results:

- 0 errors; diagnostics identify real producer defects and declared type forms outside Angular's
  deliberately narrow safe-emission boundary (unshipped `src/*.ts` module paths, missing exports,
  cross-package references, unreferenced named types, and unsupported function/qualified types).
  Each degrades exactly as designed: affected types fall back to existence-only checking, nothing
  crashes, and no false errors reach templates. Default (summary) output: 25 CEM warnings; verbose
  diagnostics: 1,802 individually itemized (19 NG4009 + 330 NG4011 + 1,153 NG4013 +
  300 NG4014). Repeated definition records for the same declaration/tag identity are deduplicated;
  genuinely conflicting registrations retain deterministic first-wins behavior. Notably,
  Auro's manifest — whose module paths all name unpublished `src/*.js` sources but whose declared
  types are self-contained primitives — degrades to two bounded warnings: instance types fall back
  to `HTMLElement`, and the missing definition export is reported, while every declared property
  and property-binding value check remains active.
- Type references use the exact public export named by each CEM reference; Angular does not repair
  a missing name by guessing an alias or `default` export. Element-instance identity is separate:
  its order-independent export selection can use a sole unambiguous alias/default, and when one
  declaration is re-exported exact-name from both its own module and a sibling barrel (the Red Hat
  Design System pattern), the declaration's own home module is the authoritative tiebreak. This
  recovers real local-reference types without reinterpreting `type.references`.
- Package `exports` maps are respected as authored: a manifest reference whose module the export
  map does not expose stays existence-only even when a declaration file physically ships inside
  the package (measured at 141 references across Clarity, Calcite, and Fluent in this gallery).
  This is a deliberate standards-first decision — recovering types from files a package does not
  publicly export would build on packaging the author never committed to. The root causes are
  library packaging defects with small fixes, tracked separately as candidate upstream
  contributions.
- Nonconforming metadata is likewise not compensated for: an index-less `type.reference` is
  honored only in the specification's whole-text form, so references nested in compound type
  text without exact `start`/`end` indices — a common pattern in UI5's generator output (139 in
  this gallery) — fail closed with NG4013 rather than being recovered heuristically. Producer
  conformance fixes are tracked upstream. A whole-text reference remains structurally valid, but
  still requires the exact named public export; UI5's `ButtonDesign` currently points at a module
  that exports only `default`, so its property check also fails closed while the separate static
  string-literal attribute union remains strict.
- Published type text that the safe validator cannot use (e.g. Clarity's unquoted
  `default | loading | success | error`) is rejected with a bounded NG4013 warning and degrades to
  existence-only checking. A corrected consumer-controlled manifest can replace the vendor entry;
  Angular does not silently substitute `.d.ts` types for defective CEM metadata.
- Positive checks across the gallery confirmed invalid string-union static values, invalid property
  bindings, unknown properties, unknown tags, kebab/camel attribute-property mapping, `$event`
  typing where references are complete, literal-union completions, and instance-typed local
  references. Static number/boolean spellings are deliberately converter-agnostic; equivalent
  property bindings retain strict `number`/`boolean` checking.
- The clean local workspace package proves the consumer-authored escape hatch end to end: its bare
  package entry is discovered through `package.json#customElements`, its literal-union property is
  checked, and its template local reference resolves to the package's exported element class.
- App-owned path manifests prove both remaining consumer workflows: Material Web gains strict
  checking despite publishing no CEM, while a focused Spectrum button projection replaces vendor
  named unions that otherwise degrade to existence-only checking. The replacement recovers
  `variant`/`treatment` value checks and removes ten vendor metadata warnings from the gallery.

### Testing

- Unit: manifest parser (including a schema-v2 fixture covering v2 declaration shapes),
  check-type validator (security matrix:
  injection attempts, span mismatches, qualified names, index-less references), loader
  (resolution forms, stripping, diagnostics), registry.
- TCB golden tests where the emitted form is the contract (interpolation `as string`
  materialization, symbol-shim emission for the Language Service, exact-name emission).
- Integration: template type-check diagnostics (value/event/instance/attribute checking, flag
  opt-outs, precedence rules), NgCompiler manifest reload/incremental tests, HMR, linker.
- Language Service: completions, quick info, diagnostics, editor resource-change reload, a
  manifest larger than the TypeScript server file limit, and cross-compiler manifest-cache
  behavior (reuse identity; manifest creation, content, and deletion; entry order; compiler
  options; ambient globals; declaration/export and failed-lookup changes; custom-resolver bypass;
  diagnostics-mode isolation).
- Regression coverage also pins explicit-attribute type authority, one-declaration/one-tag
  registration, malformed consumed shapes, schema-version projection, exact LS property versus
  attribute quick info, `on*` rejection, and manifest-only full/partial emit updates.

### Out of scope / known follow-ups

Inheritance and mixin expansion are intentionally out of scope, matching the adev docs: inherited
members are recognized only when the manifest lists them on the custom element's own declaration
(as manifests produced by the Custom Elements Manifest analyzer do); `superclass` and `mixins`
references are not resolved. Spectrum's inherited `disabled` — absent from `sp-button`'s own
declaration — is the live example in the demo gallery, which binds the declared `pending` member
instead. CEM `slots`, `cssParts`, and `cssProperties` describe styling and composition surfaces
that have no Angular template-type-checking counterpart, so they are ignored.

`CUSTOM_ELEMENTS_SCHEMA` behavior is unchanged. Known follow-up work is tracked separately from
this PR. The remaining items are separable diagnostics, i18n, and metadata follow-ups rather than
correctness blockers for manifest ingestion. Export-map-hidden
declarations, package ownership for path-loaded manifests, and cross-manifest export mapping are
deliberately **not** follow-up work: all are resolved upstream by the affected libraries
publishing what their manifests reference, per the standards-first decisions exercised by the
public review harness.

**Design detail worth reviewer input — manifest-owned `on*` properties.** Angular currently rejects
every case-insensitive `on*` property binding before consulting the element schema, preserving the
DOM event-property XSS guard. This means a standards-valid field such as Auro's `onDark` cannot be
bound as `[onDark]`, although its `ondark` attribute and `[attr.ondark]` remain available. The
pre-PR contract documents and pins that behavior instead of weakening the security check. A future
change could consult exact manifest/schema ownership before the broad heuristic while continuing
to reject exact lower-case native handler properties, but that design requires framework security
review.

**Known limitation — i18n-marked exact property names.** The normal template pipeline preserves
exact manifest property names. The i18n attribute opcode currently calls the shared property setter
without the exact-name flag, so a translated interpolated property such as `i18n-for` can be
remapped to `htmlFor` at runtime. This is an existing narrow i18n opcode gap; it is documented for
the initial feature and should be fixed by threading the exact-name decision through those opcodes.

**Design detail worth reviewer input — navigable manifest diagnostics.** Manifest diagnostics
currently travel the file-less compiler-options channel, so editors cannot jump to the defective
manifest entry. Measurement rejected retaining offset JSON ASTs (~11× manifest size in steady
heap; 61 MB for one 5.5 MB manifest), so the planned follow-up computes spans by a lazy one-shot
re-parse and delivers navigation as LSP `DiagnosticRelatedInformation` — a clickable
file:line link into `custom-elements.json` attached to the existing diagnostic, rather than
publishing squiggles into a JSON document the Angular language server does not own (which would
take on cross-server diagnostic lifecycle for that file, and has no delivery vehicle at all in
the pull model). We consider the related-information link good enough for now; if reviewers
prefer in-file squiggles, that ownership/lifecycle question should be settled before the
diagnostic API shape is committed.

Two-way binding on a custom element retains Angular's existing DOM semantics. A manually written
`[(value)]="value"` listens for `valueChange` and assigns `$event` directly to `value`. This is the
same behavior custom elements have under `CUSTOM_ELEMENTS_SCHEMA`: most web components do not emit
an Angular-style `valueChange` event, and a DOM `CustomEvent` supplies the event object rather than
its `detail` payload. CEM support does not introduce or conceal this limitation—the Language
Service deliberately does not offer two-way completions for manifest properties. Use separate
property and event bindings to extract the component's documented event payload. A possible
general custom-element diagnostic belongs in follow-up work rather than this manifest-ingestion
PR.

**Companion Angular CLI PR:** the Angular CLI half of the diagnostics UX ships separately — the
application builder maps `--verbose` to `customElementsManifestsDiagnostics: 'verbose'`, and watch
rebuilds suppress unchanged manifest warnings. This PR is fully functional without it (the
compiler option is authoritative); the adev docs qualify the CLI shortcut accordingly. The
implementation is available for testing on the
[`cem-cli-followups`](https://github.com/JSMike/angular-cli/tree/cem-cli-followups) branch as
separate
[`feat(@angular/build)`](https://github.com/JSMike/angular-cli/commit/c72ba5f7329f0534a523cd8222d99590dbbffb30)
and
[`fix(@angular/build)`](https://github.com/JSMike/angular-cli/commit/754915a7e4acb4f9d03f5a577431ab9a63419e5d)
commits. Its pull request should wait until this framework feature is accepted. The pre-existing
same-build `--verbose` double-print remains a separate CLI issue and is not changed by either
commit.

---

### Commits

The implementation and the compliance coverage requested during review are separate commits:

1. [`feat(compiler): type-check web components via Custom Elements Manifests`](https://github.com/JSMike/angular/commit/541af79df2a170ec8776c5b45c40a2ae02176794)
2. [`test(compiler-cli): cover CEM property code generation`](https://github.com/JSMike/angular/commit/3158cb72ad66ccd59c2cbad11a539f99b0da21cd)

_(Scope note: the change spans `compiler`, `compiler-cli`, `core`, and `language-service`;
`feat(compiler)` identifies template compilation as the primary user-facing change.)_
