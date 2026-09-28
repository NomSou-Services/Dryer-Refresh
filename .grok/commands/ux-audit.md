# Grok Command Contract

Always read:

1. `/AGENTS.md`
2. `/.grok/COMMANDS.md`
3. `/design/UX_AUDIT.md`
4. `/design/COMPONENT_STATES.md`
5. `/design/RESPONSIVE_BEHAVIOR.md`
6. `/design/FORMS.md`
7. `/design/INTERACTION_PATTERNS.md`
8. `/design/ACCESSIBILITY.md`
9. the loaded machine-readable contracts
- `/.grok/templates/audits/ux-audit-report.md`
- `/.grok/templates/audits/ux-audit-report.json`
10. this command file

# `/ux-audit`

Audit usability and task completion. Do not silently turn the audit into a redesign.

## Expected inputs

### Required
- `scope`
- `goal`

### Optional
- `areas`
- `mode` — `report` or `fix`, default `report`
- `severity` — minimum severity, default `low`
- `route`
- `audience`
- `primary_action`
- `notes`

## Workflow

1. Establish the user's intended goal and primary task.
2. Inspect implementation before judging it.
3. Review all applicable UX check areas.
4. Separate verified defects from suggestions.
5. Assign severity using `design/UX_AUDIT.md`.
6. In `report` mode, do not modify files.
7. In `fix` mode, make only high-confidence scoped fixes.
8. Re-run relevant validation after fixes.
9. Return machine-readable JSON matching `.grok/contracts/ux-audit-output.schema.json`.

## Required validation

Run when available:

```bash
npm run lint
npm run typecheck
```

Run `npm run build` for route-level, site-wide, or fix-mode work.


## Report templates

Use:

```text
.grok/templates/audits/ux-audit-report.md
.grok/templates/audits/ux-audit-report.json
```

Requirements:

- summary counts must reconcile with `findings`;
- `groupedFindings` must group finding IDs by audit area;
- `prioritizedRemediation` must order actions from `P0` through `P3`;
- every remediation item must reference one or more real finding IDs;
- do not duplicate a finding merely to place it in a group;
- omit empty Markdown finding groups, but keep all severity-count rows;
- JSON output must conform to the corresponding audit-output schema.


## Report generation

After findings are finalized, write the findings draft as JSON and generate both report formats with:

```bash
node scripts/generate-audit-report.mjs ux <findings.json> --out-dir reports/audits
```

The generator:

- validates the finding draft before report creation;
- computes severity counts;
- groups finding IDs by audit area;
- maps severity to remediation priority (`critical → P0`, `high → P1`, `medium → P2`, `low/info → P3`);
- validates the completed machine-readable report;
- writes matching `.json` and `.md` reports.

Example draft:

```text
.grok/examples/audits/ux-audit-findings.example.json
```

Optional per-finding generator hints are `effort` and `remediationValidation`. These are used to build remediation items and are not copied into the final finding object.


## CI artifact contract

When an audit report is intended to be committed, store the finalized draft and generated outputs using the same basename:

```text
audits/findings/ux/<name>.json
reports/audits/ux/<name>.json
reports/audits/ux/<name>.md
```

Before reporting completion, run:

```bash
npm run audit:artifacts:check
```

CI rejects invalid finding drafts, missing outputs, stale JSON/Markdown, schema-invalid report JSON, and orphaned reports.

## Machine-readable output

Return valid JSON only when `output: json` is requested. Otherwise return a concise human summary followed by the same JSON payload.

The JSON must contain:

```text
command
status
scope
goal
summary
findings[]
validation[]
```

Each finding must include an exact source location (`locations: [{ file, startLine, endLine? }]`) plus a stable `UX-###` id, severity, area, evidence, user impact, recommendation, files, and fixed status.
