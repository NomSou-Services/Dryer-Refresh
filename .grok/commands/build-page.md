# Grok Command Contract

This command is part of the repository's Grok command system.

Always read, in this order:

1. `/AGENTS.md`
2. `/.grok/COMMANDS.md`
3. `/docs/ARCHITECTURE.md`
4. `/docs/DEFINITION_OF_DONE.md`
5. `/design/DESIGN_TOKENS.md`
6. `/design/COMPONENT_STATES.md`
7. `/design/RESPONSIVE_BEHAVIOR.md`
8. `/design/FORMS.md`
9. `/design/INTERACTION_PATTERNS.md`
10. `/design/ACCESSIBILITY.md`
11. `/design/COLOR_BALANCE.md`
12. this command file
13. the files directly related to the requested change

General rules:

- Treat the command name as the user's requested workflow.
- Inputs may be supplied as `key: value`, bullets, or plain language after the command.
- Do not invent business claims, testimonials, certifications, prices, addresses, awards, statistics, or legal/compliance claims.
- If a non-critical input is missing, use the safest reasonable default and state it under `Assumptions`.
- If an input is truly blocking, stop before destructive work and report exactly what is missing.
- Never change unrelated files.
- Never claim a validation step passed unless you actually ran it.
- Preserve existing working behavior unless the command explicitly requests a change.


# `/build-page`

Build one complete public route by composing existing sections first and adding new reusable sections only when necessary.

## Expected inputs

### Required

- `route` — e.g. `/services`
- `goal` — what the page should help the visitor do

### Strongly recommended

- `sections` — ordered section list
- `content_source` — client brief, supplied copy, data file, approved Figma, etc.
- `primary_cta`
- `seo_topic`
- `design_direction`

### Optional

- `reference`
- `interactions`
- `schema_type`
- `conversion_notes`
- `constraints`
- `new_components_allowed` — default `true`, but reuse first

## Workflow

1. Inspect the route, existing section library, config, data files, and approved source material.
2. Determine whether the route already exists and what behavior must be preserved.
3. Produce a short implementation plan with:
   - section order,
   - reused components,
   - new components,
   - route data location,
   - metadata needs.
4. Build the page from reusable sections.
5. Keep route-level files thin; move reusable presentation into `src/components/sections`.
6. Keep business copy in `src/data` or approved source-backed structures where practical.
7. Add route metadata using the existing SEO utilities/patterns.
8. Add structured data only if accurate and appropriate.
9. Check loading, empty, and error states if the page depends on runtime data.
10. Apply the component-state, responsive, forms, interaction, and accessibility contracts.
11. For every interactive control, identify applicable states before implementation.
12. For forms, verify labels, validation, error recovery, loading, success, and duplicate-submit prevention.
13. Verify content/action priority at mobile, tablet, and desktop widths.
14. Apply the 60/30/10 color-balance rule across the page composition: dominant/base ≈ 60%, secondary/supporting ≈ 30%, accent/emphasis ≈ 10%, unless an approved reference or accessibility need justifies an exception.
15. Run full validation.

## Validation

Required:

```bash
npm run lint
npm run typecheck
npm run build
```

Review the page at:

- 320px
- 375px
- 430px
- 768px
- 1024px
- 1440px

Check:

- one clear `h1`,
- logical heading order,
- keyboard navigation,
- visible focus,
- no horizontal overflow,
- internal links use Next.js routing,
- images are appropriately optimized,
- unique metadata,
- no fake claims,
- no exposed secrets,
- required component states are present,
- forms satisfy the form contract,
- interaction patterns are keyboard/touch appropriate,
- responsive behavior preserves action priority,
- accessibility checks are reviewed against the accessibility contract.

## Output format

```text
Command: /build-page
Status: PASS | PASS WITH NOTES | BLOCKED

Route:
Goal:

Implementation:
- Sections:
- Reused components:
- New components:
- SEO:

Files changed:
- ...

Validation:
- PASS — lint
- PASS — typecheck
- PASS — build
- MANUAL CHECK — responsive/accessibility findings

Assumptions:
- ...

Risks / follow-ups:
- ...

Recommended next command:
/build-section ... OR /audit scope: <route>
```
