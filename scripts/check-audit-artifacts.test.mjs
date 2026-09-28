import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildAuditReport,
  renderAuditMarkdown,
} from "./generate-audit-report.mjs";
import { validateAuditArtifacts } from "./check-audit-artifacts.mjs";

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "audit-artifacts-"));

  for (const kind of ["ux", "ui"]) {
    fs.mkdirSync(path.join(root, "audits", "findings", kind), {
      recursive: true,
    });
    fs.mkdirSync(path.join(root, "reports", "audits", kind), {
      recursive: true,
    });
  }

  return root;
}

function uxDraft() {
  return {
    scope: "/contact",
    goal: "Submit inquiry",
    findings: [{
      id: "UX-001",
      severity: "high",
      area: "forms",
      title: "Form error is unclear",
      evidence: "The email error lacks associated text.",
      userImpact: "Users may not understand how to recover.",
      recommendation: "Add associated inline error text.",
      files: ["src/app/contact/page.tsx"],
      locations: [{
        file: "src/app/contact/page.tsx",
        startLine: 40,
        endLine: 46,
      }],
      fixed: false,
      effort: "small",
      remediationValidation: "Submit an invalid email and verify the message.",
    }],
    validation: [],
  };
}

function uiDraft() {
  return {
    scope: "/services",
    findings: [{
      id: "UI-001",
      severity: "medium",
      area: "spacing",
      title: "Spacing diverges from the token system",
      evidence: "A service card uses arbitrary padding.",
      visualImpact: "Card rhythm is inconsistent.",
      recommendation: "Use the shared spacing token.",
      files: ["src/components/sections/services.tsx"],
      locations: [{
        file: "src/components/sections/services.tsx",
        startLine: 18,
        endLine: 24,
      }],
      fixed: false,
    }],
    validation: [],
  };
}

function writeArtifactSet(root, kind, stem, draft) {
  const findingsPath = path.join(
    root,
    "audits",
    "findings",
    kind,
    `${stem}.json`,
  );
  const reportsDir = path.join(root, "reports", "audits", kind);
  const report = buildAuditReport(draft, kind);

  fs.writeFileSync(findingsPath, `${JSON.stringify(draft, null, 2)}\n`);
  fs.writeFileSync(
    path.join(reportsDir, `${stem}.json`),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(reportsDir, `${stem}.md`),
    renderAuditMarkdown(report, kind),
  );
}

test("passes when UX and UI findings match generated reports", () => {
  const root = makeRoot();

  try {
    writeArtifactSet(root, "ux", "contact", uxDraft());
    writeArtifactSet(root, "ui", "services", uiDraft());

    const result = validateAuditArtifacts(root);

    assert.equal(result.ok, true);
    assert.deepEqual(result.errors, []);
    assert.equal(result.stats.drafts.ux, 1);
    assert.equal(result.stats.drafts.ui, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails when generated JSON is stale", () => {
  const root = makeRoot();

  try {
    writeArtifactSet(root, "ux", "contact", uxDraft());

    const reportPath = path.join(
      root,
      "reports",
      "audits",
      "ux",
      "contact.json",
    );
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    report.summary.findingCount = 99;
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

    const result = validateAuditArtifacts(root);

    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /stale generated JSON/);
    assert.match(result.errors.join("\n"), /summary\.findingCount/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails when generated Markdown is stale", () => {
  const root = makeRoot();

  try {
    writeArtifactSet(root, "ui", "services", uiDraft());

    const reportPath = path.join(
      root,
      "reports",
      "audits",
      "ui",
      "services.md",
    );
    fs.appendFileSync(reportPath, "\nmanual stale edit\n");

    const result = validateAuditArtifacts(root);

    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /stale generated Markdown/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails when a generated report is missing", () => {
  const root = makeRoot();

  try {
    writeArtifactSet(root, "ux", "contact", uxDraft());
    fs.unlinkSync(
      path.join(root, "reports", "audits", "ux", "contact.md"),
    );

    const result = validateAuditArtifacts(root);

    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /missing generated Markdown report/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails when a findings draft is invalid", () => {
  const root = makeRoot();

  try {
    const draft = uxDraft();
    draft.findings[0].id = "UI-001";

    fs.writeFileSync(
      path.join(root, "audits", "findings", "ux", "contact.json"),
      `${JSON.stringify(draft, null, 2)}\n`,
    );

    const result = validateAuditArtifacts(root);

    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /invalid finding id: UI-001/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails for orphaned generated reports", () => {
  const root = makeRoot();

  try {
    fs.writeFileSync(
      path.join(root, "reports", "audits", "ui", "orphan.md"),
      "# Orphan\n",
    );

    const result = validateAuditArtifacts(root);

    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /orphaned report/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("passes cleanly when no audit artifacts exist yet", () => {
  const root = makeRoot();

  try {
    const result = validateAuditArtifacts(root);

    assert.equal(result.ok, true);
    assert.deepEqual(result.stats, {
      drafts: { ux: 0, ui: 0 },
      reports: { ux: 0, ui: 0 },
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});


test("fails when a committed finding omits exact source locations", () => {
  const root = makeRoot();

  try {
    const draft = uxDraft();
    delete draft.findings[0].locations;

    fs.writeFileSync(
      path.join(root, "audits", "findings", "ux", "contact.json"),
      `${JSON.stringify(draft, null, 2)}\n`,
    );

    const result = validateAuditArtifacts(root);

    assert.equal(result.ok, false);
    assert.match(
      result.errors.join("\n"),
      /must include at least one exact source location/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
