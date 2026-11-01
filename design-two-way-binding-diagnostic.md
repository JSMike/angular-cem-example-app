# Design: extended diagnostic for two-way bindings on custom elements

Status: open follow-up design, reviewed 2026-07-26. Not part of the initial
`customElementsManifests` PR; targets Angular's extended-diagnostics framework as a separate
general custom-element improvement.

## Problem

A handwritten two-way binding on a custom element compiles but cannot work:

```html
<sl-input [(value)]="name"></sl-input>
```

desugars to `[value]="name"` plus `(valueChange)="name = $event"`. Two independent failures
follow, and both are silent today:

1. Most web components never emit an Angular-convention `valueChange` event (Shoelace emits
   `sl-change`/`sl-input`), so the model is simply never updated.
2. Even when an event named `valueChange` exists, the listener is a DOM listener: `$event` is the
   `Event`/`CustomEvent` **object**, and Angular assigns that object directly to `name`. It does
   not extract `event.detail` or any payload.

This predates Custom Elements Manifest support and applies equally to elements admitted through
`CUSTOM_ELEMENTS_SCHEMA`. Manifest ingestion makes the property half checkable and the language
service already declines to offer two-way completions for manifest properties, but handwritten
templates remain a footgun. This is therefore designed as a **general custom-element integration
diagnostic**, not a CEM feature.

## Firing condition

Fire on a two-way binding (`[(x)]`, or its `bindon-` longhand) whose **output half (`xChange`)
resolves to a DOM event listener on a custom element** — that is:

- the target element's tag contains a dash and is not an Angular component in scope; and
- no directive in scope claims the `xChange` output.

This condition is the crisp core of the hazard: whenever `xChange` lands on the DOM, the
event-object assignment is almost certainly wrong. Consequences of stating it this way:

- A directive that implements the two-way contract (claims **both** the `x` input and the
  `xChange` output — including `model()`-based directives and form integrations) never triggers
  the diagnostic: its output claim removes the DOM listener.
- A directive that claims only the `x` input does not suppress the diagnostic: the `xChange`
  half still becomes a DOM listener and still assigns the event object.
- Whether the element is manifest-declared or schema-admitted does not change the firing
  decision, only the message precision (below).
- Native (non-dash) elements are out of scope. `<input [(value)]>` has a related but different
  story (Angular's DOM property mapping plus `ngModel` conventions); extending the principle to
  native elements is a separate decision and must not ride along silently.

The diagnostic must **not** attempt to detect or suggest library-specific event mappings
(`sl-change`, `value-changed`, `valuechange`, …). It explains the mechanism and points at the
library's documentation; guessing event names would trade one silent wrong behavior for another.

## Message

Category: warning. Opt-in via the extended-diagnostics registry, suppressible per project:

```jsonc
"angularCompilerOptions": {
  "extendedDiagnostics": {
    "checks": { "customElementTwoWayBinding": "suppress" /* or "warning" | "error" */ }
  }
}
```

Default severity when enabled: `warning`. (Whether the check is on by default follows the
framework's convention for new checks — currently new extended checks default to enabled at
`warning`; confirm with reviewers.)

Message content, in order:

1. What Angular generated: a `xChange` DOM listener whose `$event` object is assigned directly
   to the bound expression.
2. Why that fails: the element does not emit `xChange` as an Angular-style output (when a
   manifest for the element is configured and declares no `xChange` event, say so concretely:
   "the Custom Elements Manifest for `<sl-input>` declares no `valueChange` event"); even if it
   did, the event object — not its payload — would be assigned.
3. The recommendation: separate property and event bindings that extract the documented payload,
   e.g. `[value]="name" (…)="name = <payload expression>"`, consulting the library's event
   documentation for the event name and payload shape.

Manifest metadata may sharpen wording (declared event list, property type) but must not change
the firing condition.

## Implementation sketch

- New check in `packages/compiler-cli/src/ngtsc/typecheck/extended/checks/`, following the
  existing template-check pattern (`invalid_banana_in_box` is the structural precedent for
  inspecting two-way syntax; take the next free NG diagnostic code in the extended range).
- The check visits bound events; a two-way binding is recognizable from the source span/AST
  (`TmplAstBoundEvent` produced from a `[(…)]` binding). Use the template type checker's symbol
  API (`getSymbolOfNode` on the output binding) to determine whether the output resolved to a
  directive output or fell through to a DOM listener, and the element symbol to distinguish
  custom elements from components/native elements.
- Manifest schema lookup (for message precision) goes through the same
  `customElementsManifestSchemas` config the schema registry already exposes to type-check ops —
  read-only, no new plumbing.
- Language service: extended diagnostics already surface through the LS; verify the span lands on
  the `[(x)]` binding for a usable editor squiggle.

## Test matrix

| #   | Scenario                                                                                                            | Expected                        |
| --- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1   | `<sl-input [(value)]="v">`, manifest-declared element, no directive                                                 | fires                           |
| 2   | Same, directive claims `value` input **and** `valueChange` output                                                   | silent                          |
| 3   | Same, directive claims only `value` input                                                                           | fires                           |
| 4   | Hyphenated tag admitted via `CUSTOM_ELEMENTS_SCHEMA`, `[(foo)]="v"`                                                 | fires                           |
| 5   | Manifest declares a `valueChange` **event** (DOM event, not directive output)                                       | fires (event-object assignment) |
| 6   | Angular component with `@Input() x` + `@Output() xChange`                                                           | silent                          |
| 7   | `model()`-based two-way on a directive applied to a custom element                                                  | silent                          |
| 8   | Native `<input [(value)]="v">`                                                                                      | silent (out of scope)           |
| 9   | Check suppressed via `extendedDiagnostics.checks`                                                                   | silent                          |
| 10  | Message wording: manifest-aware variant when manifest lacks `xChange`; generic variant for schema-admitted elements | exact-text specs                |

## Companion check: explanatory interpolation diagnostic (2nd-pass-plan 3.3)

Bundled here because it shares the extended-diagnostics machinery and review surface.

Angular correctly models interpolation as string serialization, so
`precision="{{ precision() }}"` against a numeric manifest property fails with the accurate but
unexplanatory "`string` is not assignable to `number`". Proposed opt-in check
(`interpolatedCustomElementProperty`, next free code): when an _interpolated attribute_ targets a
manifest property whose validated check type rejects `string`, add a warning explaining that
interpolation produces a string and suggesting the property-binding form
(`[precision]="precision()"`). Constraints: the TypeScript assignability error remains the source
of truth (this check adds explanation, never replaces it); no duplicate when the target type
accepts strings; if reviewers prefer, the same principle can generalize to Angular component
inputs in a follow-up, but the initial scope is manifest properties where the confusion was
observed. Test matrix: numeric property fires; string-union property silent; property binding
silent; suppression works.

## Open questions for reviewers

1. Should the check be enabled by default (warning) or opt-in only? The considerations file says
   opt-in; current framework convention enables new checks by default — decide at PR time.
2. Native-element extension (`<input [(value)]>` without `ngModel`): worth a companion check, or
   permanently out of scope?
3. Message length: extended diagnostics are usually one sentence plus a hint; this one carries a
   mechanism explanation. Confirm the two-paragraph form is acceptable or split into message +
   related-information.
