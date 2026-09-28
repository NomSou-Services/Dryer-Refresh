# Grok Command Contract

Always read:

1. `/AGENTS.md`
2. `/.grok/COMMANDS.md`
3. `/design/DESIGN_TOKENS.md`
4. `/design/COLOR_BALANCE.md`
5. `/design/tokens.json`
6. `/.grok/contracts/design-tokens.schema.json`
7. `/.grok/contracts/color-balance.schema.json`
8. this command file

# `/design-tokens`

Create, update, or audit the repository's canonical visual primitives.

## Expected inputs

### Required

- `mode` — `create`, `update`, or `audit`
- `source` — the approved design source, such as Figma, brand guide, client brief, or existing site

### Optional

- `colors`
- `typography`
- `spacing`
- `radii`
- `shadows`
- `motion`
- `breakpoints`
- `color_balance` — optional client-specific interpretation of the 60/30/10 roles
- `constraints`
- `notes`

## Workflow

1. Inspect the current design-token contract and token file.
2. Inspect the supplied source.
3. Preserve existing semantic token names when possible.
4. Change `design/tokens.json` first.
5. Reflect approved token changes in `src/styles/tokens.css`.
6. Never remove or rename an in-use token silently.
7. Apply the 60/30/10 color-balance roles from `design/COLOR_BALANCE.md`: dominant/base ≈ 60%, secondary/supporting ≈ 30%, accent/emphasis ≈ 10%.
8. Treat the ratio as approximate visual hierarchy; accessibility and semantic state colors take precedence.
9. Keep all required top-level token groups present.
10. Keep breakpoints strictly increasing.
11. Prefer semantic colors over component-specific color names.
12. Do not add arbitrary one-off values when an existing token can serve the design.

## Validation

Required:

```bash
npm run tokens:check
npm run lint
npm run typecheck
```

Run `npm run build` when token changes affect application rendering or Tailwind/CSS integration.

## Output format

```text
Command: /design-tokens
Status: PASS | PASS WITH NOTES | BLOCKED

Mode:
Source:

Token changes:
- Colors:
- Typography:
- Spacing:
- Radii:
- Shadows:
- Motion:
- Breakpoints:
- Color balance:

Files changed:
- ...

Validation:
- PASS/FAIL — token contract
- PASS/FAIL — lint
- PASS/FAIL — typecheck
- PASS/FAIL/NOT RUN — build

Compatibility notes:
- ...

Risks / follow-ups:
- ...
```
