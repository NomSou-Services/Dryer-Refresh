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


# `/ship`

Perform the final release gate and prepare a deployable handoff.

This command does **not** imply permission to push, merge, publish, or deploy. Those actions require an explicit user request and an available authenticated tool/workflow.

## Expected inputs

### Required

- `release_scope` — what is intended to ship

### Strongly recommended

- `environment` — preview, staging, production
- `release_name` or `version`
- `known_changes`

### Optional

- `deployment_target`
- `known_risks`
- `analytics_expectations`
- `form_endpoints`
- `manual_test_routes`
- `rollback_note`

## Workflow

1. Read `docs/DEFINITION_OF_DONE.md` and `docs/SECURITY.md`.
2. Inspect `git status` and relevant diff when git is available.
3. Check for accidental debug code, placeholder/demo content, secrets, and unrelated changes.
4. Run release validation.
5. Review important public routes and metadata.
6. Review forms/integrations/configuration that are in release scope.
7. Confirm sitemap/robots behavior is appropriate for the target environment.
8. Confirm environment variables required by the code are documented.
9. Produce release notes from actual changes.
10. Mark the release `BLOCKED` if required checks fail or known critical/high release blockers remain.
11. Do not deploy or push unless the user explicitly requests that separate action.

## Validation

Required:

```bash
npm run qa
git diff --check
```

When git is available:

```bash
git status --short
git diff --stat
```

Also verify:

- no committed secrets,
- no obvious demo copy,
- no broken internal route references found in changed code,
- production metadata is sensible,
- `robots.ts` will not accidentally block the intended production site,
- error/404 handling exists,
- known forms and CTAs point to intended destinations,
- accessibility and responsive audits have no known blockers.

## Output format

```text
Command: /ship
Status: PASS | PASS WITH NOTES | BLOCKED

Release:
Environment:
Scope:

Release gate:
- PASS — lint
- PASS — typecheck
- PASS — build
- PASS — git diff check
- PASS/NOTE — content integrity
- PASS/NOTE — SEO
- PASS/NOTE — accessibility
- PASS/NOTE — security

Release blockers:
- none
# OR exact blockers

Release notes:
- ...

Changed files summary:
- ...

Environment/config required:
- ...

Manual smoke tests:
- ...

Rollback / risk notes:
- ...

Deployment authorization:
- NOT REQUESTED
```
