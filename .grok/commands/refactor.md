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


# `/refactor`

Improve structure or maintainability while preserving user-visible behavior unless a behavior change is explicitly requested.

## Expected inputs

### Required

- `target` — component, route, folder, pattern, or concern
- `goal` — what should become better

### Strongly recommended

- `preserve` — behaviors/contracts that must not change
- `pain_points`
- `scope_limit`

### Optional

- `desired_pattern`
- `performance_goal`
- `dependency_constraints`
- `migration_notes`

## Workflow

1. Run or inspect baseline validation before changing code.
2. Map dependencies and public component/API contracts.
3. Identify specific smells:
   - duplication,
   - oversized components,
   - confused server/client boundaries,
   - mixed data/presentation,
   - prop explosion,
   - circular/fragile dependencies,
   - inconsistent naming,
   - dead code.
4. Propose the smallest refactor sequence.
5. Refactor incrementally rather than rewriting the entire target.
6. Preserve behavior and public APIs unless the input allows changes.
7. Delete obsolete code only after references are verified.
8. Do not introduce a new abstraction unless it reduces real repetition or complexity.
9. Re-run validation and compare against baseline.

## Validation

Before changes when practical:

```bash
npm run lint
npm run typecheck
```

After changes:

```bash
npm run lint
npm run typecheck
npm run build
```

Verify:

- requested behavior is preserved,
- routes still render,
- component interfaces are intentional,
- no dead imports/files remain,
- no extra client-side JavaScript was introduced without need.

## Output format

```text
Command: /refactor
Status: PASS | PASS WITH NOTES | BLOCKED

Target:
Goal:

Before:
- ...

Refactor performed:
- ...

Behavior preserved:
- ...

Files changed:
- ...

Validation:
- Baseline:
- After:

Trade-offs:
- ...

Follow-ups:
- ...
```
