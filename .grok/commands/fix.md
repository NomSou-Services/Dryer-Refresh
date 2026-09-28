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


# `/fix`

Diagnose and fix a specific defect at its root cause.

## Expected inputs

### Required

- `problem` — concise defect description

### Strongly recommended

- `expected`
- `actual`
- `reproduction`
- `scope` — route/component/file

### Optional

- `error_message`
- `logs`
- `screenshots`
- `first_seen`
- `recent_changes`
- `constraints`

## Workflow

1. Reproduce or trace the problem from available evidence.
2. Inspect the narrowest relevant code path.
3. State the likely root cause before editing.
4. Distinguish root cause from symptoms.
5. Implement the smallest root-cause fix.
6. Do not add broad workarounds, disable checks, or swallow errors to make the symptom disappear.
7. Add or improve a regression guard when practical.
8. If two fixes have already failed, stop and reassess architecture/dependencies before another patch.
9. Run focused tests/checks, then normal validation.

## Validation

Required:

```bash
npm run lint
npm run typecheck
```

Run:

```bash
npm run build
```

for routing, rendering, configuration, dependency, server/client boundary, or production-only issues.

Also verify the original reproduction path no longer fails when that path can be tested.

## Output format

```text
Command: /fix
Status: PASS | PASS WITH NOTES | BLOCKED

Problem:
Root cause:
Why it happened:

Fix:
- ...

Files changed:
- ...

Regression protection:
- ...

Validation:
- PASS — ...
- NOT RUN — ... + reason

Remaining risk:
- ...
```
