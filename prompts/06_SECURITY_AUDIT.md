# Grok Prompt — Security Audit

Read `docs/SECURITY.md`.

Perform a defensive security review of this project.

Look for:
- exposed secrets,
- unsafe `NEXT_PUBLIC_` variables,
- missing server-side validation,
- injection risks,
- XSS or unsafe HTML rendering,
- broken authorization assumptions,
- insecure redirect handling,
- risky file uploads,
- insecure webhooks,
- over-broad CORS,
- risky third-party scripts,
- missing security headers,
- dependency concerns.

For each verified issue report:
- severity,
- affected file,
- realistic abuse case,
- recommended fix.

Fix high-confidence issues that are in scope.

Do not weaken security controls just to make tests pass.
