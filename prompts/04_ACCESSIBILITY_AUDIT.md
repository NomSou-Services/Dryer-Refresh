# Grok Prompt — Accessibility Audit

Perform an accessibility-focused review of the affected routes.

Check:
- semantic landmarks,
- page title and heading hierarchy,
- keyboard navigation,
- visible focus,
- accessible names,
- form labels and errors,
- image alternatives,
- contrast,
- reduced motion,
- dialog/menu semantics if present,
- status/error announcements if present.

Prefer native HTML semantics over unnecessary ARIA.

Fix verified issues without changing the intended design more than necessary.

Run lint/type/build checks afterwards.
