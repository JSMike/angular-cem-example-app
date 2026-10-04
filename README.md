# Angular Custom Elements Manifest integration app

This application is a reproduction and review harness for the proposed Angular
`angularCompilerOptions.customElementsManifests` feature. The implementation currently lives on
the [`custom-elements-manifest-support`](https://github.com/JSMike/angular/tree/custom-elements-manifest-support)
branch of Michael Cebrian's Angular fork.

Optional Angular CLI follow-up work can also be exercised from the
[`cem-cli-followups`](https://github.com/JSMike/angular-cli/tree/cem-cli-followups) branch of
Michael Cebrian's Angular CLI fork. That branch is not required for the compiler feature and should
not become an Angular CLI pull request unless the underlying Angular feature is accepted first.

The feature lets Angular read
[Custom Elements Manifests](https://github.com/webcomponents/custom-elements-manifest) during AOT
compilation. For the elements a manifest declares, Angular checks tags, properties, static
attributes, events, and local references, and the Language Service offers completions and
documentation. Templates no longer need `CUSTOM_ELEMENTS_SCHEMA`, which turns off these checks for
every tag that contains a dash.

> The feature branch must contain the reviewed changes before another developer can reproduce this
> project. For a durable review link, use the exact Angular commit SHA rather than relying only on
> the moving branch name.

## What this application exercises

- `/` — Shoelace properties, static values, bindings, events, and local state.
- `/box-model` — published `@box-model/web` metadata, including named types represented through
  `type.references` and a package-owned Agent Skill.
- `/design-systems` — Spectrum, UI5, Clarity, Calcite, Fluent UI, Nord, Red Hat Design System,
  Auro, Vaadin, PatternFly, Lion, Material Web, and a consumer-authored workspace package.

The seventeen configured manifests are listed in [`tsconfig.json`](./tsconfig.json). Together they
cover:

- package discovery through `package.json#customElements`;
- explicit JSON package exports and paths under `node_modules`;
- application-owned manifests for libraries that do not publish one;
- corrected replacement metadata for an otherwise usable vendor package;
- `type.references` resolved against published TypeScript declarations;
- self-contained primitive, literal-union, array, and inline object types;
- static attribute values, property bindings, events, and strict local references;
- malformed or incomplete published manifests, and the warnings Angular reports for them.

Lion uses a smaller checked-in copy of its manifest, because the published one is 5.8 MB and
includes test and dependency declarations. [`ls-perf/measurements.md`](./ls-perf/measurements.md)
covers the full file. The in-repo `@local/cem-workspace-example` package shows an application-written
package manifest and typed local references through a workspace symlink.

## Prerequisites

- Git
- Node.js compatible with the Angular repository. Its current `.nvmrc` uses Node 22.
- Corepack, so the repository can select the `pnpm` version declared by its `packageManager`.
- npm for this application.
- VS Code with WSL support when testing the locally built Angular Language Service from WSL.

The Angular checkout must be a sibling directory because this application's framework and compiler
dependencies use relative `file:` locations:

```text
dev/
├── angular/
└── angular-cem-example-app/
```

An `angular-cli/` sibling is needed only for the optional follow-up workflow documented below.

## Build and install the Angular feature

### 1. Clone or update Angular

For a new checkout:

```bash
cd ~/dev
git clone --branch custom-elements-manifest-support \
  https://github.com/JSMike/angular.git angular
cd angular
```

For an existing checkout:

```bash
cd ~/dev/angular
git remote get-url jsmike >/dev/null 2>&1 ||
  git remote add jsmike https://github.com/JSMike/angular.git
git fetch jsmike custom-elements-manifest-support
git switch custom-elements-manifest-support
git pull --ff-only jsmike custom-elements-manifest-support
```

When reviewing a specific revision, replace the moving branch tip with the commit recorded by the
feature PR:

```bash
git checkout <reviewed-angular-commit>
```

Install the repository-pinned pnpm version and build Angular's distributable packages:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm build
```

The build must create package-shaped output under `../angular/dist/packages-dist`, including
`compiler`, `compiler-cli`, `core`, and `language-service`.

### 2. Install this application

```bash
cd ~/dev/angular-cem-example-app
npm ci --force
```

No separate `npm link` command is needed. [`package.json`](./package.json) already installs Angular
framework/compiler packages from `../angular/dist/packages-dist`, TypeScript from the Angular
checkout, and unmodified `@angular/cli`/`@angular/build` packages from npm.

Run `npm ci --force` again after rebuilding Angular. npm can otherwise retain a previously copied
local artifact whose package version did not change.

Confirm that the expected packages are installed:

```bash
node -e "console.log(require('./node_modules/@angular/compiler-cli/package.json').version)"
node -e "console.log(require('./node_modules/@angular/language-service/package.json').version)"
node -e "console.log(require('./node_modules/@box-model/web/package.json').version)"
npm ls @angular/cli @angular/build @angular/compiler-cli @angular/language-service @box-model/web --depth=0
```

## Configure Custom Elements Manifests

Enable strict templates and add `customElementsManifests` under `angularCompilerOptions`:

```json
{
  "angularCompilerOptions": {
    "strictTemplates": true,
    "customElementsManifests": [
      "@shoelace-style/shoelace",
      "@box-model/web",
      "./src/custom-elements/material-web-button.custom-elements.json"
    ]
  }
}
```

Angular supports three entry forms:

| Entry                            | Meaning                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `"@my/lib"`                      | Locate the manifest through the package's `package.json#customElements` field. |
| `"@my/lib/custom-elements.json"` | Resolve an explicitly exported JSON module within a package.                   |
| `"./custom-elements.json"`       | Load a path relative to the final project `tsconfig.json`.                     |

As with tsconfig `extends`, only entries starting with `./`, `../`, or an absolute path are file
paths. A bare `custom-elements.json` is a module specifier; when it fails to resolve and the project
file exists, `NG4007` suggests `./custom-elements.json`.

Relative entries inherited through `extends` are still relative to the final project's
`tsconfig.json`; Angular merges inherited `angularCompilerOptions` without rebasing them against the
configuration file that originally declared the option. `NG4007` names the directory it used.

### Supply application-owned metadata

An application can add support for a library that does not publish a manifest by checking in a
focused manifest and configuring its relative path. This is the pattern used by
[`material-web-button.custom-elements.json`](./src/custom-elements/material-web-button.custom-elements.json):

```json
{
  "schemaVersion": "2.1.0",
  "modules": [
    {
      "kind": "javascript-module",
      "path": "button/filled-button.js",
      "declarations": [
        {
          "kind": "class",
          "name": "MdFilledButton",
          "customElement": true,
          "tagName": "md-filled-button",
          "members": [
            {
              "kind": "field",
              "name": "type",
              "attribute": "type",
              "type": {
                "text": "'button' | 'reset' | 'submit'"
              }
            }
          ],
          "attributes": [
            {
              "name": "type",
              "fieldName": "type",
              "type": {
                "text": "'button' | 'reset' | 'submit'"
              }
            }
          ]
        }
      ],
      "exports": [
        {
          "kind": "custom-element-definition",
          "name": "md-filled-button",
          "declaration": {
            "name": "MdFilledButton"
          }
        }
      ]
    }
  ]
}
```

When a field has an attribute, the manifest also lists the attribute in the declaration's
`attributes` array and links it back with `fieldName`. When these records don't match, Angular
reports `NG4014` and does not add the missing record.

Named types need `type.references` entries that name the exact exported type:

```json
{
  "text": "AlertVariant",
  "references": [
    {
      "name": "AlertVariant",
      "module": "alert.js",
      "start": 0,
      "end": 12
    }
  ]
}
```

A name inside a larger type needs exact `start` and `end` offsets. Platform types use
`package: "global:"`:

```json
{
  "text": "CustomEvent<void>",
  "references": [
    {
      "name": "CustomEvent",
      "package": "global:",
      "start": 0,
      "end": 11
    }
  ]
}
```

Order matters: the first declaration of a tag wins, as the first `customElements.define()` call does
at runtime. To correct some of a library's tags, list your manifest before the library's:

```json
{
  "angularCompilerOptions": {
    "customElementsManifests": [
      "./src/custom-elements/spectrum-button.corrected.custom-elements.json",
      "@spectrum-web-components/button"
    ]
  }
}
```

The library's later declarations produce an expected `NG4010` warning, and Angular uses yours. To
also type `#ref` with the element class, publish the correction as a local workspace package
instead, like `@local/cem-workspace-example`.

### Register components at runtime

A manifest only describes elements to the compiler; it doesn't register them in the browser. Keep
importing the package or its component entry points:

```ts
import '@box-model/web/tag.js';
import '@shoelace-style/shoelace/dist/components/rating/rating.js';
```

Components that use only manifest-declared elements don't need `CUSTOM_ELEMENTS_SCHEMA`. During a
migration you can use both: manifest tags are still fully checked, and `CUSTOM_ELEMENTS_SCHEMA`
allows other tags that contain a dash.

## Template behavior to review

### Elements and member names

Manifest-declared tags don't produce `NG8001`. Declared writable properties and events are known.
Bindings to misspelled or undeclared properties produce `NG8002`, as do bindings to read-only properties
and to names declared only as attributes.

```html
<!-- Known tag and property. -->
<sl-rating [precision]="precision()"></sl-rating>

<!-- NG8002: the manifest does not declare this property. -->
<sl-rating [precison]="precision()"></sl-rating>

<!-- Bind an attribute explicitly when there is no JavaScript property. -->
<some-element [attr.data-mode]="mode()"></some-element>
```

Angular sets manifest properties by their exact names, so `[readonly]` sets `readonly` rather than
`readOnly`. Standard DOM properties that the manifest doesn't declare keep Angular's usual mapping.

### Bound values

With strict template checking, Angular checks property values when the manifest's type is either:

- type text without names, such as `boolean`, `'primary' | 'secondary'`, `{value: string}`, or
  `string[]`; or
- named types that `type.references` locates and that resolve to exported TypeScript declarations.

```html
<!-- Numeric expression: checked against the number property. -->
<sl-rating [precision]="precision()"></sl-rating>

<!-- This is an Angular expression referring to App.a, not the string "a". -->
<sl-rating [precision]="a"></sl-rating>

<!-- A string literal binding is checked and rejected when precision is number. -->
<sl-rating [precision]="'a'"></sl-rating>
```

Interpolation produces a string. Use a property binding for other types:

```html
<!-- String serialization; invalid for a number property. -->
<sl-rating precision="{{ precision() }}"></sl-rating>

<!-- Preserves number typing. -->
<sl-rating [precision]="precision()"></sl-rating>
```

### Static attributes and completions

Static attribute values are checked only when the manifest declares a union of string literals.
The editor also suggests those values:

```html
<!-- Completion and validation: "primary" | "secondary" | ... -->
<tag-box variant="primary"></tag-box>
```

Static number and boolean attributes aren't value-checked, because CEM doesn't define how attribute
strings convert to other types. Bind the property to check the value:

```html
<some-element count="1" disabled></some-element>
<some-element [count]="count()" [disabled]="disabled()"></some-element>
```

Values bound with `[attr.name]` become attribute strings and aren't checked against manifest types.

### Events

When the manifest gives an event a supported type, `$event` has that type:

```html
<alert-box (close)="dismissAlert($event)"></alert-box>
```

For a type such as `CustomEvent<{value: string}>`, `type.references` must include `CustomEvent`
with `package: "global:"`. Without a supported type, `$event` has the native DOM event type.

The editor doesn't suggest two-way bindings for manifest properties, and Angular doesn't map events
such as `count-changed` to properties. Bind the property and the event separately:

```html
<counter-box [count]="count()" (countChange)="count.set($event.detail)"></counter-box>
```

### Local references

When the manifest entry names a package and the element's class resolves to an exported TypeScript
declaration, a template reference has the class type:

```html
<tag-box #tag variant="info"></tag-box>
<!-- tag is the package's Tag class rather than HTMLElement. -->
```

With a file entry, or when the class doesn't resolve, the reference is an `HTMLElement`. When the
class's typings don't declare that it extends `HTMLElement`, the reference has the class combined
with `HTMLElement`, so native events such as `(click)` are still typed. If the class's members
conflict with `HTMLElement`, the reference is an `HTMLElement` and Angular reports `NG4013`.

## Manifest diagnostics

Manifest problems use codes `NG4007` through `NG4014`. When part of a manifest is invalid, Angular
keeps the rest:

| Code     | Meaning                                                                                 |
| -------- | --------------------------------------------------------------------------------------- |
| `NG4007` | An entry doesn't resolve to a file, or the file can't be read.                          |
| `NG4008` | The file isn't valid JSON or isn't a manifest object.                                   |
| `NG4009` | A declaration's tag isn't a valid custom element name.                                  |
| `NG4010` | A tag is declared more than once; Angular uses the first declaration.                   |
| `NG4011` | A type reference doesn't resolve to TypeScript declarations.                            |
| `NG4012` | `customElementsManifests` or `customElementsManifestsDiagnostics` has an invalid value. |
| `NG4013` | Angular can't use some type metadata for type checking.                                 |
| `NG4014` | Records are inconsistent with each other.                                               |

By default, Angular combines warnings of the same kind for each manifest. To list each problem:

```json
{
  "angularCompilerOptions": {
    "customElementsManifestsDiagnostics": "verbose"
  }
}
```

The optional Angular CLI follow-up branch also maps the application builder's `--verbose` flag to
this option for one run.

Angular never replaces unusable type text with a type from `.d.ts` files. The declaration stays
known, and only the checks that need the type are skipped. To fix a library's metadata without
waiting for a release, configure a corrected manifest.

## Run and verify the demo

Start the development server:

```bash
npm start
```

Then visit:

- <http://localhost:4200/>
- <http://localhost:4200/box-model>
- <http://localhost:4200/design-systems>

Run compiler, production-build, unit-test, and compiler regression checks:

```bash
./node_modules/.bin/ngc -p tsconfig.app.json --noEmit
npm run build
npm test -- --watch=false
npm run test:regression
```

[`regression/run.mjs`](./regression/run.mjs) compiles small generated projects under
`regression/.tmp` with the installed compiler. Each scenario reproduces a review finding and fails
against a compiler without the corresponding fix:

| Scenario                                           | Checks                                                                                        |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `partial-declaration-requires-linker-22.3`         | Partial declarations with exact property names require linker `22.3.0`.                       |
| `bare-json-entry-suggests-path`                    | A bare `custom-elements.json` entry reports `NG4007` suggesting `./custom-elements.json`.     |
| `inherited-relative-entry-names-project-directory` | `NG4007` for an entry inherited through `extends` names the project directory it resolved in. |
| `element-class-without-htmlelement-heritage`       | `(click)` on an element whose class omits `HTMLElement` heritage type-checks.                 |
| `rebuild-after-global-type-added`                  | An incremental rebuild rechecks templates after a referenced `global:` type is declared.      |
| `rebuild-after-package-declaration-fixed`          | An incremental rebuild rechecks templates after package declarations export a missing type.   |
| `unclaimed-event-names-accept-manifest-events`     | With `strictUnclaimedEventNames`, events a manifest declares aren't reported as unclaimed.    |
| `demo-app-diagnostics-baseline`                    | This app still reports 20 summarized CEM warnings and no errors.                              |

The rebuild scenarios reuse the previous program with a caching compiler host, as `ng serve` does,
and first confirm that a fresh build reports the expected error. Pass part of a scenario name to
run a subset, for example `npm run test:regression -- rebuild`.

The baseline verified on 2026-10-03 with Angular `22.3.0-next.0+sha-e730eba` is 20 CEM warnings
in default summary mode and zero errors. `ngc`, the production build, all eight unit tests, and the
regression scenarios passed. The language-service completion harness and browser checks were last
run against the 2026-09-29 baseline.

The 2026-10-03 cleanup stopped reporting manifest records that don't affect checking, such as
missing definition exports and events without a `type`. That removed 300 `NG4014` warnings in
verbose mode and 8 summary warnings; the other counts are unchanged.

The 2026-09-29 baseline, with Angular `22.3.0-next.0+sha-0bd3c70`, was 28 CEM warnings. The
production build, all eight unit tests, the language-service completion harness, and browser checks
across all three routes passed.

The review fixes in Angular fixup commit `1a7c3a4` were verified the same day. Summary and verbose
CEM diagnostics were identical to that baseline, and `ngc`, the production build, all eight unit
tests, and the regression scenarios passed. The language-service harness and browser checks
were not rerun for the fixup. The diagnostic messages were reworded after the fixup; their codes,
order, and counts are unchanged, and the regression scenarios still pass.

Before 2026-09-29, the baseline was 25 warnings. The three `NG4010` warnings added then are for UI5,
Fluent UI, and RHDS: the compiler now reports a tag registered twice even when both registrations
name the same declaration, and uses the first. Verbose mode lists 134 findings for these three
warnings; the other counts are unchanged. All current warnings are expected for the configured
manifests. The production build also reports two warnings unrelated to manifests: deprecated Sass
`@import` usage and Spectrum's CommonJS `focus-visible` dependency.

The [implementation summary](./angular-cem-implementation-summary.md#real-package-results) lists
the counts by code and what each library's warnings mean.

## Optionally test the Angular CLI follow-up

The `cem-cli-followups` branch is separate from the compiler feature. Use it for integration testing;
an Angular CLI pull request from it should wait until Angular accepts the compiler feature.

The branch has three follow-ups:

- don't repeat unchanged compiler-option warnings on watch rebuilds;
- map the application builder's `--verbose` option to
  `customElementsManifestsDiagnostics: "verbose"`;
- add Angular CLI regression coverage for manifest edits and creation during a watch build.

Clone or update the optional branch:

```bash
cd ~/dev
git clone --branch cem-cli-followups \
  https://github.com/JSMike/angular-cli.git angular-cli
cd angular-cli
```

For an existing Angular CLI checkout:

```bash
cd ~/dev/angular-cli
git remote get-url jsmike >/dev/null 2>&1 ||
  git remote add jsmike https://github.com/JSMike/angular-cli.git
git fetch jsmike cem-cli-followups
git switch cem-cli-followups
git pull --ff-only jsmike cem-cli-followups
```

Use the exact reviewed commit when one is recorded for the follow-up:

```bash
git checkout <reviewed-angular-cli-followup-commit>
```

Build the optional CLI packages:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm build
```

Temporarily install the generated tarballs into this demo without changing `package.json` or
`package-lock.json`. The companion DevKit and Schematics tarballs are included because the
main-line CLI build depends on the matching unpublished development versions:

```bash
cd ~/dev/angular-cem-example-app
npm install --no-save --package-lock=false --force \
  ../angular-cli/dist/_angular_cli.tgz \
  ../angular-cli/dist/_angular_build.tgz \
  ../angular-cli/dist/_angular-devkit_architect.tgz \
  ../angular-cli/dist/_angular-devkit_core.tgz \
  ../angular-cli/dist/_angular-devkit_schematics.tgz \
  ../angular-cli/dist/_schematics_angular.tgz
```

Confirm that the locally built follow-up is installed:

```bash
node -e "console.log(require('./node_modules/@angular/cli/package.json').version)"
node -e "console.log(require('./node_modules/@angular/build/package.json').version)"
```

The displayed versions should match the local CLI build. `npm ls` is not a useful check while this
temporary override is active because `package.json` intentionally continues to declare the
published versions and may label the no-save development packages as `invalid`.

Review the optional behaviors:

1. Run `npm start`. The initial build should report the current summarized CEM warnings.
2. Edit an unrelated application TypeScript file. Unchanged option warnings should not be printed
   again on that rebuild.
3. Edit an application-owned manifest so its warning set changes. The complete current warning set
   should be reported again.
4. Set `"customElementsManifestsDiagnostics": "verbose"` to verify explicit compiler behavior.
5. Remove that setting and run `npm run build -- --verbose` to verify the optional builder
   forwarding. Angular CLI's existing verbose/esbuild presentation can display plugin warnings
   twice; that broader presentation issue is not fixed by this follow-up.
6. Exercise creation or modification of a watched manifest and confirm diagnostics update without
   restarting the builder.

Restore the demo's published CLI dependencies afterward:

```bash
npm ci --force
```

## Test the Angular Language Service

Installing `@angular/language-service` in this application is not sufficient: the VS Code extension
bundles its own Language Service. Build the matching extension from the same Angular feature
checkout:

```bash
cd ~/dev/angular
pnpm --filter=ng-template run package
```

The output is:

```text
../angular/dist/bin/vscode-ng-language-service/ng-template.vsix
```

From a VS Code terminal running inside WSL, pass the Linux path directly:

```bash
cd ~/dev/angular-cem-example-app
code --install-extension \
  ../angular/dist/bin/vscode-ng-language-service/ng-template.vsix \
  --force
```

Do not pass a `wslpath -w` Windows path to the WSL extension host. Reload VS Code and run
**Angular: Restart Angular Language Server**.

At minimum, confirm:

- element-name completions after typing `<sl-` or `<tag-`;
- property and event completions inside a manifest-declared element;
- static literal-union completions in `variant=""`;
- bound expression completions and type errors in `[variant]=""`;
- manifest descriptions, types, defaults, and deprecation text in hover/quick info;
- typed `$event` payloads;
- package-based local references exposing component members;
- invalid tags, properties, and values producing the expected Angular diagnostics.

The complete manual procedure is in
[`vscode-cem-plugin-review-guide.md`](./vscode-cem-plugin-review-guide.md).

## Important boundaries

- Only the AOT compiler reads manifests. Karma-based `TestBed` tests, `TestBed.overrideComponent`
  templates, and JIT bootstrap still need `CUSTOM_ELEMENTS_SCHEMA`. The Angular Vitest builder
  compiles tests with AOT, so those tests use the manifests.
- Directive host bindings compile without the component's manifests, so `host: {'[readonly]': ...}`
  still sets `readOnly`.
- Angular doesn't follow `superclass` or `mixins`; the manifest must list inherited members on each
  element's declaration.
- Angular's security checks reject property bindings whose names start with `on` (ignoring case),
  even when a manifest declares them. Use the attribute instead.
- Whether a change under `node_modules` triggers a rebuild depends on the build tool's file
  watching. Angular reloads project manifest files when the build tool reports that they changed.
  Each incremental rebuild also compares the
  validated types with the previous build, so a change to a referenced declaration or global type
  rechecks all templates.

## Load the Box Model Agent Skill

This application allowlists `@box-model/web` through `package.json#intent.skills`. The published
package ships a version-matched Agent Skill alongside its manifest:

```bash
npx @tanstack/intent@latest list
npx @tanstack/intent@latest load @box-model/web#box-model-web
```

The guidance directs agents to the installed `custom-elements.json` for exact APIs and provides
Storybook-derived composition examples plus public CSS/Sass utility guidance.

## Review documentation

- [`vscode-cem-plugin-review-guide.md`](./vscode-cem-plugin-review-guide.md) — step-by-step manual
  Language Service review.
- [`angular-cem-implementation-summary.md`](./angular-cem-implementation-summary.md) — hardening
  work, results against published libraries, and verification.
- [`angular-cem-related-open-issues.md`](./angular-cem-related-open-issues.md) — related Angular
  issues, and runtime and forms concerns that are out of scope.
- [`ls-perf/measurements.md`](./ls-perf/measurements.md) — Language Service and compiler timings,
  and the memory cost of diagnostics that link into manifests.
