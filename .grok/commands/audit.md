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
11. this command file
12. the files directly related to the requested change

General rules:

- Treat the command name as the user's requested workflow.
- Inputs may be supplied as `key: value`, bullets, or plain language after the command.
- Do not invent business claims, testimonials, certifications, prices, addresses, awards, statistics, or legal/compliance claims.
- If a non-critical input is missing, use the safest reasonable default and state it under `Assumptions`.
- If an input is truly blocking, stop before destructive work and report exactly what is missing.
- Never change unrelated files.
- Never claim a validation step passed unless you actually ran it.
- Preserve existing working behavior unless the command explicitly requests a change.


# `/audit`

Audit the requested scope without silently turning the task into a redesign or feature build.

## Expected inputs

### Required

- `scope` — route, component, feature, or `site`

### Optional

- `areas` — any of: `code`, `responsive`, `accessibility`, `forms`, `interactions`, `component-states`, `ui-consistency`, `performance`, `seo`, `security`, `content-integrity`
- `mode` — `report` or `fix`; default `report`
- `severity` — minimum severity to report; default `low`
- `route`
- `notes`

If `areas` is omitted, audit all applicable areas.

## Workflow

1. Read the relevant files and existing QA docs.
2. Establish what is actually implemented before judging it.
3. Run available static checks.
4. Inspect each requested audit area.
5. Separate verified defects from suggestions.
6. Assign severity:
   - `critical` — security/data/release blocker
   - `high` — broken core behavior, major accessibility, serious SEO/security issue
   - `medium` — meaningful UX/maintainability/performance issue
   - `low` — polish or minor maintainability issue
7. In `report` mode, do not edit files.
8. In `fix` mode, fix only high-confidence issues within scope, then re-run validation.
9. Do not manufacture Lighthouse or browser-testing results that were not actually measured.

## Validation

Always run when available:

```bash
npm run lint
npm run typecheck
```

For `scope: site`, `mode: fix`, or route-level concerns:

```bash
npm run build
```

Audit categories should cover, when applicable:

- responsive behavior,
- component states,
- form UX and validation behavior,
- interaction patterns,
- accessibility,
- performance architecture,
- SEO,
- security,
- broken links/imports,
- duplicate or dead code,
- content integrity.

## Output format

```text
Command: /audit
Status: PASS | PASS WITH NOTES | BLOCKED

Scope:
Mode:
Areas:

Findings:
1. [SEVERITY] Title
   Evidence:
   Impact:
   File:
   Recommended action:
   Fixed: yes/no

Validation:
- ...

Files changed:
- none   # report mode
# OR list them in fix mode

Release blockers:
- none
# OR exact blockers

Follow-ups:
- ...
```
