# Grok Command Contract

Always read:

1. `/AGENTS.md`
2. `/.grok/COMMANDS.md`
3. `/design/UI_AUDIT.md`
4. `/design/DESIGN_TOKENS.md`
5. `/design/COLOR_BALANCE.md`
6. `/design/COMPONENT_STATES.md`
7. `/design/RESPONSIVE_BEHAVIOR.md`
8. the loaded machine-readable contracts
   - `/.grok/templates/audits/ui-audit-report.md`
   - `/.grok/templates/audits/ui-audit-report.json`
9. this command file

# `/ui-audit`

Audit interface consistency and visual-system execution. Do not silently turn the audit into a redesign.

## Expected inputs

### Required
- `scope`

### Optional
- `areas`
- `mode` — `report` or `fix`, default `report`
- `severity` — minimum severity, default `low`
- `route`
- `reference`
- `design_direction`
- `notes`

## Workflow

1. Inspect the current visual implementation and approved references.
2. Review all applicable UI check areas.
3. Run token-usage validation.
4. Review the 60/30/10 color-balance contract and flag hierarchy problems only when the dominant/secondary/accent roles are materially unbalanced—not because percentages are not mathematically exact.
5. Separate objective system violations from subjective suggestions.
6. Assign severity using `design/UI_AUDIT.md`.
7. In `report` mode, do not modify files.
8. In `fix` mode, make only high-confidence scoped corrections.
9. Return machine-readable JSON matching `.grok/contracts/ui-audit-output.schema.json`.

## Required validation

Run:

```bash
npm run tokens:check
npm run tokens:usage
npm run lint
npm run typecheck
```

Run `npm run build` for site/route-level or fix-mode work.


## Report templates

Use:

```text
.grok/templates/audits/ui-audit-report.md
.grok/templates/audits/ui-audit-report.json
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
node scripts/generate-audit-report.mjs ui <findings.json> --out-dir reports/audits
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
.grok/examples/audits/ui-audit-findings.example.json
```

Optional per-finding generator hints are `effort` and `remediationValidation`. These are used to build remediation items and are not copied into the final finding object.


## CI artifact contract

When an audit report is intended to be committed, store the finalized draft and generated outputs using the same basename:

```text
audits/findings/ui/<name>.json
reports/audits/ui/<name>.json
reports/audits/ui/<name>.md
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
summary
findings[]
validation[]
```

Each finding must include an exact source location (`locations: [{ file, startLine, endLine? }]`) plus a stable `UI-###` id, severity, area, evidence, visual impact, recommendation, files, and fixed status.
