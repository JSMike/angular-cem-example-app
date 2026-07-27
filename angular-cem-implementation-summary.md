# Angular Custom Elements Manifest implementation summary

Updated: 2026-07-26

This document records the completed initial-PR work for Angular's
`angularCompilerOptions.customElementsManifests` feature. The Angular implementation is in
`../angular`; this repository is the real-package integration application used to validate the
locally built compiler and language service.

This public summary focuses on the implementation and reproducible integration results.
Project-management notes and draft upstream materials are intentionally outside the scope of the
published repository.

## Feature outcome

The feature makes configured custom elements participate in Angular template checking without
using `CUSTOM_ELEMENTS_SCHEMA` as a blanket suppression mechanism. Manifest-backed tags receive:

- element and property existence checking;
- property-binding assignability checks and static string-literal-union validation;
- finite string-value completions;
- manifest documentation and type spelling in completions and quick info;
- validated custom-event payload types;
- typed local references when the element class can be resolved; and
- exact custom-element property names in generated code, while native DOM mappings and sanitization
  remain unchanged.

## Completed hardening

### Large language-service resources

Closed resources are read through the language-server filesystem rather than relying on
TypeScript's intentionally empty oversized-file snapshot. Open resources still use their
`ScriptInfo` snapshot so unsaved editor content wins. Resource versioning covers same-size edits,
deletion, and recreation; the language-service regression uses a valid manifest above 4 MB and real
file-watcher events. An absent configured relative manifest is recorded without being read as an
empty resource, preserving `NG4007`; creating it later triggers a resource-only compilation that
refreshes option diagnostics, template checks, and completions without a TypeScript edit.

### Safe check-type retention

The check-type scanner distinguishes exact `PropertySignature` name spans from type-reference
positions, allowing inline object types such as `{value: string}` without weakening the character
allowlist. Methods, index signatures, computed names, qualified names, uncovered type identifiers,
and malformed references continue to fail closed. Every named type occurrence, including
`CustomEvent`, `Event`, `Array`, and other platform/default-library types, requires an exact CEM
reference; globals use `package: "global:"`.

Index-less references are accepted only in the CEM specification's whole-text form. Nested names
inside compound type text require exact `start`/`end` coverage. Final AST, module, export, and
global-type validation remains the authority before a type reaches a template type-check block.
Referenced package identities must be safe scoped or unscoped npm-like names; relative/dot-like
identities such as `.`, `..`, `...`, and `@scope/.` fail closed before an import type can be emitted.

### Element-instance export mapping

`type.references` use the exact public export name and module recorded by the producer. Angular
does not reinterpret an unresolved reference as an alias or `default` export. Declaration-to-export
mapping is retained only for deriving the custom element's instance type, where the CEM declaration
identity is the available input and one public class export must be selected.

When the same declaration is exported exact-name from both its own module and one or more sibling
barrels, the declaration's home module is the authoritative tiebreak. This is not an alias guess:
all candidates refer to the same declaration identity, the candidate set is deduplicated by export
name and containing module, and selection still fails closed when no home-module candidate exists.
The loader continues to verify that the selected module resolves to TypeScript declarations and
actually exports the named type. This recovers four Red Hat Design System element instance types;
checked-in parser and template integration tests cover positive selection, all-barrel ambiguity,
and the resulting local-reference class type.

Same-package module paths first resolve package-relative and then, if necessary, relative to the
manifest directory. The fallback is retained because the CEM schema does not unambiguously define
the base for module paths in a nested published manifest; both candidates still use normal module
resolution and exact export validation.

### Event typing and editor symbols

Manifest event types take precedence over inherited native events after validation. Angular
directive outputs still win, unresolved manifest types fall back to native inference, and global
targets such as `window` and `document` remain native.

Directly typed manifest events do not use the native listener call that normally supplies editor
symbol metadata. The TCB therefore emits a source-mapped, non-invoked
`document.addEventListener;` access for language-service lookup while retaining the explicit
manifest type as the checking authority. This statement is type-check metadata only and does not
become application runtime code.

### Static attributes and incomplete definitions

Static attribute values are checked only for explicit string-literal unions. CEM describes a
deserialized property type but does not standardize a number or boolean converter, and custom
element libraries can replace their converters. Number and boolean type metadata remains visible
in editor tooling, while `[numberProperty]` and `[booleanProperty]` bindings keep full TypeScript
checking.

A definition export whose declaration is unavailable registers a known tag with a closed, empty
member schema. It does not silently recreate `CUSTOM_ELEMENTS_SCHEMA` for one tag: unknown
properties remain NG8002 errors. A matching self-registering declaration/definition export,
required event type, and declared field/attribute relationship are consumed with narrow NG4014
warnings when inconsistent; missing records are not synthesized.

### Diagnostic and code-generation contracts

Tests and public documentation lock the `NG4007`–`NG4014` severity and recovery model:

| Code     | Severity | Recovery                                                                     |
| -------- | -------- | ---------------------------------------------------------------------------- |
| `NG4007` | Error    | Skip an unresolved or unreadable configured entry.                           |
| `NG4008` | Error    | Load no schemas from an invalid JSON/root manifest.                          |
| `NG4009` | Warning  | Skip only the invalid custom-element declaration.                            |
| `NG4010` | Warning  | Retain the first declaration for a duplicate normalized tag.                 |
| `NG4011` | Warning  | Strip only check types that depend on unusable declared references.          |
| `NG4012` | Error    | Reject an invalid `customElementsManifests` option value.                    |
| `NG4013` | Warning  | Retain declarations but report type metadata the safe validator cannot use.  |
| `NG4014` | Warning  | Retain unrelated valid metadata while applying a narrow structural fallback. |

Rejected type text remains descriptive metadata for editor display and degrades to existence-only
checking, but the loss of precision is now visible through bounded NG4013 summary/verbose
diagnostics. This includes named types without usable references and ambiguous element-instance
export mappings. Structural inconsistencies such as missing event types, missing definition
exports, and field/attribute relationship mismatches are summarized under NG4014 by default and
expanded in verbose mode. Manifest precision intentionally overrides `CUSTOM_ELEMENTS_SCHEMA` for
tags declared by the manifest; `NO_ERRORS_SCHEMA` remains the explicit all-suppression option.

An explicit attribute `type` is authoritative over a related field's type. If that explicit type
is unusable, Angular reports NG4013 and drops only the attribute-value check instead of retaining a
stale field-derived check type; the related property remains independently strict. Consumed member
flags and field/attribute relationships are validated narrowly and fail closed with NG4014.

Within a manifest, one declaration can own only one tag. The declaration's matching home-module
definition may refine its `tagName` seed once; subsequent same-tag definitions produce NG4010 and
a conflicting second tag produces NG4014. Registration is first-wins within a manifest and across
configured entries, and duplicate messages identify both the retained and ignored origins.

Angular accepts schema versions 1.x and 2.x. It is explicitly a projection reader rather than a
whole-document JSON Schema validator: an invalid semantic version or unknown major produces a
summarizable NG4014 warning, after which the known projection is read best-effort.

Normal and HMR compilation are covered for exact manifest property names. Native property mapping,
HTML sanitization, partial declarations/linking, and runtime instruction compatibility remain
preserved. Partial declarations carrying custom-element property metadata require linker version
22.1.0, the release that introduces that metadata.

## Real-package results

An earlier focused hardening comparison (before the full gallery and NG4013 producer feedback were
enabled) reduced clean manifest diagnostics as follows:

| Scope               | Before       | After       |
| ------------------- | ------------ | ----------- |
| All configured CEMs | 163 warnings | 97 warnings |
| `NG4011`            | 144          | 78          |
| Fluent `NG4009`     | 19           | 19          |
| UI5 `NG4011`        | 71           | 5           |
| Calcite `NG4011`    | 31           | 31          |
| Fluent `NG4011`     | 42           | 42          |

UI5 validates static `design="Emphasized"` through its separate string-literal attribute union.
Its property reference names `ButtonDesign`, but the referenced module exports only `default`, so
exact-reference validation emits `NG4011` rather than guessing a different export. Its `click`
event declares `CustomEvent<ButtonClickEventDetail>` with an index-less reference nested in
compound text, which is nonconforming — Angular's earlier unique-occurrence compatibility rule was
removed by decision on 2026-07-17, so these references (103 events, 36 fields) fail closed with
`NG4013` and `$event` stays native until UI5 emits exact offsets and explicit global references.

With the current seventeen-manifest gallery, verbose mode reports 1,802 individually itemized CEM
problems: 19 NG4009, 330 NG4011, 1,153 NG4013, and 300 NG4014. Default mode folds them
into 25 per-manifest/per-kind summaries, with zero errors and a successful production build.
Definition records that repeat the same declaration/tag identity are deduplicated before duplicate
registration diagnostics; conflicting registrations still use deterministic first-wins handling.
References
whose modules are hidden by package `exports` maps deliberately stay existence-only even when
declaration files physically ship in the package (a standards-first decision, 2026-07-17: a
working fallback prototype was reverted in favor of requiring affected libraries to expose the
declarations their manifests reference). The gallery
covers twelve published design systems, the local `@box-model/web` package, focused hand-written
Lion, Material Web, and Spectrum button manifests, and the in-repo
`@local/cem-workspace-example` package. Material Web demonstrates adding local metadata for a
package that ships none; the Spectrum projection replaces unusable named unions with exact public
declaration unions. The workspace package is a clean end-to-end example of consumer-authored
bare-package discovery, literal-union property checking, and class-typed local references.
`@aurodesignsystem/auro-button` is the compact
example of unpublished `src/` module paths: its declared types are all self-contained primitives,
so the manifest emits one NG4011 (instance types fall back to `HTMLElement`) and one NG4014 (the
required definition export is absent), while declared property and property-binding checks remain
active.

The full 5,797,856-byte Lion manifest also compiles without the previous language-service
assertion. A cold `ngc` comparison measured 2.09 seconds and 570,080 KB peak RSS with the full
manifest versus 2.12 seconds and 548,712 KB with the focused projection. The elapsed-time difference
is noise at this sample size; the roughly 21 MB memory increase is directionally useful. The full
manifest adds its expected three `NG4009` and one `NG4010` producer warnings, so the focused
`lion-button` projection remains the normal demo configuration.

The integration results above describe the observable consumer impact. Detailed upstream
contribution planning is intentionally outside the scope of this public repository.

## Verification completed

The final run used locally built Angular packages installed in this application. The installed
compiler version was `22.1.0-next.5+sha-d997a96-with-local-changes`.

Passing verification included:

- Angular package build;
- full Custom Elements Manifest parser/loader tests;
- full compiler type-check tests;
- full `ngtsc` integration tests, including HMR coverage;
- full Angular language-service tests;
- compiler core tests;
- freshly packaged Angular language-service VSIX;
- demo `ngc --noEmit`;
- demo development and production builds; and
- all eight demo Vitest tests.

The language-service performance harness measured a 4.15-second cold start, approximately
1-millisecond unchanged warm requests, 97–167 millisecond TypeScript-edit requests, and
103–152 millisecond external-template edit requests with the full configured set.

Prettier and `git diff --check` also passed in both repositories.

## Manual editor checkpoint completed

The automated language-service coverage, performance smoke test, and packaged VSIX are green. The
Windows/WSL editor smoke test was also completed successfully with the locally packaged extension.
Future reviewers can reproduce it from WSL:

```bash
code --install-extension ../angular/dist/bin/vscode-ng-language-service/ng-template.vsix --force
```

Reload VS Code and run **Angular: Restart Angular Language Server**, then confirm:

- Ctrl+Space in `<tag-box variant="">` offers `neutral`, `info`, `success`, `warning`, and `danger`;
- an invalid static `variant` reports an error;
- Ctrl+Space in the app-owned Spectrum `<sp-button variant="">` projection offers the finite
  `ButtonVariants` values, and an invalid value reports an error;
- Ctrl+Space in the app-owned Material `<md-filled-button target="">` projection offers `_blank`,
  `_parent`, `_self`, and `_top`, and an invalid value reports an error;
- UI5 `design=""` offers the serialized attribute values;
- `[design]="ui5ButtonDesign"` uses a safe fallback because the manifest names an export the
  referenced module does not provide; and
- hovering UI5 `(click)`/`$event` shows manifest documentation with the native event fallback
  because the nested payload reference lacks exact spans and an explicit global reference.

The built artifact is `../angular/dist/bin/vscode-ng-language-service/ng-template.vsix`.

## PR communication notes

Call out these details explicitly in the commit message or PR description:

- configuring a manifest can surface errors that `CUSTOM_ELEMENTS_SCHEMA` previously suppressed;
- index-less `type.references` are honored only in the specification's whole-text form; nested
  occurrences require exact `start`/`end` indices (a unique-occurrence compatibility extension
  was removed by decision — producer conformance fixes belong upstream);
- JavaScript export records in modules without the CEM-required string `path` are skipped rather
  than recovered by declaration name alone;
- ambiguous export aliases fail closed to existence-only checking;
- the non-invoked `document.addEventListener;` TCB statement exists solely for language-service
  event-symbol metadata; and
- interpolation serializes to string and handwritten Angular-style two-way bindings can still be
  ineffective for web components, as documented.
