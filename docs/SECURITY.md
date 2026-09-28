# Security Baseline

This starter intentionally uses a conservative baseline and avoids pretending that one static configuration secures every website.

## Never do this

- Commit API keys, tokens, passwords, private certificates, or database credentials.
- Put a server secret in a variable beginning with `NEXT_PUBLIC_`.
- Trust client-side validation as a security boundary.
- Render user-controlled HTML through `dangerouslySetInnerHTML`.
- Disable security protections only to silence an integration error.

## Input

For forms, route handlers, server actions, uploads, and webhooks:

- validate type, format, length, and allowed values on the server;
- reject unexpected fields where practical;
- normalize only when normalization is safe;
- enforce rate limiting at an appropriate platform boundary;
- never rely solely on hidden form fields.

## Authentication / authorization

If authentication is added:

- use a maintained auth system rather than building password storage yourself;
- verify authorization on every protected server operation;
- do not rely on hiding UI as authorization;
- use secure, HTTP-only cookies where the chosen auth system supports them.

## Content Security Policy

Do not copy a permissive CSP blindly.

Create the CSP after you know:

- analytics provider
- image/CDN hosts
- font hosts
- payment provider
- video/embed providers
- API origins
- script requirements

Prefer nonces or hashes for scripts when your deployment architecture supports them. Avoid broad wildcards.

## Headers included by default

`next.config.ts` includes:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- restrictive Permissions Policy for camera, microphone, and geolocation
- `Cross-Origin-Opener-Policy: same-origin`

Review these for each project's real integrations.

## Dependencies

Before release:

```bash
npm audit
npm outdated
```

Investigate findings instead of applying destructive upgrades blindly.

## Secrets

Use environment variables supplied by the hosting platform.

`.env.local` is for local secrets and is ignored by Git.

Commit only `.env.example` with placeholders.
