# Custom Elements Manifest follow-up considerations

Updated: 2026-07-26

This file contains only open Angular compiler and language-service work that is intentionally
separable from the initial `customElementsManifests` feature. Completed hardening has been removed.
Third-party manifest and package corrections are tracked separately in
[`follow-up-cem-contributions.md`](./follow-up-cem-contributions.md).

None of the items below is a correctness or security blocker for the initial feature unless review
of the proposed implementation uncovers a broader regression.

## Open Angular work

### P2: Preserve exact custom-element property names through i18n opcodes

Normal property and two-way instructions receive the manifest exact-name marker. The i18n
attribute opcode still calls the shared property setter without that marker, so a translated
interpolated property can be remapped as though it were a native DOM property.

The follow-up should:

- carry the exact-name decision into i18n property updates;
- preserve existing native DOM remapping and sanitization;
- cover normal and HMR compilation where applicable; and
- add an integration test using an exact manifest property name that differs from the native
  mapping.

### P2: Add navigation from manifest diagnostics to the offending metadata

`NG4007`–`NG4014` currently travel through the compiler-options diagnostic channel. They identify
the manifest and affected declaration in text, but an editor cannot navigate directly to the JSON
entry.

Retaining a parsed JSON source tree is not acceptable: measurement showed excessive steady-state
memory for large manifests. The preferred design is a lazy, one-shot reparse when related
information is requested, attaching an LSP `DiagnosticRelatedInformation` location to the existing
diagnostic. This avoids taking ownership of JSON-file diagnostics from VS Code's JSON language
service.

Acceptance criteria:

- summary and verbose diagnostics can link to a representative or exact manifest entry;
- normal compilation does not retain offset-heavy JSON ASTs;
- edits, deletion, and recreation do not leave stale locations; and
- command-line diagnostics remain unchanged when related-information transport is unavailable.

### P2: Warn about ineffective two-way bindings on custom elements

A handwritten `[(value)]="value"` on a custom element still means `[value]="value"` plus a
`valueChange` DOM listener that assigns the event object directly. Most web components do not emit
that Angular-style event, and a `CustomEvent` payload would still require explicit `detail`
extraction.

This behavior predates CEM support and also applies under `CUSTOM_ELEMENTS_SCHEMA`. The proposed
general custom-element extended diagnostic is specified in
[`design-two-way-binding-diagnostic.md`](./design-two-way-binding-diagnostic.md). It must not infer
library-specific event names and must stay silent when a directive owns the output contract.

### P3: Review manifest-owned `on*` properties with the security team

Angular rejects case-insensitive `on*` property bindings before consulting the element schema.
That protects the native DOM event-property boundary but also rejects a manifest-declared property
such as `onDark`.

The initial feature keeps the existing security rule. A future change may consider exact
manifest/schema ownership before the broad heuristic, while continuing to reject native event
handler properties. Any relaxation requires explicit framework security review and adversarial
tests; it should not be implemented as a CEM-only exception without that review.

## Tracked elsewhere

- Producer manifest, generator, and npm export corrections:
  [`follow-up-cem-contributions.md`](./follow-up-cem-contributions.md)
- Related runtime, forms, hydration, and scoped-registry issues:
  [`angular-cem-related-open-issues.md`](./angular-cem-related-open-issues.md)
- Angular CLI diagnostics presentation and watch behavior:
  [`angular-cli-follow-up.md`](./angular-cli-follow-up.md)
