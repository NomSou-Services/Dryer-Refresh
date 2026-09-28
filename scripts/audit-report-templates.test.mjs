import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const templateRoot = path.join(repoRoot, ".grok", "templates", "audits");

function read(name) {
  return fs.readFileSync(path.join(templateRoot, name), "utf8");
}

test("UX Markdown template contains severity summary, grouped findings, and remediation", () => {
  const content = read("ux-audit-report.md");

  assert.match(content, /## Executive Summary/);
  assert.match(content, /\| Critical \|/);
  assert.match(content, /## Findings by Area/);
  assert.match(content, /## Prioritized Remediation/);
  assert.match(content, /### P0 — Release Blockers/);
  assert.match(content, /### P3 — Polish \/ Opportunities/);
});

test("UI Markdown template contains severity summary, grouped findings, and remediation", () => {
  const content = read("ui-audit-report.md");

  assert.match(content, /## Executive Summary/);
  assert.match(content, /\| High \|/);
  assert.match(content, /## Findings by Area/);
  assert.match(content, /## Prioritized Remediation/);
  assert.match(content, /### P1 — High Priority/);
});

test("UX JSON template is valid and contains report aggregation fields", () => {
  const payload = JSON.parse(read("ux-audit-report.json"));

  assert.equal(payload.command, "/ux-audit");
  assert.deepEqual(Object.keys(payload.summary.bySeverity), [
    "critical", "high", "medium", "low", "info",
  ]);
  assert.ok(Array.isArray(payload.groupedFindings));
  assert.ok(Array.isArray(payload.prioritizedRemediation));
});

test("UI JSON template is valid and contains report aggregation fields", () => {
  const payload = JSON.parse(read("ui-audit-report.json"));

  assert.equal(payload.command, "/ui-audit");
  assert.deepEqual(Object.keys(payload.summary.bySeverity), [
    "critical", "high", "medium", "low", "info",
  ]);
  assert.ok(Array.isArray(payload.groupedFindings));
  assert.ok(Array.isArray(payload.prioritizedRemediation));
});
