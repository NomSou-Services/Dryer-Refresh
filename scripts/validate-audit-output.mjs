#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const SEVERITIES = ["critical", "high", "medium", "low", "info"];
const SEVERITY_SET = new Set(SEVERITIES);

export function validateAuditOutput(payload, kind) {
  const errors = [];
  const isUx = kind === "ux";
  const command = isUx ? "/ux-audit" : "/ui-audit";
  const idPattern = isUx ? /^UX-\d{3}$/ : /^UI-\d{3}$/;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return ["Audit output must be an object."];
  }

  if (payload.command !== command) errors.push(`command must be ${command}`);
  if (!["pass", "pass_with_notes", "blocked"].includes(payload.status)) {
    errors.push("status must be pass, pass_with_notes, or blocked");
  }
  if (typeof payload.scope !== "string" || payload.scope.length === 0) {
    errors.push("scope is required");
  }
  if (isUx && (typeof payload.goal !== "string" || payload.goal.length === 0)) {
    errors.push("goal is required for UX audit output");
  }

  if (!Array.isArray(payload.findings)) errors.push("findings must be an array");
  if (!Array.isArray(payload.groupedFindings)) errors.push("groupedFindings must be an array");
  if (!Array.isArray(payload.prioritizedRemediation)) errors.push("prioritizedRemediation must be an array");
  if (!Array.isArray(payload.validation)) errors.push("validation must be an array");

  for (const finding of payload.findings ?? []) {
    if (!idPattern.test(finding.id ?? "")) errors.push(`invalid finding id: ${finding.id ?? "missing"}`);
    if (!SEVERITY_SET.has(finding.severity)) errors.push(`invalid severity for ${finding.id ?? "finding"}`);
    if (typeof finding.title !== "string" || !finding.title) errors.push(`missing title for ${finding.id ?? "finding"}`);
    if (typeof finding.evidence !== "string" || !finding.evidence) errors.push(`missing evidence for ${finding.id ?? "finding"}`);
    if (typeof finding.recommendation !== "string" || !finding.recommendation) errors.push(`missing recommendation for ${finding.id ?? "finding"}`);
    if (typeof finding.fixed !== "boolean") errors.push(`fixed must be boolean for ${finding.id ?? "finding"}`);

    if (finding.locations !== undefined) {
      if (!Array.isArray(finding.locations) || finding.locations.length === 0) {
        errors.push(`locations must be a non-empty array for ${finding.id ?? "finding"}`);
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
            errors.push(`invalid source location for ${finding.id ?? "finding"}`);
            continue;
          }

          if (
            location.endLine !== undefined &&
            (!Number.isInteger(location.endLine) ||
              location.endLine < location.startLine)
          ) {
            errors.push(`invalid endLine for ${finding.id ?? "finding"}`);
          }
        }
      }
    }

    if (isUx && (typeof finding.userImpact !== "string" || !finding.userImpact)) {
      errors.push(`missing userImpact for ${finding.id ?? "finding"}`);
    }
    if (!isUx && (typeof finding.visualImpact !== "string" || !finding.visualImpact)) {
      errors.push(`missing visualImpact for ${finding.id ?? "finding"}`);
    }
  }

  const findingIds = new Set((payload.findings ?? []).map((finding) => finding.id));

  for (const group of payload.groupedFindings ?? []) {
    if (typeof group.area !== "string" || !group.area) {
      errors.push("grouped finding area is required");
    }
    if (!Array.isArray(group.findingIds)) {
      errors.push(`grouped finding IDs must be an array for ${group.area ?? "group"}`);
      continue;
    }
    for (const id of group.findingIds) {
      if (!findingIds.has(id)) errors.push(`group references unknown finding id: ${id}`);
    }
  }

  for (const item of payload.prioritizedRemediation ?? []) {
    if (!["P0", "P1", "P2", "P3"].includes(item.priority)) {
      errors.push(`invalid remediation priority: ${item.priority ?? "missing"}`);
    }
    if (!Array.isArray(item.findingIds) || item.findingIds.length === 0) {
      errors.push(`remediation ${item.priority ?? "item"} must reference finding IDs`);
    } else {
      for (const id of item.findingIds) {
        if (!findingIds.has(id)) errors.push(`remediation references unknown finding id: ${id}`);
      }
    }
    if (!["small", "medium", "large"].includes(item.effort)) {
      errors.push(`invalid remediation effort: ${item.effort ?? "missing"}`);
    }
  }

  if (payload.summary && Array.isArray(payload.findings)) {
    if (payload.summary.findingCount !== payload.findings.length) {
      errors.push("summary.findingCount must equal findings.length");
    }

    const calculated = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    for (const finding of payload.findings) {
      if (finding && SEVERITY_SET.has(finding.severity)) {
        calculated[finding.severity] += 1;
      }
    }

    for (const severity of SEVERITIES) {
      if (payload.summary.bySeverity?.[severity] !== calculated[severity]) {
        errors.push(`summary.bySeverity.${severity} does not match findings`);
      }
    }
  }

  return errors;
}

function main() {
  const [kind, file] = process.argv.slice(2);
  if (!["ux", "ui"].includes(kind) || !file) {
    process.stderr.write("Usage: node scripts/validate-audit-output.mjs <ux|ui> <file.json>\n");
    process.exitCode = 64;
    return;
  }

  const absolute = path.resolve(repoRoot, file);
  const payload = JSON.parse(fs.readFileSync(absolute, "utf8"));
  const errors = validateAuditOutput(payload, kind);

  if (errors.length) {
    process.stderr.write("AUDIT OUTPUT: BLOCKED\n");
    for (const error of errors) process.stderr.write(`- ${error}\n`);
    process.exitCode = 2;
    return;
  }

  process.stdout.write(`AUDIT OUTPUT: PASS (${kind})\n`);
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isCli) main();
