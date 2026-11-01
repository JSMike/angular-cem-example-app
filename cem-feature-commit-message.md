# Proposed CEM feature commit message

```text
feat(compiler): type-check web components via Custom Elements Manifests

CUSTOM_ELEMENTS_SCHEMA admits every hyphenated element and property, so
applications must trade away template diagnostics to consume web components.
Add the customElementsManifests compiler option to describe those elements
from manifests published by their libraries.

Use manifest declarations to check element and property existence, binding
values, string-literal static values, event payloads, and local-reference types.
Expose the same metadata through Language Service completions, quick info,
documentation, and deprecation status.

Treat manifest contents as untrusted input. Validate type text and exact
referenced TypeScript exports before generating type-check code. Report
NG4007-NG4014 diagnostics and apply narrow fail-closed fallbacks when metadata
cannot be trusted or consumed CEM records are structurally inconsistent. Cache
content-validated manifest loads across Language Service compiler instances
without weakening resource invalidation.

Summarize repeated manifest warnings by default and add the
customElementsManifestsDiagnostics option for lossless itemized output.

Preserve exact JavaScript property names for manifest-declared bindings while
retaining native DOM remapping and sanitization. Carry the exact-name marker
through full and partial compilation, linking, HMR, and backward-compatible
runtime instruction arguments.

Closes #36893
```

The `compiler` scope reflects the primary user-facing change: Angular template compilation gains
manifest-backed knowledge of custom elements. The implementation also spans `compiler-cli`, `core`,
and `language-service`, but the commit format permits only one scope.

The footer closes #36893 because the feature provides the requested custom-element property and
event completions, descriptions, and types in Angular templates. The remaining related issues have
broader scopes or propose different mechanisms, so the PR should use non-closing cross-references
for them. See
[`angular-cem-related-open-issues.md`](./angular-cem-related-open-issues.md) for the recommended
issue wording.
