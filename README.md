# Angular Custom Elements Manifest integration app

This application is a reproduction and review harness for the proposed Angular
`angularCompilerOptions.customElementsManifests` feature. The implementation currently lives on
the [`custom-elements-manifest-support`](https://github.com/JSMike/angular/tree/custom-elements-manifest-support)
branch of Michael Cebrian's Angular fork.

Optional Angular CLI follow-up work can also be exercised from the
[`cem-cli-followups`](https://github.com/JSMike/angular-cli/tree/cem-cli-followups) branch of
Michael Cebrian's Angular CLI fork. That branch is not required for the compiler feature and should
not become an Angular CLI pull request unless the underlying Angular feature is accepted first.

The feature lets Angular consume standards-based
[Custom Elements Manifests](https://github.com/webcomponents/custom-elements-manifest) during AOT
template compilation. Manifest-declared custom elements then receive known-element checks,
property and static-attribute validation, event payload types, typed local references,
documentation, and Language Service completions without using `CUSTOM_ELEMENTS_SCHEMA` as blanket
template-check suppression.

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
- malformed or incomplete real-world manifests and Angular's narrow diagnostic fallbacks.

Lion uses a focused checked-in projection during routine editor work because its published manifest
is 5.8 MB and contains unrelated test and dependency declarations. The full file is covered by the
acceptance measurements. The in-repo `@local/cem-workspace-example` package exercises a
consumer-authored package manifest and typed local references through a workspace symlink.

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

Relative entries inherited through `extends` are still relative to the final project's
`tsconfig.json`; TypeScript does not rebase them against the configuration file that originally
declared the option.

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

When a field exposes an attribute, standards-conforming metadata also lists the corresponding
record in the declaration's `attributes` array and connects it with `fieldName`. Angular reports
inconsistent consumed records through `NG4014` rather than inventing the missing relationship.

Named types should use CEM `type.references` that identify the exact public type export:

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

Names inside compound types require exact `start` and `end` offsets. Platform types use
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

Manifest order is significant. The first declaration for a tag wins, matching the first successful
`customElements.define()` call at runtime. This lets an application put a corrected subset
manifest before a vendor manifest:

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

The later duplicate produces `NG4010`, but the application-controlled definition remains
authoritative. A local workspace package is preferable when the correction must also provide an
importable element class for strict `#ref` typing.

### Register components at runtime

A manifest supplies compile-time metadata; it does not register custom elements in the browser.
Continue importing the package or its component entrypoints:

```ts
import '@box-model/web/tag.js';
import '@shoelace-style/shoelace/dist/components/rating/rating.js';
```

With a manifest configured, the corresponding Angular components generally should not need
`CUSTOM_ELEMENTS_SCHEMA`. The two mechanisms can coexist during migration: manifest-declared tags
remain precisely checked, while `CUSTOM_ELEMENTS_SCHEMA` continues allowing other unknown
hyphenated tags.

## Template behavior to review

### Elements and member names

Manifest-declared tags do not produce `NG8001`. Declared writable properties and events are known,
while misspelled or undeclared property bindings still produce `NG8002`. Read-only fields and
attribute-only declarations do not authorize property assignment.

```html
<!-- Known tag and property. -->
<sl-rating [precision]="precision()"></sl-rating>

<!-- NG8002: the manifest does not declare this property. -->
<sl-rating [precison]="precision()"></sl-rating>

<!-- Bind an attribute explicitly when there is no JavaScript property. -->
<some-element [attr.data-mode]="mode()"></some-element>
```

Manifest JavaScript property names retain their exact spelling during code generation rather than
being remapped through native HTML aliases. Standard inherited DOM properties that are not
redeclared continue using Angular's normal mapping.

### Bound values

With strict template checking, Angular checks property values when the manifest provides either:

- self-contained safe type text such as `boolean`, `'primary' | 'secondary'`,
  `{value: string}`, or `string[]`; or
- named types whose occurrences are located by valid `type.references` and resolve to exported
  TypeScript declarations.

```html
<!-- Numeric expression: checked against the number property. -->
<sl-rating [precision]="precision()"></sl-rating>

<!-- This is an Angular expression referring to App.a, not the string "a". -->
<sl-rating [precision]="a"></sl-rating>

<!-- A string literal binding is checked and rejected when precision is number. -->
<sl-rating [precision]="'a'"></sl-rating>
```

Interpolation serializes to a string. Use a property binding to preserve a non-string value:

```html
<!-- String serialization; invalid for a number property. -->
<sl-rating precision="{{ precision() }}"></sl-rating>

<!-- Preserves number typing. -->
<sl-rating [precision]="precision()"></sl-rating>
```

### Static attributes and completions

Static attribute values are strictly checked only when the manifest explicitly declares a string
literal union. This also provides editor value completions:

```html
<!-- Completion and validation: "primary" | "secondary" | ... -->
<tag-box variant="primary"></tag-box>
```

Static number and boolean spellings remain existence-checked because CEM does not define one
universal attribute conversion algorithm. Their bound JavaScript properties remain fully typed:

```html
<some-element count="1" disabled></some-element>
<some-element [count]="count()" [disabled]="disabled()"></some-element>
```

Values written as `[attr.name]` follow Angular's general attribute serialization and are not
checked against manifest property types.

### Events

When the manifest supplies a trustworthy event type, `$event` receives that type:

```html
<alert-box (close)="dismissAlert($event)"></alert-box>
```

An event such as `CustomEvent<{value: string}>` must identify `CustomEvent` through a
`type.references` entry using `package: "global:"`. Unusable event metadata falls back to standard
DOM event inference without erasing unrelated checks.

Manifest properties are not offered as two-way binding completions. Angular does not infer a
mapping between a property and arbitrary web-component events such as `count-changed`. Prefer
explicit input and event bindings:

```html
<counter-box [count]="count()" (countChange)="count.set($event.detail)"></counter-box>
```

### Local references

For a package-based manifest whose declaration class resolves to exported TypeScript declarations,
a template reference receives the web-component class:

```html
<tag-box #tag variant="info"></tag-box>
<!-- tag is the package's Tag class rather than HTMLElement. -->
```

Path-only manifests or unresolved class references fall back to `HTMLElement`.

## Manifest diagnostics

Configuration and producer-metadata problems use codes `NG4007` through `NG4014`. Angular retains
unrelated valid metadata whenever it can:

| Code     | Meaning                                                                      |
| -------- | ---------------------------------------------------------------------------- |
| `NG4007` | The configured manifest cannot be resolved or read.                          |
| `NG4008` | The resolved file is not valid JSON or not a manifest object.                |
| `NG4009` | A declaration uses an invalid custom-element tag name.                       |
| `NG4010` | A later declaration duplicates a tag; the first declaration wins.            |
| `NG4011` | A validated type reference cannot resolve to usable TypeScript declarations. |
| `NG4012` | The compiler option is not an array of non-empty strings.                    |
| `NG4013` | Declared type metadata cannot safely be emitted into template checks.        |
| `NG4014` | Consumed manifest records are structurally inconsistent.                     |

Warnings of the same kind are summarized per manifest by default. To inspect every affected
declaration or reference:

```json
{
  "angularCompilerOptions": {
    "customElementsManifestsDiagnostics": "verbose"
  }
}
```

Prefer the explicit compiler option for repeatable results. The optional Angular CLI follow-up
branch additionally maps its application builder's `--verbose` flag to verbose CEM diagnostics for
a one-off run.

Unusable type text is never silently replaced with a `.d.ts` type. The declaration remains known,
but the affected binding/event check falls back narrowly. An application can configure a corrected
manifest it controls instead of waiting for a vendor update.

## Run and verify the demo

Start the development server:

```bash
npm start
```

Then visit:

- <http://localhost:4200/>
- <http://localhost:4200/box-model>
- <http://localhost:4200/design-systems>

Run compiler, production-build, and unit-test checks:

```bash
./node_modules/.bin/ngc -p tsconfig.app.json --noEmit
npm run build
npm test -- --watch=false
```

The current verified compiler baseline is 25 summarized CEM warnings and zero errors. These
warnings intentionally demonstrate real producer compatibility issues. Verbose mode expands them
into individual findings. The observed boundaries are summarized in the
[implementation summary](./angular-cem-implementation-summary.md#real-package-results).

## Optionally test the Angular CLI follow-up

The `cem-cli-followups` branch is deliberately separate from the compiler feature. It is available
for integration testing and for reusing this demo in a later Angular CLI pull request, but that
pull request should wait until Angular accepts the underlying CEM feature.

The branch currently explores three follow-ups:

- suppress unchanged warning-category compiler option diagnostics on subsequent watch rebuilds;
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

- The integration is an AOT compiler feature. Classic JIT/Karma TestBed compilation and runtime
  template overrides may still require `CUSTOM_ELEMENTS_SCHEMA`; the modern Angular Vitest builder
  AOT-compiles tests and consumes the manifests.
- Directive host bindings do not have access to the consuming component's manifests and retain
  native DOM property-name mapping.
- Manifest inheritance and mixin references are not expanded; inherited members must be listed on
  the custom-element declaration.
- Properties whose case-insensitive name starts with `on` still encounter Angular's existing DOM
  event-property security restriction. Prefer the component's attribute or supported alternate API.
- Whether edits under ignored dependency directories trigger an immediate rebuild depends on the
  host watcher. Application-owned manifest files are tracked as compilation resources.

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
- [`angular-cem-implementation-summary.md`](./angular-cem-implementation-summary.md) — completed
  feature hardening, integration results, and verification.
- [`angular-cem-related-open-issues.md`](./angular-cem-related-open-issues.md) — related Angular
  issues and explicitly out-of-scope runtime/forms concerns.
- [`ls-perf/measurements.md`](./ls-perf/measurements.md) — large-manifest Language Service
  measurements and diagnostics-navigation memory analysis.
