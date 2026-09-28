# Grok Command Contract

This command is part of the repository's Grok command system.

Always read, in this order:

1. `/AGENTS.md`
2. `/.grok/COMMANDS.md`
3. `/docs/ARCHITECTURE.md`
4. `/docs/DEFINITION_OF_DONE.md`
5. `/design/DESIGN_TOKENS.md`
6. `/design/COLOR_BALANCE.md`
7. this command file
8. the files directly related to the requested change

General rules:

- Treat the command name as the user's requested workflow.
- Inputs may be supplied as `key: value`, bullets, or plain language after the command.
- Do not invent business claims, testimonials, certifications, prices, addresses, awards, statistics, or legal/compliance claims.
- If a non-critical input is missing, use the safest reasonable default and state it under `Assumptions`.
- If an input is truly blocking, stop before destructive work and report exactly what is missing.
- Never change unrelated files.
- Never claim a validation step passed unless you actually ran it.
- Preserve existing working behavior unless the command explicitly requests a change.


# `/build-section`

Build or update one reusable page section with the smallest reasonable scope.

## Expected inputs

### Required

- `section` — hero, FAQ, testimonial grid, service cards, CTA, etc.
- `purpose` — what this section must communicate or accomplish

### Strongly recommended

- `route` — where it will first be used
- `content`
- `variant`
- `cta`
- `design_direction`

### Optional

- `interaction`
- `reference`
- `data_shape`
- `reusability_notes`
- `animation`
- `constraints`

## Workflow

1. Search for an existing component that already solves most of the requirement.
2. Reuse or extend before creating a near-duplicate.
3. Decide the component API before writing implementation.
4. Keep the section server-rendered unless real interaction requires a client boundary.
5. Make copy/data configurable rather than embedding client-specific text in a generally reusable component.
6. Implement the smallest complete section.
7. Integrate it into the requested route only.
8. Avoid adding packages for simple UI behavior.
9. If the section materially affects page color composition, preserve the 60/30/10 hierarchy: dominant/base ≈ 60%, secondary/supporting ≈ 30%, accent/emphasis ≈ 10%; do not overuse the accent token.
10. Run focused validation; run a build if the change affects rendering, imports, or route composition materially.

## Validation

Minimum:

```bash
npm run lint
npm run typecheck
```

Also check:

- 320px through desktop responsiveness,
- semantic section/heading structure,
- keyboard access for interactions,
- focus state,
- reduced-motion behavior when animation is present,
- no duplicate component introduced,
- no unnecessary `"use client"`.

Run:

```bash
npm run build
```

when the section introduces a new dependency, dynamic behavior, route-level metadata interaction, or non-trivial import changes.

## Output format

```text
Command: /build-section
Status: PASS | PASS WITH NOTES | BLOCKED

Section:
Purpose:
Used on:

Component API:
- ...

Implementation:
- Reused:
- Added:
- Client boundary: yes/no + reason

Files changed:
- ...

Validation:
- ...

Assumptions:
- ...

Risks / follow-ups:
- ...
```
