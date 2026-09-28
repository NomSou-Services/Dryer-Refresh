import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildAuditReport,
  calculateSeverityCounts,
  groupFindings,
  prioritizeRemediation,
  renderAuditMarkdown,
  validateAuditDraft,
  writeAuditReports,
} from "./generate-audit-report.mjs";
import { validateAuditOutput } from "./validate-audit-output.mjs";

const uxFindings = [
  {
    id: "UX-001",
    severity: "critical",
    area: "forms",
    title: "Form submission has no recovery path",
    evidence: "Submission failure clears all entered values.",
    userImpact: "Users must re-enter the entire form and may abandon.",
    recommendation: "Preserve values and show an inline recoverable error.",
    files: ["src/app/contact/page.tsx"],
    fixed: false,
    effort: "medium",
    remediationValidation: "Force a failed submission and confirm values remain.",
  },
  {
    id: "UX-002",
    severity: "high",
    area: "navigation",
    title: "Mobile primary action is hidden",
    evidence: "The estimate CTA is absent from the mobile menu.",
    userImpact: "Mobile users have a longer path to the primary conversion.",
    recommendation: "Add the primary estimate action to mobile navigation.",
    files: ["src/components/layout/site-header.tsx"],
    fixed: false,
    effort: "small",
  },
  {
    id: "UX-003",
    severity: "low",
    area: "navigation",
    title: "Navigation label is vague",
    evidence: "The label 'More' hides service destinations.",
    userImpact: "Users may need extra exploration to find services.",
    recommendation: "Use a more descriptive navigation label.",
    files: ["src/components/layout/site-header.tsx"],
    fixed: false,
  },
];

const uiFindings = [
  {
    id: "UI-001",
    severity: "high",
    area: "spacing",
    title: "Service-card padding is inconsistent",
    evidence: "One card uses an arbitrary 18px value.",
    visualImpact: "The repeated card rhythm appears uneven.",
    recommendation: "Replace the arbitrary value with the nearest spacing token.",
    files: ["src/components/sections/services.tsx"],
    fixed: false,
    effort: "small",
  },
  {
    id: "UI-002",
    severity: "medium",
    area: "typography",
    title: "Heading scale diverges from tokens",
    evidence: "A section heading uses an unsupported arbitrary size.",
    visualImpact: "Heading hierarchy becomes inconsistent across the page.",
    recommendation: "Use the shared H2 typography token.",
    files: ["src/components/sections/process.tsx"],
    fixed: false,
  },
];

test("calculates severity counts from findings", () => {
  assert.deepEqual(calculateSeverityCounts(uxFindings), {
    critical: 1,
    high: 1,
    medium: 0,
    low: 1,
    info: 0,
  });
});

test("groups findings by audit area without duplicating findings", () => {
  assert.deepEqual(groupFindings(uxFindings), [
    { area: "forms", findingIds: ["UX-001"] },
    { area: "navigation", findingIds: ["UX-002", "UX-003"] },
  ]);
});

test("prioritizes remediation from severity", () => {
  const remediation = prioritizeRemediation(uxFindings, "ux");

  assert.deepEqual(
    remediation.map((item) => [item.priority, item.findingIds[0]]),
    [
      ["P0", "UX-001"],
      ["P1", "UX-002"],
      ["P3", "UX-003"],
    ],
  );
});

test("builds and validates a complete UX audit report", () => {
  const report = buildAuditReport({
    scope: "/contact",
    goal: "Submit a qualified inquiry",
    findings: uxFindings,
    validation: [
      { check: "lint", status: "pass", notes: "No lint errors." },
      { check: "keyboard", status: "manual_review", notes: "Reviewed form flow." },
    ],
  }, "ux");

  assert.equal(report.status, "blocked");
  assert.equal(report.summary.findingCount, 3);
  assert.equal(report.summary.releaseBlockers, 1);
  assert.equal(report.groupedFindings.length, 2);
  assert.equal(report.prioritizedRemediation[0].priority, "P0");
  assert.deepEqual(validateAuditOutput(report, "ux"), []);
});

test("builds and validates a complete UI audit report", () => {
  const report = buildAuditReport({
    scope: "/services",
    findings: uiFindings,
    validation: [
      { check: "tokens:usage", status: "fail", notes: "One arbitrary spacing value." },
    ],
  }, "ui");

  assert.equal(report.status, "pass_with_notes");
  assert.deepEqual(report.summary.bySeverity, {
    critical: 0,
    high: 1,
    medium: 1,
    low: 0,
    info: 0,
  });
  assert.deepEqual(
    report.prioritizedRemediation.map((item) => item.priority),
    ["P1", "P2"],
  );
  assert.deepEqual(validateAuditOutput(report, "ui"), []);
});

test("Markdown renderer includes counts, grouped findings, and prioritized remediation", () => {
  const report = buildAuditReport({
    scope: "/services",
    findings: uiFindings,
    validation: [],
  }, "ui");

  const markdown = renderAuditMarkdown(report, "ui");

  assert.match(markdown, /## Executive Summary/);
  assert.match(markdown, /\| High \| 1 \|/);
  assert.match(markdown, /### Spacing/);
  assert.match(markdown, /UI-001/);
  assert.match(markdown, /## Prioritized Remediation/);
  assert.match(markdown, /### P1 — High Priority/);
  assert.match(markdown, /### P2 — System Improvements/);
});

test("writer emits matching JSON and Markdown reports", () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-report-"));

  try {
    const result = writeAuditReports({
      kind: "ux",
      draft: {
        scope: "/contact",
        goal: "Submit inquiry",
        findings: uxFindings,
        validation: [],
      },
      outDir,
      basename: "contact-ux",
    });

    assert.equal(fs.existsSync(result.jsonPath), true);
    assert.equal(fs.existsSync(result.markdownPath), true);

    const json = JSON.parse(fs.readFileSync(result.jsonPath, "utf8"));
    const markdown = fs.readFileSync(result.markdownPath, "utf8");

    assert.equal(json.summary.findingCount, 3);
    assert.match(markdown, /UX-001/);
    assert.match(markdown, /P0 — Release Blockers/);
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});

test("invalid findings block report generation before writing", () => {
  const errors = validateAuditDraft({
    scope: "/contact",
    goal: "Submit inquiry",
    findings: [{
      id: "UI-001",
      severity: "high",
      area: "forms",
      title: "Wrong id family",
      evidence: "Invalid UX ID.",
      userImpact: "Breaks report identity.",
      recommendation: "Use a UX ID.",
      fixed: false,
    }],
  }, "ux");

  assert.match(errors.join("\n"), /invalid finding id: UI-001/);
});

test("generator-only effort and validation fields are omitted from final finding JSON", () => {
  const report = buildAuditReport({
    scope: "/contact",
    goal: "Submit inquiry",
    findings: [uxFindings[0]],
    validation: [],
  }, "ux");

  assert.equal("effort" in report.findings[0], false);
  assert.equal("remediationValidation" in report.findings[0], false);
  assert.equal(report.prioritizedRemediation[0].effort, "medium");
  assert.equal(
    report.prioritizedRemediation[0].validation,
    "Force a failed submission and confirm values remain.",
  );
});


test("preserves exact source locations and renders them in Markdown", () => {
  const report = buildAuditReport({
    scope: "/contact",
    goal: "Submit inquiry",
    findings: [{
      id: "UX-010",
      severity: "medium",
      area: "forms",
      title: "Field help is unclear",
      evidence: "The help copy is separated from the field.",
      userImpact: "Users may misunderstand the expected value.",
      recommendation: "Place concise help text beside the field.",
      files: ["src/app/contact/page.tsx"],
      locations: [{
        file: "src/app/contact/page.tsx",
        startLine: 42,
        endLine: 47,
      }],
      fixed: false,
    }],
    validation: [],
  }, "ux");

  assert.deepEqual(report.findings[0].locations, [{
    file: "src/app/contact/page.tsx",
    startLine: 42,
    endLine: 47,
  }]);

  const markdown = renderAuditMarkdown(report, "ux");
  assert.match(markdown, /Source lines:/);
  assert.match(markdown, /src\/app\/contact\/page\.tsx:42-47/);
});

test("rejects invalid source line ranges in draft findings", () => {
  const errors = validateAuditDraft({
    scope: "/contact",
    goal: "Submit inquiry",
    findings: [{
      id: "UX-011",
      severity: "low",
      area: "forms",
      title: "Example",
      evidence: "Example",
      userImpact: "Example",
      recommendation: "Example",
      files: ["src/example.tsx"],
      locations: [{
        file: "src/example.tsx",
        startLine: 20,
        endLine: 10,
      }],
      fixed: false,
    }],
  }, "ux");

  assert.match(errors.join("\n"), /invalid endLine/);
});
