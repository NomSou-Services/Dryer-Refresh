# Grok Command Contract

This command is part of the repository's Grok command system.

Always read, in this order:

1. `/AGENTS.md`
2. `/.grok/COMMANDS.md`
3. `/docs/ARCHITECTURE.md`
4. `/docs/DEFINITION_OF_DONE.md`
5. this command file
6. the files directly related to the requested change

General rules:

- Treat the command name as the user's requested workflow.
- Inputs may be supplied as `key: value`, bullets, or plain language after the command.
- Do not invent business claims, testimonials, certifications, prices, addresses, awards, statistics, or legal/compliance claims.
- If a non-critical input is missing, use the safest reasonable default and state it under `Assumptions`.
- If an input is truly blocking, stop before destructive work and report exactly what is missing.
- Never change unrelated files.
- Never claim a validation step passed unless you actually ran it.
- Preserve existing working behavior unless the command explicitly requests a change.


# `/new-client`

Initialize this starter for a new client without prematurely building the full site.

## Expected inputs

### Required

- `client_name` — public business/client name
- `industry` — what the business does
- `primary_goal` — main business outcome for the site

### Strongly recommended

- `audience`
- `site_type` — brochure, lead-gen, portfolio, ecommerce front end, etc.
- `pages`
- `primary_cta`
- `brand_direction`
- `content_status` — final, draft, missing, migrating
- `assets` — logo, photography, video, icons
- `integrations`
- `seo_targets` — topics and/or legitimate service areas
- `contact_details`
- `references` — approved inspiration or Figma source

### Optional

- `hosting`
- `analytics`
- `cms`
- `forms`
- `constraints`
- `deadline_note`

## Workflow

1. Inspect the starter and confirm there is no client-specific data that should be preserved.
2. Create or update `docs/client/CLIENT_BRIEF.md`.
3. Create or update `docs/client/CONTENT_STATUS.md`.
4. Update `src/config/site.ts` with verified client-level configuration.
5. Replace demo homepage data in `src/data/home.ts` only when usable client copy exists.
6. Create a route/page plan in `docs/client/SITE_MAP.md`.
7. Record integrations and unknowns in the client brief.
8. Do **not** invent missing claims or write fake testimonials.
9. Do **not** build all pages unless the request explicitly includes implementation.
10. Remove obviously misleading starter/demo business content if it could be mistaken for final client content.
11. Run focused validation if source files changed.

## Validation

Required when code/config changes:

```bash
npm run lint
npm run typecheck
```

Also verify:

- no secrets were placed in committed files,
- no fake business facts were introduced,
- `siteConfig` values are internally consistent,
- demo content is clearly removed, replaced, or marked as placeholder,
- proposed routes match the documented site map.

## Output format

```text
Command: /new-client
Status: PASS | PASS WITH NOTES | BLOCKED

Client setup:
- Client:
- Industry:
- Primary goal:
- Primary CTA:
- Planned routes:

Created / updated:
- ...

Known inputs:
- ...

Assumptions / placeholders:
- ...

Missing client content:
- ...

Validation:
- ...

Recommended next command:
/build-page route: ...
```
