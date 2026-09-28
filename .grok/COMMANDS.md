# Grok Slash Command System

This repository uses a lightweight repo-level slash-command convention.

These are **repository instructions**, not a claim that every Grok client or IDE automatically registers native slash commands. When the user begins a request with one of the commands below, treat it as an instruction to load and follow the matching file.

## Command routing

| User command | Load |
|---|---|
| `/new-client` | `.grok/commands/new-client.md` |
| `/build-page` | `.grok/commands/build-page.md` |
| `/build-section` | `.grok/commands/build-section.md` |
| `/design-tokens` | `.grok/commands/design-tokens.md` |
| `/audit` | `.grok/commands/audit.md` |
| `/ux-audit` | `.grok/commands/ux-audit.md` |
| `/ui-audit` | `.grok/commands/ui-audit.md` |
| `/fix` | `.grok/commands/fix.md` |
| `/refactor` | `.grok/commands/refactor.md` |
| `/ship` | `.grok/commands/ship.md` |


## Mandatory pre-edit router gate

Before Grok edits any repository file for a slash command, pass the complete request through:

```bash
npm run grok:route
```

Examples:

```bash
printf '%s\n' '/audit' 'scope: site' | npm run grok:route

node scripts/grok-command-router.mjs --file .grok/examples/request-build-page.txt
```

Exit behavior:

- `0` — recognized command, required inputs present, matching command prompt loaded.
- `2` — recognized/parsed request is blocked because required inputs are missing, or the command is unknown.
- `64` — no request was supplied.
- `70` — router/runtime error.

A non-zero exit is a hard pre-edit stop. Do not modify repository files until the request passes.

For machine-readable orchestration:

```bash
npm run grok:route -- --json --file .grok/examples/request-build-page.txt
```

## Input syntax

Preferred:

```text
/build-page
route: /services
goal: Convert qualified visitors into quote requests
sections: hero, service-grid, process, faq, cta
seo_topic: residential roofing services
content_source: client brief
notes: Keep visual direction minimal and premium
```

Compact form is also valid:

```text
/build-section hero on /services, use the existing content, dark variant, no animation
```

Do not require exact formatting if the intent is clear.

## Global execution phases

Every command should use the phases that apply:

```text
UNDERSTAND
→ INSPECT
→ PLAN
→ IMPLEMENT / ANALYZE
→ VALIDATE
→ REPORT
```

## Global validation levels

### Focused validation

Use for small isolated edits:

```bash
npm run lint
npm run typecheck
```

### Full validation

Use for route-level, architectural, release, or risky changes:

```bash
npm run lint
npm run typecheck
npm run build
```

### Release validation

Use for `/ship`:

```bash
npm run qa
git diff --check
```

Also inspect `git status` and the relevant diff when git is available.

## Global response format

Unless a command overrides it, finish with:

```text
Command:
Status: PASS | PASS WITH NOTES | BLOCKED

Summary:
- ...

Assumptions:
- ...

Files changed:
- ...

Validation:
- PASS — ...
- FAIL — ...
- NOT RUN — ...

Risks / follow-ups:
- ...
```

Never hide failures inside prose. A failed required validation means the command cannot report `PASS`.
