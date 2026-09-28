import assert from "node:assert/strict";
import test from "node:test";

import { validateAuditOutput } from "./validate-audit-output.mjs";

function summaryFor(severity) {
  const bySeverity = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  if (severity) bySeverity[severity] = 1;

  return {
    findingCount: severity ? 1 : 0,
    bySeverity,
    releaseBlockers: severity === "critical" ? 1 : 0,
  };
}

test("valid UX audit output passes", () => {
  const errors = validateAuditOutput({
    command: "/ux-audit",
    status: "pass_with_notes",
    scope: "/contact",
    goal: "Submit inquiry",
    summary: summaryFor("high"),
    findings: [{
      id: "UX-001",
      severity: "high",
      area: "forms",
      title: "Error feedback is unclear",
      evidence: "Email error is only shown by red border.",
      userImpact: "Users may not know how to recover.",
      recommendation: "Add associated inline error text.",
      files: ["src/app/contact/page.tsx"],
      fixed: false,
    }],
    groupedFindings: [{ area: "forms", findingIds: ["UX-001"] }],
    prioritizedRemediation: [{
      priority: "P1",
      action: "Improve inline form errors",
      findingIds: ["UX-001"],
      rationale: "High-impact recovery problem",
      effort: "small",
      validation: "Submit invalid email and verify associated error text",
    }],
    validation: [],
  }, "ux");

  assert.deepEqual(errors, []);
});

test("valid UI audit output passes", () => {
  const errors = validateAuditOutput({
    command: "/ui-audit",
    status: "pass_with_notes",
    scope: "/services",
    summary: summaryFor("medium"),
    findings: [{
      id: "UI-001",
      severity: "medium",
      area: "spacing",
      title: "Card padding is inconsistent",
      evidence: "Two service cards use different padding.",
      visualImpact: "The grid rhythm is uneven.",
      recommendation: "Use the shared spacing token.",
      files: ["src/components/sections/services.tsx"],
      fixed: false,
    }],
    groupedFindings: [{ area: "spacing", findingIds: ["UI-001"] }],
    prioritizedRemediation: [{
      priority: "P2",
      action: "Normalize card padding",
      findingIds: ["UI-001"],
      rationale: "Improves system consistency",
      effort: "small",
      validation: "Verify cards use the shared spacing token",
    }],
    validation: [],
  }, "ui");

  assert.deepEqual(errors, []);
});

test("UX output rejects UI-style ids", () => {
  const errors = validateAuditOutput({
    command: "/ux-audit",
    status: "pass",
    scope: "site",
    goal: "Browse services",
    summary: summaryFor("low"),
    findings: [{
      id: "UI-001",
      severity: "low",
      area: "navigation",
      title: "x",
      evidence: "x",
      userImpact: "x",
      recommendation: "x",
      fixed: false,
    }],
    groupedFindings: [],
    prioritizedRemediation: [],
    validation: [],
  }, "ux");

  assert.match(errors.join("\n"), /invalid finding id/);
});

test("UI output requires visualImpact", () => {
  const errors = validateAuditOutput({
    command: "/ui-audit",
    status: "pass_with_notes",
    scope: "site",
    summary: summaryFor("medium"),
    findings: [{
      id: "UI-001",
      severity: "medium",
      area: "spacing",
      title: "x",
      evidence: "x",
      recommendation: "x",
      fixed: false,
    }],
    groupedFindings: [],
    prioritizedRemediation: [],
    validation: [],
  }, "ui");

  assert.match(errors.join("\n"), /missing visualImpact/);
});

test("summary severity counts must reconcile with findings", () => {
  const badSummary = summaryFor("medium");

  const errors = validateAuditOutput({
    command: "/ux-audit",
    status: "pass_with_notes",
    scope: "/contact",
    goal: "Submit inquiry",
    summary: badSummary,
    findings: [{
      id: "UX-001",
      severity: "high",
      area: "forms",
      title: "Error recovery",
      evidence: "Observed missing error text.",
      userImpact: "Users may not recover.",
      recommendation: "Add inline error text.",
      files: [],
      fixed: false,
    }],
    groupedFindings: [{ area: "forms", findingIds: ["UX-001"] }],
    prioritizedRemediation: [{
      priority: "P1",
      action: "Fix error recovery",
      findingIds: ["UX-001"],
      rationale: "Primary form flow",
      effort: "small",
      validation: "Retry invalid submission",
    }],
    validation: [],
  }, "ux");

  assert.match(errors.join("\n"), /summary\.bySeverity\.high/);
});

test("grouped findings cannot reference unknown finding IDs", () => {
  const errors = validateAuditOutput({
    command: "/ui-audit",
    status: "pass",
    scope: "/services",
    summary: summaryFor(null),
    findings: [],
    groupedFindings: [{ area: "spacing", findingIds: ["UI-999"] }],
    prioritizedRemediation: [],
    validation: [],
  }, "ui");

  assert.match(errors.join("\n"), /group references unknown finding id: UI-999/);
});

test("remediation must reference existing findings", () => {
  const errors = validateAuditOutput({
    command: "/ui-audit",
    status: "pass",
    scope: "/services",
    summary: summaryFor(null),
    findings: [],
    groupedFindings: [],
    prioritizedRemediation: [{
      priority: "P2",
      action: "Normalize spacing",
      findingIds: ["UI-404"],
      rationale: "System cleanup",
      effort: "small",
      validation: "Review cards",
    }],
    validation: [],
  }, "ui");

  assert.match(errors.join("\n"), /remediation references unknown finding id: UI-404/);
});


test("validates optional source locations when present", () => {
  const errors = validateAuditOutput({
    command: "/ux-audit",
    status: "pass_with_notes",
    scope: "/contact",
    goal: "Submit inquiry",
    summary: summaryFor("medium"),
    findings: [{
      id: "UX-020",
      severity: "medium",
      area: "forms",
      title: "Example",
      evidence: "Example",
      userImpact: "Example",
      recommendation: "Example",
      files: ["src/example.tsx"],
      locations: [{
        file: "src/example.tsx",
        startLine: 5,
        endLine: 9,
      }],
      fixed: false,
    }],
    groupedFindings: [{ area: "forms", findingIds: ["UX-020"] }],
    prioritizedRemediation: [{
      priority: "P2",
      action: "Fix example",
      findingIds: ["UX-020"],
      rationale: "Example",
      effort: "small",
      validation: "Recheck example",
    }],
    validation: [],
  }, "ux");

  assert.deepEqual(errors, []);
});

test("rejects malformed source locations", () => {
  const errors = validateAuditOutput({
    command: "/ui-audit",
    status: "pass_with_notes",
    scope: "/services",
    summary: summaryFor("low"),
    findings: [{
      id: "UI-020",
      severity: "low",
      area: "spacing",
      title: "Example",
      evidence: "Example",
      visualImpact: "Example",
      recommendation: "Example",
      files: ["src/example.tsx"],
      locations: [{
        file: "src/example.tsx",
        startLine: 10,
        endLine: 4,
      }],
      fixed: false,
    }],
    groupedFindings: [{ area: "spacing", findingIds: ["UI-020"] }],
    prioritizedRemediation: [{
      priority: "P3",
      action: "Fix example",
      findingIds: ["UI-020"],
      rationale: "Example",
      effort: "small",
      validation: "Recheck example",
    }],
    validation: [],
  }, "ui");

  assert.match(errors.join("\n"), /invalid endLine/);
});
