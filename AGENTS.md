# Grok Coding Agent Rules

This repository is designed to be edited by a coding agent such as Grok Build or Grok selected inside an IDE agent.

## Operating model

You are the implementation agent. The human is the product owner and final reviewer.

Before changing code:

1. Read `README.md`.
2. Read this file fully.
3. Read `docs/ARCHITECTURE.md`.
4. Read the relevant prompt under `prompts/`.
5. Inspect the files directly involved in the request.
6. For a non-trivial change, state a short plan before editing.


## Slash commands and mandatory router gate

When a user request begins with one of these commands:

- `/new-client`
- `/build-page`
- `/build-section`
- `/design-tokens`
- `/audit`
- `/ux-audit`
- `/ui-audit`
- `/fix`
- `/refactor`
- `/ship`

you MUST run the repository command router **before editing any repository file**.

The router is:

```bash
npm run grok:route
```

Pass the user's complete slash-command request to it through stdin, `--file`, or `--text`. Example:

```bash
printf '%s\n' '/build-page' 'route: /services' 'goal: Generate qualified leads' | npm run grok:route
```

The router will:

1. detect the supported slash command,
2. validate that command's required inputs,
3. load the matching file from `/.grok/commands/`,
4. return `PASS` only when the command is safe to begin.

If the router exits non-zero or reports `BLOCKED`, do not edit the repo. Report the exact missing required inputs instead.

After a `PASS`, follow the loaded command prompt plus this `AGENTS.md`. Treat these as repository workflow commands even if the current Grok client does not provide native custom slash-command registration.

## Core rules

- Use Next.js App Router, TypeScript, and Tailwind CSS.
- Keep TypeScript strict. Do not use `any` unless there is a documented reason.
- Prefer React Server Components. Add `"use client"` only when browser state, effects, or browser-only APIs are truly required.
- Build one vertical slice at a time.
- Reuse existing UI, layout, and section components before creating new ones.
- Do not create near-duplicate components.
- Do not install a package unless the requirement cannot reasonably be met with the current stack.
- Do not modify unrelated files.
- Keep content/data separate from reusable presentation components when practical.
- Use semantic HTML before ARIA.
- Every interactive element must be keyboard accessible.
- Preserve visible focus states.
- Respect reduced-motion preferences.
- Use `next/link` for internal navigation.
- Use `next/image` for content images when optimization is useful.
- Never hard-code secrets, tokens, API keys, passwords, or private URLs.
- Never expose server-only secrets through `NEXT_PUBLIC_*`.
- Validate untrusted input at the server boundary.
- Do not use `dangerouslySetInnerHTML` for user-controlled content.
- If rendering JSON-LD, serialize only trusted application-owned data.
- Do not weaken security headers just to make a third-party integration work. Explain the required change first.
- Do not claim a task is complete if lint, type-check, or build is failing.

## UI rules

- Mobile-first.
- Use the 60/30/10 color-balance rule as the default composition hierarchy: approximately 60% dominant/base surfaces, 30% secondary/supporting surfaces, and 10% accent/emphasis. Treat it as a visual guideline rather than pixel-exact math; accessibility, semantic state colors, and approved references take precedence.
- Keep accent color scarce enough that primary CTAs and important states retain emphasis.
- Avoid arbitrary magic numbers when a design token or normal utility works.
- Components must work at 320px, 375px, 430px, 768px, 1024px, 1440px, and wide desktop layouts.
- Avoid horizontal scrolling.
- Use a clear heading hierarchy.
- Buttons and links must have accessible names.
- Forms must have programmatic labels and useful error messages.
- Decorative imagery should not create noisy alt text.

## Change workflow

For each feature:

1. Inspect.
2. Plan.
3. Implement the smallest useful slice.
4. Run relevant checks.
5. Fix root causes rather than stacking patches.
6. Summarize what changed, files touched, checks run, and any risks.

If two attempted fixes fail, stop patching and reassess the architecture before trying again.

## Required checks

For code changes, run as applicable:

```bash
npm run lint
npm run typecheck
npm run build
```

Use `npm run qa` before a release.

## Definition of done

A feature is done only when it:

- matches the requested behavior,
- works responsively,
- is keyboard accessible,
- does not introduce TypeScript or lint errors,
- does not expose secrets,
- has appropriate metadata or SEO handling when it creates a public route,
- handles loading/error/empty states when relevant,
- builds successfully for production.

## Agent response format

End implementation work with:

- Summary
- Files changed
- Validation performed
- Remaining risks / follow-ups

Do not produce a giant implementation dump when a focused patch will do.


### Strict field validation

The command router uses per-command field allowlists.

- Unknown fields are blocking errors.
- Misspelled field names are not silently ignored.
- The router reports the full list of allowed fields for the detected command.
- Do not edit repository files until both required-field and allowed-field validation pass.


### Duplicate field validation

The command router rejects repeated input keys before any repository edit.

- Duplicate detection happens after field-name normalization.
- `Client Name`, `client-name`, and `client_name` are treated as the same key.
- Repeated keys are never resolved by "last value wins."
- The router reports the conflicting normalized field plus the raw spellings it received.
- Grok must not edit repository files until duplicates are removed.


### Malformed input validation

The router blocks malformed command syntax before any repo edit.

- Fields must use `key: value` or `key=value`.
- Empty required values count as missing.
- Repeated slash-command headers are blocking.
- Continuation/list lines are valid only after a field.


## Design token contract

For visual implementation work, read:

- `design/DESIGN_TOKENS.md`
- `design/tokens.json`
- `.grok/contracts/design-tokens.schema.json`

`design/tokens.json` is the canonical visual primitive source. Do not invent arbitrary color, type, spacing, radius, shadow, motion, or breakpoint values when the token system can represent the requirement.

Before completing a token change, run:

```bash
npm run tokens:check
npm run tokens:usage
```


## UX/UI contracts

Before `/build-page` implementation and before `/audit` findings, read and apply:

- `design/COMPONENT_STATES.md`
- `design/RESPONSIVE_BEHAVIOR.md`
- `design/FORMS.md`
- `design/INTERACTION_PATTERNS.md`
- `design/ACCESSIBILITY.md`

These are product-quality contracts, not optional inspiration. If a component or page intentionally deviates, explain the reason in the command output.


## Specialized UX/UI audits

Use `/ux-audit` for usability, task flow, forms, feedback, responsive UX, accessibility, trust, and cognitive load.

Use `/ui-audit` for design-token adherence, typography, spacing, grid/alignment, component consistency, states, imagery, motion, responsive UI, and visual hierarchy.

Both specialized audits:
- use the shared severity scale;
- separate verified defects from suggestions;
- support `mode: report` and `mode: fix`;
- load machine-readable output schemas;
- must not fabricate browser, usability, analytics, or visual-regression evidence.


## Audit artifact CI

For committed `/ux-audit` and `/ui-audit` reports:

- store findings under `audits/findings/ux` or `audits/findings/ui`;
- store deterministic generated reports under the matching `reports/audits/ux` or `reports/audits/ui` path;
- keep the same basename for the draft, JSON report, and Markdown report;
- never hand-edit generated reports without updating the findings draft;
- run `npm run audit:ci` before shipping.

CI treats stale or orphaned audit reports as failures.


## Pull request audit comment

`npm run audit:comment` renders the CI pull-request summary from validated JSON reports in `reports/audits/ux` and `reports/audits/ui`.

Do not hand-author the PR summary. Keep report JSON valid and deterministic; CI derives severity totals, grouped findings, and prioritized remediation automatically.


Audit finding IDs are compared across PR commits using the composite identity `<report-basename>:<finding-id>`. Keep IDs stable within the same report when an issue persists so CI can distinguish new, resolved, and severity-changed findings.

Use repository-relative paths in audit finding `files` arrays. CI turns those paths into commit-pinned GitHub links for new, resolved, and severity-changed findings.


Every committed audit finding must include exact `locations` entries with repository-relative `file`, 1-based `startLine`, and optional `endLine`. Do not invent line numbers. CI uses these values to create commit-pinned GitHub line links.


PR audit line links are diff-aware. For new and severity-changed findings, CI intersects recorded `locations` with actual `git diff --unified=0` head-side line ranges. Keep finding locations precise enough to overlap the code change that introduced or changed the issue. Resolved findings remain pinned to the previous commit.


PR audit comments render the matching Git diff hunk beneath new and severity-changed findings. Hunk selection must be based on actual added head-side lines that overlap the finding's recorded `locations`. Resolved findings must remain linked to previous-commit source and must not receive a current-head diff hunk.


Inline PR audit hunks collapse unchanged context to one surrounding line by default. Never remove actual added/removed lines from the displayed hunk. Use explicit omission markers for collapsed unchanged spans.


Displayed PR audit diff hunks are changed-only: preserve the hunk header, every added/removed line, and relevant no-newline markers; omit all unchanged context and omission placeholders. Resolved findings remain hunk-free.


Group adjacent added/removed audit diff lines into one compact block. If unchanged source separated edits in the original hunk, preserve that separation as distinct displayed change clusters; never concatenate unrelated edits merely because context is hidden.


Each displayed audit change cluster must include a repository-relative source file and exact line range above its diff block. Prefer head-side ranges for additions/replacements; use the previous-commit range for deletion-only clusters. Do not show unrelated clusters from the same Git hunk when they do not overlap the finding's changed source locations.

Cluster source labels must be one compact line containing only the clickable repository-relative `path:Lx-Ly`; append `(previous)` only for prior-commit deletion-only ranges.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
