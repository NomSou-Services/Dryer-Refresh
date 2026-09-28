#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { validateAuditOutput } from "./validate-audit-output.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const SEVERITIES = ["critical", "high", "medium", "low", "info"];
const PRIORITY_BY_SEVERITY = Object.freeze({
  critical: "P0",
  high: "P1",
  medium: "P2",
  low: "P3",
  info: "P3",
});

const DEFAULT_EFFORT_BY_SEVERITY = Object.freeze({
  critical: "medium",
  high: "medium",
  medium: "medium",
  low: "small",
  info: "small",
});

const UX_AREAS = new Set([
  "task-flow",
  "information-architecture",
  "navigation",
  "content-clarity",
  "forms",
  "feedback",
  "error-recovery",
  "responsive-ux",
  "accessibility",
  "trust",
  "cognitive-load",
]);

const UI_AREAS = new Set([
  "design-tokens",
  "typography",
  "spacing",
  "alignment",
  "grid",
  "color",
  "contrast",
  "component-consistency",
  "component-states",
  "responsive-ui",
  "imagery",
  "motion",
  "density",
  "visual-hierarchy",
]);

function emptySeverityCounts() {
  return {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
}

function normalizeFiles(files) {
  if (!Array.isArray(files)) return [];
  return [...new Set(files.filter((file) => typeof file === "string" && file.trim()))];
}

function normalizeLocations(locations) {
  if (!Array.isArray(locations)) return [];

  const seen = new Set();
  const normalized = [];

  for (const location of locations) {
    if (!location || typeof location !== "object") continue;

    const item = {
      file: location.file,
      startLine: location.startLine,
      ...(location.endLine !== undefined ? { endLine: location.endLine } : {}),
    };
    const key = `${item.file}:${item.startLine}:${item.endLine ?? ""}`;

    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(item);
    }
  }

  return normalized;
}

function normalizeValidation(validation) {
  if (!Array.isArray(validation)) return [];

  return validation.map((item) => ({
    check: item.check,
    status: item.status,
    ...(typeof item.notes === "string" ? { notes: item.notes } : {}),
  }));
}

function findingIdPattern(kind) {
  return kind === "ux" ? /^UX-\d{3}$/ : /^UI-\d{3}$/;
}

function validAreas(kind) {
  return kind === "ux" ? UX_AREAS : UI_AREAS;
}

export function validateAuditDraft(draft, kind) {
  const errors = [];
  const isUx = kind === "ux";

  if (!["ux", "ui"].includes(kind)) {
    return ["Audit kind must be ux or ui."];
  }

  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    return ["Audit draft must be an object."];
  }

  if (typeof draft.scope !== "string" || !draft.scope.trim()) {
    errors.push("scope is required");
  }

  if (isUx && (typeof draft.goal !== "string" || !draft.goal.trim())) {
    errors.push("goal is required for UX audit generation");
  }

  if (!Array.isArray(draft.findings)) {
    errors.push("findings must be an array");
    return errors;
  }

  const seenIds = new Set();
  const idPattern = findingIdPattern(kind);
  const allowedAreas = validAreas(kind);

  for (const [index, finding] of draft.findings.entries()) {
    const label = finding?.id ?? `finding[${index}]`;

    if (!finding || typeof finding !== "object" || Array.isArray(finding)) {
      errors.push(`${label} must be an object`);
      continue;
    }

    if (!idPattern.test(finding.id ?? "")) {
      errors.push(`invalid finding id: ${finding.id ?? "missing"}`);
    } else if (seenIds.has(finding.id)) {
      errors.push(`duplicate finding id: ${finding.id}`);
    } else {
      seenIds.add(finding.id);
    }

    if (!SEVERITIES.includes(finding.severity)) {
      errors.push(`invalid severity for ${label}`);
    }

    if (!allowedAreas.has(finding.area)) {
      errors.push(`invalid area for ${label}: ${finding.area ?? "missing"}`);
    }

    for (const field of ["title", "evidence", "recommendation"]) {
      if (typeof finding[field] !== "string" || !finding[field].trim()) {
        errors.push(`missing ${field} for ${label}`);
      }
    }

    const impactField = isUx ? "userImpact" : "visualImpact";
    if (typeof finding[impactField] !== "string" || !finding[impactField].trim()) {
      errors.push(`missing ${impactField} for ${label}`);
    }

    if (typeof finding.fixed !== "boolean") {
      errors.push(`fixed must be boolean for ${label}`);
    }

    if (finding.locations !== undefined) {
      if (!Array.isArray(finding.locations) || finding.locations.length === 0) {
        errors.push(`locations must be a non-empty array for ${label}`);
      } else {
        for (const location of finding.locations) {
          if (
            !location ||
            typeof location !== "object" ||
            typeof location.file !== "string" ||
            !location.file.trim() ||
            !Number.isInteger(location.startLine) ||
            location.startLine < 1
          ) {
            errors.push(`invalid source location for ${label}`);
            continue;
          }

          if (
            location.endLine !== undefined &&
            (!Number.isInteger(location.endLine) ||
              location.endLine < location.startLine)
          ) {
            errors.push(`invalid endLine for ${label}`);
          }

          if (
            Array.isArray(finding.files) &&
            !finding.files.includes(location.file)
          ) {
            errors.push(
              `source location file must also appear in files for ${label}: ${location.file}`,
            );
          }
        }
      }
    }

    if (
      finding.effort !== undefined &&
      !["small", "medium", "large"].includes(finding.effort)
    ) {
      errors.push(`invalid effort for ${label}`);
    }

    if (
      finding.remediationValidation !== undefined &&
      (typeof finding.remediationValidation !== "string" ||
        !finding.remediationValidation.trim())
    ) {
      errors.push(`invalid remediationValidation for ${label}`);
    }
  }

  return errors;
}

export function calculateSeverityCounts(findings) {
  const counts = emptySeverityCounts();

  for (const finding of findings) {
    if (SEVERITIES.includes(finding.severity)) {
      counts[finding.severity] += 1;
    }
  }

  return counts;
}

export function groupFindings(findings) {
  const grouped = new Map();

  for (const finding of findings) {
    if (!grouped.has(finding.area)) grouped.set(finding.area, []);
    grouped.get(finding.area).push(finding.id);
  }

  return [...grouped.entries()].map(([area, findingIds]) => ({
    area,
    findingIds,
  }));
}

export function prioritizeRemediation(findings, kind) {
  const impactField = kind === "ux" ? "userImpact" : "visualImpact";

  return [...findings]
    .sort((a, b) => {
      const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
      const priorityDiff =
        priorityOrder[PRIORITY_BY_SEVERITY[a.severity]] -
        priorityOrder[PRIORITY_BY_SEVERITY[b.severity]];

      if (priorityDiff !== 0) return priorityDiff;
      return a.id.localeCompare(b.id);
    })
    .map((finding) => ({
      priority: PRIORITY_BY_SEVERITY[finding.severity],
      action: finding.recommendation,
      findingIds: [finding.id],
      rationale: finding[impactField],
      effort: finding.effort ?? DEFAULT_EFFORT_BY_SEVERITY[finding.severity],
      validation:
        finding.remediationValidation ??
        `Re-run the ${kind.toUpperCase()} audit check for ${finding.id} and verify the finding no longer reproduces.`,
    }));
}

function stripGeneratorOnlyFields(finding) {
  const {
    effort,
    remediationValidation,
    ...outputFinding
  } = finding;

  return {
    ...outputFinding,
    files: normalizeFiles(outputFinding.files),
    ...(outputFinding.locations !== undefined
      ? { locations: normalizeLocations(outputFinding.locations) }
      : {}),
  };
}

function deriveStatus(findings) {
  if (findings.some((finding) => finding.severity === "critical" && !finding.fixed)) {
    return "blocked";
  }

  if (findings.some((finding) => !finding.fixed)) {
    return "pass_with_notes";
  }

  return "pass";
}

export function buildAuditReport(draft, kind) {
  const draftErrors = validateAuditDraft(draft, kind);
  if (draftErrors.length > 0) {
    const error = new Error(`Invalid ${kind.toUpperCase()} audit draft:\n- ${draftErrors.join("\n- ")}`);
    error.code = "AUDIT_DRAFT_INVALID";
    error.errors = draftErrors;
    throw error;
  }

  const findings = draft.findings.map(stripGeneratorOnlyFields);
  const bySeverity = calculateSeverityCounts(findings);

  const report = {
    command: kind === "ux" ? "/ux-audit" : "/ui-audit",
    status: draft.status ?? deriveStatus(findings),
    scope: draft.scope,
    ...(kind === "ux" ? { goal: draft.goal } : {}),
    summary: {
      findingCount: findings.length,
      bySeverity,
      releaseBlockers: findings.filter(
        (finding) => finding.severity === "critical" && !finding.fixed,
      ).length,
    },
    findings,
    groupedFindings: groupFindings(findings),
    prioritizedRemediation: prioritizeRemediation(draft.findings, kind),
    validation: normalizeValidation(draft.validation),
  };

  const outputErrors = validateAuditOutput(report, kind);
  if (outputErrors.length > 0) {
    const error = new Error(
      `Generated ${kind.toUpperCase()} audit output failed validation:\n- ${outputErrors.join("\n- ")}`,
    );
    error.code = "AUDIT_OUTPUT_INVALID";
    error.errors = outputErrors;
    throw error;
  }

  return report;
}

function titleCaseArea(area) {
  return area
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function yesNo(value) {
  return value ? "yes" : "no";
}

export function renderAuditMarkdown(report, kind) {
  const isUx = kind === "ux";
  const impactField = isUx ? "userImpact" : "visualImpact";
  const impactLabel = isUx ? "User impact" : "Visual impact";

  const lines = [
    `# ${isUx ? "UX" : "UI"} Audit Report`,
    "",
    `**Scope:** \`${report.scope}\`  `,
    ...(isUx ? [`**Goal:** \`${report.goal}\`  `] : []),
    `**Status:** \`${report.status}\``,
    "",
    "## Executive Summary",
    "",
    `**Total findings:** ${report.summary.findingCount}  `,
    `**Release blockers:** ${report.summary.releaseBlockers}`,
    "",
    "| Severity | Count |",
    "| --- | ---: |",
    `| Critical | ${report.summary.bySeverity.critical} |`,
    `| High | ${report.summary.bySeverity.high} |`,
    `| Medium | ${report.summary.bySeverity.medium} |`,
    `| Low | ${report.summary.bySeverity.low} |`,
    `| Info | ${report.summary.bySeverity.info} |`,
    "",
    "## Findings by Area",
    "",
  ];

  if (report.groupedFindings.length === 0) {
    lines.push("No findings.", "");
  } else {
    const findingMap = new Map(report.findings.map((finding) => [finding.id, finding]));

    for (const group of report.groupedFindings) {
      lines.push(`### ${titleCaseArea(group.area)}`, "");

      for (const id of group.findingIds) {
        const finding = findingMap.get(id);
        if (!finding) continue;

        lines.push(
          `#### ${finding.id} — ${finding.title}`,
          "",
          `- **Severity:** \`${finding.severity}\``,
          `- **Evidence:** ${finding.evidence}`,
          `- **${impactLabel}:** ${finding[impactField]}`,
          `- **Files:** ${finding.files.length > 0 ? finding.files.map((file) => `\`${file}\``).join(", ") : "none"}`,
          `- **Source lines:** ${
            Array.isArray(finding.locations) && finding.locations.length > 0
              ? finding.locations
                  .map((location) =>
                    `\`${location.file}:${location.startLine}${
                      location.endLine && location.endLine !== location.startLine
                        ? `-${location.endLine}`
                        : ""
                    }\``,
                  )
                  .join(", ")
              : "none"
          }`,
          `- **Recommendation:** ${finding.recommendation}`,
          `- **Fixed:** \`${yesNo(finding.fixed)}\``,
          "",
        );
      }
    }
  }

  lines.push("## Prioritized Remediation", "");

  const buckets = [
    ["P0", "Release Blockers"],
    ["P1", "High Priority"],
    ["P2", isUx ? "Planned Improvements" : "System Improvements"],
    ["P3", "Polish / Opportunities"],
  ];

  for (const [priority, label] of buckets) {
    lines.push(`### ${priority} — ${label}`, "");
    const items = report.prioritizedRemediation.filter(
      (item) => item.priority === priority,
    );

    if (items.length === 0) {
      lines.push("None.", "");
      continue;
    }

    items.forEach((item, index) => {
      lines.push(
        `${index + 1}. **${item.action}**`,
        `   - Findings: ${item.findingIds.map((id) => `\`${id}\``).join(", ")}`,
        `   - Rationale: ${item.rationale}`,
        `   - Effort: \`${item.effort}\``,
        `   - Validation: ${item.validation}`,
        "",
      );
    });
  }

  lines.push("## Validation", "");

  if (report.validation.length === 0) {
    lines.push("No validation checks were supplied.", "");
  } else {
    lines.push("| Check | Status | Notes |", "| --- | --- | --- |");
    for (const item of report.validation) {
      lines.push(
        `| ${item.check} | \`${item.status}\` | ${(item.notes ?? "").replace(/\|/g, "\\|")} |`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## Evidence Limits",
    "",
    "This report contains only the evidence supplied to or directly inspected by the audit workflow. It must not be interpreted as proof of analytics, usability testing, screen-reader testing, browser/device testing, or visual regression testing unless those checks are explicitly listed under Validation.",
    "",
  );

  return lines.join("\n");
}

function parseCli(argv) {
  const args = [...argv];
  const kind = args.shift();
  const input = args.shift();

  let outDir = "reports/audits";
  let basename = null;

  while (args.length > 0) {
    const flag = args.shift();

    if (flag === "--out-dir") {
      outDir = args.shift();
      continue;
    }

    if (flag === "--basename") {
      basename = args.shift();
      continue;
    }

    throw new Error(`Unknown option: ${flag}`);
  }

  if (!["ux", "ui"].includes(kind) || !input) {
    throw new Error(
      "Usage: node scripts/generate-audit-report.mjs <ux|ui> <draft.json> [--out-dir path] [--basename name]",
    );
  }

  return { kind, input, outDir, basename };
}

export function writeAuditReports({
  kind,
  draft,
  outDir = path.join(repoRoot, "reports", "audits"),
  basename,
}) {
  const report = buildAuditReport(draft, kind);
  const safeBase =
    basename ??
    `${kind}-audit-${report.scope.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "report"}`;

  fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, `${safeBase}.json`);
  const markdownPath = path.join(outDir, `${safeBase}.md`);

  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(markdownPath, renderAuditMarkdown(report, kind), "utf8");

  return {
    report,
    jsonPath,
    markdownPath,
  };
}

function main() {
  let parsed;

  try {
    parsed = parseCli(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 64;
    return;
  }

  try {
    const inputPath = path.resolve(repoRoot, parsed.input);
    const draft = JSON.parse(fs.readFileSync(inputPath, "utf8"));
    const outDir = path.resolve(repoRoot, parsed.outDir);

    const result = writeAuditReports({
      kind: parsed.kind,
      draft,
      outDir,
      basename: parsed.basename,
    });

    process.stdout.write(`AUDIT REPORT GENERATION: PASS (${parsed.kind})\n`);
    process.stdout.write(`JSON: ${path.relative(repoRoot, result.jsonPath)}\n`);
    process.stdout.write(`Markdown: ${path.relative(repoRoot, result.markdownPath)}\n`);
    process.stdout.write(`Findings: ${result.report.summary.findingCount}\n`);
  } catch (error) {
    process.stderr.write("AUDIT REPORT GENERATION: BLOCKED\n");
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isCli) main();
