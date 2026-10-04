# Angular Custom Elements Manifest implementation summary

Updated: 2026-09-29

This document records the work on Angular's `angularCompilerOptions.customElementsManifests`
feature for its first pull request. The implementation is in `../angular`. This repository is the
application used to test the locally built compiler and Language Service against published
libraries.

It covers the implementation and results that anyone can reproduce. Project planning notes and
draft upstream material are not part of this public repository.

## What the feature does

Custom elements declared in configured manifests are checked in templates without
`CUSTOM_ELEMENTS_SCHEMA`, which turns off checks for every tag that contains a dash. For those
elements, Angular provides:

- checks that the element and its properties exist;
- type checks for property bindings, and for static attributes typed as unions of string literals;
- completions for those string values;
- manifest documentation and type text in completions and quick info;
- `$event` types for custom events;
- local references typed as the element class, when the class resolves; and
- exact manifest property names in generated code. Native DOM name mapping and sanitization are
  unchanged for other properties.

## Hardening work

### Large Language Service resources

TypeScript leaves the snapshot of a non-TypeScript file over 4 MB empty, so the Language Service
reads closed resources of that size from disk. Open resources still use their snapshot, so unsaved
edits count. Resource versions detect same-size edits, deletion, and recreation. The Language
Service regression test uses a valid manifest over 4 MB and real file-watcher events. A configured
relative manifest that doesn't exist is recorded without reading it as an empty file, so it keeps
reporting `NG4007`. Creating it later triggers a resource-only compilation that updates option
diagnostics, template checks, and completions without a TypeScript edit.

### Which type text is used for checks

The type-text scanner tells object property names apart from type names, so inline object types
such as `{value: string}` are allowed without loosening the allowed characters. Methods, index
signatures, computed names, qualified names, names without a reference, and malformed references
are still rejected. Every name in type text needs an exact CEM reference, including `CustomEvent`,
`Event`, `Array`, and other platform and library types; globals use `package: "global:"`.

A reference without offsets is accepted only when it names the whole type text, as the CEM schema
specifies. A name inside a larger type needs exact `start` and `end` offsets. Before a type reaches
a template type-check block, Angular also checks that it parses, that its modules and exports
resolve, and that its global types exist. Package names in references must be valid npm package
names; `.`, `..`, `...`, and `@scope/.` are rejected before any import type is generated.

### Finding the element class to import

`type.references` use the exact export name and module that the manifest records. Angular doesn't
treat an unresolved reference as an alias or a `default` export. Angular maps declarations to exports
only to find the class for local references, because the manifest identifies the element by its
declaration and Angular needs one export to import.

When a declaration's own module and one or more barrel modules all export the class under its
declared name, Angular uses the declaration's own module. All candidates export the same
declaration, candidates are deduplicated by export name and module, and when the declaration's own
module isn't among them Angular picks none. Angular still checks that the chosen module resolves to
TypeScript declarations and exports the named type. This types local references for four Red Hat
Design System elements. Parser and template tests cover the chosen export, the case where only
barrels export the class, and the resulting local-reference type.

For a module in the manifest's own package, Angular resolves the path from the package root first,
then from the manifest's directory. The CEM schema doesn't say which base a nested manifest's module
paths use, so both are tried; each still uses normal module resolution and exact export checks.

### Event types and editor symbols

After validation, a manifest event's type is used instead of a native event with the same name.
Angular directive outputs still take precedence, unresolved manifest types fall back to native event
types, and targeted events such as `(window:click)` stay native.

An event typed from the manifest doesn't go through the `addEventListener` call that normally gives
the editor its event symbol. The type-check block therefore contains a source-mapped
`document.addEventListener;` expression that isn't called, for the Language Service to find. It
exists only in type-checking code, not in application code.

### Static attributes and incomplete definitions

Static attribute values are checked only against unions of string literals. CEM describes the
property's type, but doesn't define how attribute strings convert to numbers or booleans, and
libraries can use their own converters. Number and boolean types still appear in the editor, and
`[numberProperty]` and `[booleanProperty]` bindings are fully type-checked.

A definition export whose declaration isn't in the manifest registers a known tag with no custom
properties. Angular doesn't treat that tag as if `CUSTOM_ELEMENTS_SCHEMA` applied: bindings to
unknown properties are still `NG8002` errors. When a declaration is registered with a second tag,
or a field and its attribute don't link to each other, Angular reports `NG4014` and doesn't add the
missing records.

### Diagnostics and generated code

Tests and the documentation define how each diagnostic is reported and what Angular does next:

| Code     | Severity | What Angular does                                                                           |
| -------- | -------- | ------------------------------------------------------------------------------------------- |
| `NG4007` | Error    | Skips an entry that doesn't resolve or can't be read.                                       |
| `NG4008` | Error    | Loads nothing from a file that isn't valid JSON or isn't a manifest object.                 |
| `NG4009` | Warning  | Skips only the declaration with the invalid tag name.                                       |
| `NG4010` | Warning  | Uses the first declaration of a tag.                                                        |
| `NG4011` | Warning  | Skips only the type checks that depend on the unresolved reference.                         |
| `NG4012` | Error    | Rejects an invalid `customElementsManifests` or `customElementsManifestsDiagnostics` value. |
| `NG4013` | Warning  | Keeps the declaration and skips the type checks that depend on type metadata it can't use.  |
| `NG4014` | Warning  | Keeps the other records and doesn't add missing ones.                                       |

Rejected type text is still shown in the editor, and Angular skips only the checks that need it.
`NG4013` makes this visible, as one summary per manifest by default or one warning per problem in
verbose mode. This includes names without usable references and classes with more than one export.
Inconsistent records, such as fields and attributes that don't link up, are summarized under
`NG4014` the same way. A manifest's
declarations take precedence over `CUSTOM_ELEMENTS_SCHEMA` for its tags; `NO_ERRORS_SCHEMA` still
turns off all schema checks.

An attribute's own `type` takes precedence over the type of its linked field. If that type is
unusable, Angular reports `NG4013` and doesn't check the attribute's static values, rather than
falling back to the field's type; the linked property is still checked. Invalid member flags and
field and attribute links are reported as `NG4014`, and Angular doesn't use them.

Within a manifest, a declaration can have only one tag. A matching definition export in the
declaration's own module can refine its `tagName` once; later definitions of the same tag produce
`NG4010`, and a second, different tag produces `NG4014`. The first registration of a tag wins within
a manifest and across entries, and duplicate warnings name both registrations.

Angular accepts schema versions 1.x and 2.x. It reads only the records it uses, and doesn't validate
the whole file against the CEM JSON schema. A `schemaVersion` with another major version produces an
`NG4014` warning, and Angular still reads the records it recognizes.

Tests cover exact manifest property names in normal and HMR compilation. Native property mapping,
HTML sanitization, partial declarations and linking, and existing runtime instruction calls are
unchanged. Partial declarations that carry manifest property names require linker 22.3.0, the first
release that reads them.

## Results against published libraries

An earlier comparison, before the full gallery and the `NG4013` warnings were added, reduced the
manifest warnings as follows:

| Scope               | Before       | After       |
| ------------------- | ------------ | ----------- |
| All configured CEMs | 163 warnings | 97 warnings |
| `NG4011`            | 144          | 78          |
| Fluent `NG4009`     | 19           | 19          |
| UI5 `NG4011`        | 71           | 5           |
| Calcite `NG4011`    | 31           | 31          |
| Fluent `NG4011`     | 42           | 42          |

UI5 checks static `design="Emphasized"` values through a separate attribute typed as a union of
string literals. Its property's reference names `ButtonDesign`, but the referenced module only has a
`default` export, so Angular reports `NG4011` rather than guessing another export. Its `click` event
declares `CustomEvent<ButtonClickEventDetail>` with a reference that has no offsets inside a larger
type, which the CEM schema doesn't allow. Angular used to accept a reference like this when the name
appeared only once, but that rule was removed on 2026-07-17. These references (103 events and 36
fields) now produce `NG4013`, and `$event` keeps its native type until UI5 emits exact offsets and
`global:` references.

With the seventeen manifests and Angular `22.3.0-next.0+sha-e730eba`, verified on 2026-10-03,
verbose mode lists 1,636 problems: 19 `NG4009`, 134 `NG4010`, 330 `NG4011`, and 1,153 `NG4013`.
Summary mode reports them as 20 warnings, with no errors and a successful production build. The
previous baseline, 28 warnings and 1,936 problems, also had 300 `NG4014` warnings for records that
don't affect checking, such as missing definition exports and events without a `type`; Angular no
longer reports those. The baseline before that was 25 warnings; the three `NG4010` warnings added
then cover UI5 (1 repeated registration), Fluent UI (42), and RHDS (91). The
compiler now reports a tag registered twice even when both registrations name the same declaration.
A matching definition export in the declaration's own module can refine its `tagName` once; other
repeated registrations produce `NG4010`, and Angular uses the first.

References to modules that a package's `exports` map hides aren't used for type checking, even
when the declaration files are in the package. A prototype that read those files anyway was reverted
on 2026-07-17; libraries need to expose the declarations their manifests reference.

The gallery covers twelve published design systems, the local `@box-model/web` package, handwritten
Lion, Material Web, and Spectrum button manifests, and the in-repo `@local/cem-workspace-example`
package:

- Material Web shows how to add local metadata for a package that ships none.
- The Spectrum manifest replaces unusable named unions with unions of the exported declarations.
- The workspace package shows, end to end, a package manifest written by the application, property
  checks against string literal unions, and local references typed as the element class.
- `@aurodesignsystem/auro-button` shows module paths into an unpublished `src/` directory. All of
  its types are primitives written in the manifest, so it produces one `NG4011` (local references
  are `HTMLElement`), and its property and binding checks still work.

The full 5,797,856-byte Lion manifest also compiles without the earlier Language Service assertion
failure. A cold `ngc` run took 2.09 seconds and 570,080 KB peak RSS with the full manifest, and 2.12
seconds and 548,712 KB with the smaller checked-in copy. The time difference is within noise for one
run; memory grows by about 21 MB. The full manifest adds three `NG4009` warnings and one `NG4010`
warning from the library's metadata, so the demo keeps using the smaller `lion-button` copy.

These results describe what applications see. Upstream contribution planning isn't part of this
public repository.

## Verification, 2026-07-26

This run used locally built Angular packages installed in this application, with compiler version
`22.1.0-next.5+sha-d997a96-with-local-changes`. These passed:

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

With all manifests configured, the Language Service timing harness measured a 4.15-second cold
start, about 1 ms for repeated requests with no changes, 97–167 ms after a TypeScript edit, and
103–152 ms after an external template edit.

Prettier and `git diff --check` also passed in both repositories.

## Review fixes, 2026-09-29

A code review of Angular commit `0bd3c70` reported ten findings. Angular fixup commit `1a7c3a4`
fixes eight. The other two describe intended behavior, which is now documented and explained by
clearer diagnostics:

| Finding                                                              | Resolution                                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Partial declarations required linker `22.2.0`                        | Require `22.3.0`; 22.2.x linkers ignore exact property names.                                                |
| Unchanged templates kept stale checks after schema-only changes      | Incremental builds compare validated schemas with the previous build and recheck all templates on a change.  |
| Native events errored on classes whose typings omit `HTMLElement`    | Classes without `addEventListener` are intersected with `HTMLElement`, with an `NG4013` fallback.            |
| Bare `src/custom-elements.json` entries resolve as module specifiers | Kept, matching tsconfig `extends`; `NG4007` suggests the `./` form when the project file exists.             |
| Relative entries inherited through `extends` are not rebased         | Kept, matching other `angularCompilerOptions`; `NG4007` names the project directory used.                    |
| Option docs named the wrong flag for `$event` typing                 | Corrected to `strictDomEventTypes` and `strictDomLocalRefTypes`.                                             |
| Registry kept the last duplicate schema, the index the first         | The index exposes only first-wins schemas.                                                                   |
| Language Service re-read every closed template and stylesheet        | Reads from disk only when TypeScript left the snapshot empty.                                                |
| One type-checking program per manifest                               | One program for all manifests. Program creation fell from about 670 to 580 ms; loading stays near 1.5 s.     |
| Dependency files re-hashed on every Language Service request         | Deferred, consistent with the 2026-07-17 decision in [`ls-perf/measurements.md`](./ls-perf/measurements.md). |

The first `HTMLElement` fix intersected every class not assignable to `HTMLElement`. The
`demo-app-diagnostics-baseline` regression scenario caught that Shoelace's `SlInput` redeclares
`autocorrect` as `'off' | 'on'` while TypeScript 6's DOM library declares `boolean`, which reduced
the intersection to `never`. The final check keys on `addEventListener`, so subclasses keep their
class type.

Review of the fixes also found that `strictUnclaimedEventNames` reported camelCase events that a
manifest declares, such as `(countChange)`, as unclaimed when a directive matched the element or an
ancestor. The check consulted only native DOM events. It now also accepts events that a configured
manifest declares, matched by exact name; the `unclaimed-event-names-accept-manifest-events`
regression scenario covers it.

Manifest loading remains dominated by parsing and binding package declarations outside the
application program, about 650 ms of the 1.5 s. Reusing them across CLI rebuilds would need a
declaration cache and is left for a follow-up.

## Cleanup, 2026-10-03

Angular commit `e730eba` adds a test and code cleanup and a copy review. Angular no longer warns
about manifest records that don't affect checking: a class without its `custom-element-definition`
export, `reflects` without an attribute, and an event without a `type`. Only the major version of
`schemaVersion` is checked. `NG4011` warnings and duplicate tags across manifests are now summarized
the same way as other warnings.

With the seventeen manifests, summary mode reports 20 warnings instead of 28, and verbose mode 1,636
instead of 1,936. All 300 removed warnings were `NG4014`; the other counts are unchanged. `ngc`, the
production build, all eight unit tests, and all eight regression scenarios passed. The language
service timing harness, the packaged VSIX, and browser checks weren't rerun.

The compiler-cli build bundles `magic-string`, which needs `@jridgewell/sourcemap-codec` 1.6.0 while
compiler-cli still declares `^1.4.14`. This app's lockfile now resolves `1.6.0`.

## Manual editor check

The automated Language Service tests, the timing harness, and the packaged VSIX passed, and a manual
check in VS Code on Windows with WSL passed with the locally packaged extension. To repeat it from
WSL:

```bash
code --install-extension ../angular/dist/bin/vscode-ng-language-service/ng-template.vsix --force
```

Reload VS Code and run **Angular: Restart Angular Language Server**, then confirm:

- Ctrl+Space in `<tag-box variant="">` offers `neutral`, `info`, `success`, `warning`, and `danger`;
- an invalid static `variant` reports an error;
- Ctrl+Space in the app's Spectrum `<sp-button variant="">` offers the `ButtonVariants` values, and
  an invalid value reports an error;
- Ctrl+Space in the app's Material `<md-filled-button target="">` offers `_blank`, `_parent`,
  `_self`, and `_top`, and an invalid value reports an error;
- UI5 `design=""` offers the attribute's string values;
- `[design]="ui5ButtonDesign"` isn't type-checked, because the manifest names an export that the
  referenced module doesn't have; and
- hovering UI5 `(click)` or `$event` shows the manifest documentation with the native event type,
  because the payload reference has no offsets and no `global:` reference.

The built artifact is `../angular/dist/bin/vscode-ng-language-service/ng-template.vsix`.

## Notes for the PR description

Mention these in the commit message or PR description:

- configuring a manifest can report errors that `CUSTOM_ELEMENTS_SCHEMA` hid;
- a `type.references` entry without offsets is used only when it names the whole type text; names
  inside a larger type need exact `start` and `end` offsets (Angular no longer accepts a reference
  without offsets for a name that appears once — libraries should fix their manifests);
- export records in modules without the required string `path` are skipped, not matched by
  declaration name alone;
- when the manifest maps an element class to more than one export, local references are typed as
  `HTMLElement`;
- the `document.addEventListener;` expression in type-check blocks isn't called, and exists only so
  the Language Service can find event symbols; and
- interpolation produces strings, and hand-written Angular two-way bindings may not work with web
  components, as documented.
