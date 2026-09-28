import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";

import {
  COMMENT_MARKER,
  buildGitHubFileUrl,
  buildGitHubLineUrl,
  collapseDiffHunkText,
  extractChangedDiffClusters,
  extractChangedDiffClustersWithRanges,
  renderChangedDiffClusters,
  collectAuditReports,
  collectChangedDiffHunks,
  collectChangedLineRanges,
  collectAuditReportsFromGitRef,
  compareAuditFindings,
  diffAwareLocations,
  parseUnifiedDiffHunks,
  parseUnifiedZeroChangedRanges,
  renderAuditDiffSection,
  renderAuditPrComment,
  renderFindingFileLinks,
  renderFindingLocationLinks,
  renderDiffAwareFindingLinks,
  renderFindingDiffHunks,
  selectDiffHunksForLocations,
} from "./generate-audit-pr-comment.mjs";
import { buildAuditReport } from "./generate-audit-report.mjs";

function root() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "audit-pr-comment-"));
  for (const kind of ["ux", "ui"]) {
    fs.mkdirSync(path.join(repoRoot, "reports", "audits", kind), {
      recursive: true,
    });
  }
  return repoRoot;
}

function writeReport(repoRoot, kind, name, report) {
  fs.writeFileSync(
    path.join(repoRoot, "reports", "audits", kind, `${name}.json`),
    `${JSON.stringify(report, null, 2)}\n`,
  );
}

function uxReport(overrides = {}) {
  const findings = overrides.findings ?? [
    {
      id: "UX-001",
      severity: "high",
      area: "forms",
      title: "Inline error is missing",
      evidence: "Email only receives a red border.",
      userImpact: "Users may not know how to recover.",
      recommendation: "Add associated inline error text.",
      files: ["src/app/contact/page.tsx"],
      fixed: false,
      effort: "small",
    },
    {
      id: "UX-002",
      severity: "low",
      area: "navigation",
      title: "Mobile label is vague",
      evidence: "A menu item is labeled More.",
      userImpact: "Destination predictability is reduced.",
      recommendation: "Use a descriptive label.",
      files: [],
      fixed: false,
    },
  ];

  return buildAuditReport({
    scope: overrides.scope ?? "/contact",
    goal: overrides.goal ?? "Submit inquiry",
    findings,
    validation: [],
  }, "ux");
}

function uiReport(overrides = {}) {
  const findings = overrides.findings ?? [
    {
      id: "UI-001",
      severity: "medium",
      area: "spacing",
      title: "Card spacing is inconsistent",
      evidence: "One card diverges from the shared spacing scale.",
      visualImpact: "The grid rhythm looks uneven.",
      recommendation: "Use the shared spacing token.",
      files: ["src/components/sections/services.tsx"],
      fixed: false,
      effort: "small",
    },
  ];

  return buildAuditReport({
    scope: overrides.scope ?? "/services",
    findings,
    validation: [],
  }, "ui");
}

function collected({ ux = [], ui = [] } = {}) {
  return {
    ux: ux.map(([name, report]) => ({ name, report })),
    ui: ui.map(([name, report]) => ({ name, report })),
  };
}

test("renders one sticky-comment marker", () => {
  const comment = renderAuditPrComment({ ux: [], ui: [] });

  assert.equal(comment.split(COMMENT_MARKER).length - 1, 1);
});

test("renders zero-count summaries when no reports exist", () => {
  const comment = renderAuditPrComment({ ux: [], ui: [] });

  assert.match(comment, /## \/ux-audit/);
  assert.match(comment, /## \/ui-audit/);
  assert.match(comment, /\| 0 \| 0 \| 0 \| 0 \| 0 \| 0 \|/);
  assert.match(comment, /_No findings\._/);
});

test("aggregates UX and UI severity counts", () => {
  const comment = renderAuditPrComment({
    ux: [{ name: "contact", report: uxReport() }],
    ui: [{ name: "services", report: uiReport() }],
  });

  assert.match(comment, /\| 0 \| 1 \| 0 \| 1 \| 0 \| 2 \|/);
  assert.match(comment, /\| 0 \| 0 \| 1 \| 0 \| 0 \| 1 \|/);
});

test("renders grouped findings with report names", () => {
  const comment = renderAuditPrComment({
    ux: [{ name: "contact", report: uxReport() }],
    ui: [{ name: "services", report: uiReport() }],
  });

  assert.match(comment, /\*\*Forms\*\*/);
  assert.match(comment, /UX-001.*\[contact\].*Inline error is missing/);
  assert.match(comment, /\*\*Spacing\*\*/);
  assert.match(comment, /UI-001.*\[services\].*Card spacing is inconsistent/);
});

test("renders remediation ordered by P0 through P3", () => {
  const comment = renderAuditPrComment({
    ux: [{ name: "contact", report: uxReport() }],
    ui: [{ name: "services", report: uiReport() }],
  });

  assert.match(comment, /\*\*P1\*\*/);
  assert.match(comment, /Add associated inline error text/);
  assert.match(comment, /\*\*P2\*\*/);
  assert.match(comment, /Use the shared spacing token/);
  assert.match(comment, /\*\*P3\*\*/);
});

test("detects newly introduced findings", () => {
  const previous = collected({
    ux: [["contact", uxReport({
      findings: [
        {
          id: "UX-001",
          severity: "high",
          area: "forms",
          title: "Inline error is missing",
          evidence: "x",
          userImpact: "x",
          recommendation: "x",
          files: [],
          fixed: false,
        },
      ],
    })]],
  });

  const current = collected({
    ux: [["contact", uxReport()]],
  });

  const diff = compareAuditFindings(current, previous);

  assert.deepEqual(
    diff.ux.introduced.map((finding) => finding.id),
    ["UX-002"],
  );
  assert.deepEqual(diff.ux.resolved, []);
});

test("detects resolved findings", () => {
  const previous = collected({
    ui: [["services", uiReport({
      findings: [
        ...uiReport().findings.map((finding) => ({
          ...finding,
          effort: "small",
        })),
        {
          id: "UI-002",
          severity: "low",
          area: "typography",
          title: "Old typography issue",
          evidence: "x",
          visualImpact: "x",
          recommendation: "x",
          files: [],
          fixed: false,
        },
      ],
    })]],
  });

  const current = collected({
    ui: [["services", uiReport()]],
  });

  const diff = compareAuditFindings(current, previous);

  assert.deepEqual(
    diff.ui.resolved.map((finding) => finding.id),
    ["UI-002"],
  );
});

test("detects severity increases and decreases", () => {
  const oldUx = uxReport({
    findings: [{
      id: "UX-001",
      severity: "medium",
      area: "forms",
      title: "Inline error is missing",
      evidence: "x",
      userImpact: "x",
      recommendation: "x",
      files: [],
      fixed: false,
    }],
  });
  const newUx = uxReport({
    findings: [{
      id: "UX-001",
      severity: "critical",
      area: "forms",
      title: "Inline error is missing",
      evidence: "x",
      userImpact: "x",
      recommendation: "x",
      files: [],
      fixed: false,
    }],
  });

  const oldUi = uiReport({
    findings: [{
      id: "UI-001",
      severity: "high",
      area: "spacing",
      title: "Card spacing is inconsistent",
      evidence: "x",
      visualImpact: "x",
      recommendation: "x",
      files: [],
      fixed: false,
    }],
  });
  const newUi = uiReport({
    findings: [{
      id: "UI-001",
      severity: "low",
      area: "spacing",
      title: "Card spacing is inconsistent",
      evidence: "x",
      visualImpact: "x",
      recommendation: "x",
      files: [],
      fixed: false,
    }],
  });

  const diff = compareAuditFindings(
    collected({ ux: [["contact", newUx]], ui: [["services", newUi]] }),
    collected({ ux: [["contact", oldUx]], ui: [["services", oldUi]] }),
  );

  assert.deepEqual(diff.ux.severityChanges[0], {
    key: "contact:UX-001",
    report: "contact",
    id: "UX-001",
    title: "Inline error is missing",
    from: "medium",
    to: "critical",
    direction: "increased",
    files: [],
    locations: [],
  });
  assert.equal(diff.ui.severityChanges[0].direction, "decreased");
});

test("finding identity includes report basename to avoid cross-report collisions", () => {
  const current = collected({
    ux: [
      ["contact", uxReport({
        scope: "/contact",
        findings: [{
          id: "UX-001",
          severity: "high",
          area: "forms",
          title: "Contact issue",
          evidence: "x",
          userImpact: "x",
          recommendation: "x",
          files: [],
          fixed: false,
        }],
      })],
      ["checkout", uxReport({
        scope: "/checkout",
        goal: "Checkout",
        findings: [{
          id: "UX-001",
          severity: "low",
          area: "task-flow",
          title: "Checkout issue",
          evidence: "x",
          userImpact: "x",
          recommendation: "x",
          files: [],
          fixed: false,
        }],
      })],
    ],
  });

  const previous = collected({
    ux: [["contact", current.ux[0].report]],
  });

  const diff = compareAuditFindings(current, previous);

  assert.deepEqual(
    diff.ux.introduced.map((finding) => finding.key),
    ["checkout:UX-001"],
  );
});

test("renders audit diff section with new, resolved, and severity changes", () => {
  const diff = {
    ux: {
      introduced: [{
        report: "contact",
        id: "UX-003",
        severity: "medium",
        title: "New UX issue",
      }],
      resolved: [{
        report: "contact",
        id: "UX-001",
        severity: "high",
        title: "Resolved UX issue",
      }],
      severityChanges: [{
        report: "contact",
        id: "UX-002",
        title: "Changed severity",
        from: "low",
        to: "high",
        direction: "increased",
      }],
    },
    ui: {
      introduced: [],
      resolved: [],
      severityChanges: [],
    },
  };

  const section = renderAuditDiffSection(diff, "abc123");

  assert.match(section, /Changes since previous commit/);
  assert.match(section, /Compared with: `abc123`/);
  assert.match(section, /New findings \(1\)/);
  assert.match(section, /Resolved findings \(1\)/);
  assert.match(section, /Severity changes \(1\)/);
  assert.match(section, /`low` → `high`/);
});

test("renders no-change message when findings are unchanged", () => {
  const current = collected({
    ux: [["contact", uxReport()]],
    ui: [["services", uiReport()]],
  });

  const diff = compareAuditFindings(current, current);
  const section = renderAuditDiffSection(diff, "prev");

  assert.match(section, /No audit finding changes detected/);
});

test("loads and validates committed report JSON before rendering", () => {
  const repoRoot = root();

  try {
    writeReport(repoRoot, "ux", "contact", uxReport());
    writeReport(repoRoot, "ui", "services", uiReport());

    const current = collectAuditReports(repoRoot);

    assert.equal(current.ux.length, 1);
    assert.equal(current.ui.length, 1);

    const comment = renderAuditPrComment(current);
    assert.match(comment, /Reports: \*\*1\*\*/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("invalid committed report blocks comment generation", () => {
  const repoRoot = root();

  try {
    const bad = uxReport();
    bad.summary.findingCount = 999;
    writeReport(repoRoot, "ux", "contact", bad);

    assert.throws(
      () => collectAuditReports(repoRoot),
      /failed audit-output validation/,
    );
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("loads previous audit reports from a git ref", () => {
  const repoRoot = root();

  try {
    execFileSync("git", ["init"], { cwd: repoRoot });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repoRoot });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: repoRoot });

    writeReport(repoRoot, "ux", "contact", uxReport());
    execFileSync("git", ["add", "."], { cwd: repoRoot });
    execFileSync("git", ["commit", "-m", "previous"], { cwd: repoRoot });
    const previousSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();

    writeReport(repoRoot, "ui", "services", uiReport());
    execFileSync("git", ["add", "."], { cwd: repoRoot });
    execFileSync("git", ["commit", "-m", "current"], { cwd: repoRoot });

    const previous = collectAuditReportsFromGitRef(previousSha, repoRoot);

    assert.equal(previous.ux.length, 1);
    assert.equal(previous.ui.length, 0);
    assert.equal(previous.ux[0].name, "contact");
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});


test("builds file-level GitHub blob URLs", () => {
  assert.equal(
    buildGitHubFileUrl(
      "src/components/contact form.tsx",
      {
        serverUrl: "https://github.com/",
        repository: "owner/repo",
        ref: "abc123",
      },
    ),
    "https://github.com/owner/repo/blob/abc123/src/components/contact%20form.tsx",
  );
});

test("renders multiple file links without duplicates", () => {
  const rendered = renderFindingFileLinks(
    [
      "src/app/contact/page.tsx",
      "src/app/contact/page.tsx",
      "src/components/form.tsx",
    ],
    {
      serverUrl: "https://github.com",
      repository: "owner/repo",
      ref: "head123",
    },
  );

  assert.match(rendered, /blob\/head123\/src\/app\/contact\/page\.tsx/);
  assert.match(rendered, /blob\/head123\/src\/components\/form\.tsx/);
  assert.equal(
    (rendered.match(/\[src\/app\/contact\/page\.tsx\]/g) ?? []).length,
    1,
  );
});

test("falls back to code-formatted paths when GitHub link context is unavailable", () => {
  assert.equal(
    renderFindingFileLinks(["src/app/contact/page.tsx"], {}),
    "`src/app/contact/page.tsx`",
  );
});

test("renders a no-files fallback when a finding lists no files", () => {
  assert.equal(renderFindingFileLinks([], {}), "_none listed_");
});

test("diff links new and severity-changed findings to exact changed-line intersections", () => {
  const diff = {
    ux: {
      introduced: [{
        report: "contact",
        id: "UX-003",
        severity: "medium",
        title: "New UX issue",
        files: ["src/new.tsx"],
        locations: [{ file: "src/new.tsx", startLine: 12, endLine: 16 }],
      }],
      resolved: [{
        report: "contact",
        id: "UX-001",
        severity: "high",
        title: "Resolved UX issue",
        files: ["src/old.tsx"],
        locations: [{ file: "src/old.tsx", startLine: 30, endLine: 33 }],
      }],
      severityChanges: [{
        report: "contact",
        id: "UX-002",
        title: "Changed severity",
        from: "low",
        to: "high",
        direction: "increased",
        files: ["src/changed.tsx"],
        locations: [{ file: "src/changed.tsx", startLine: 44, endLine: 49 }],
      }],
    },
    ui: { introduced: [], resolved: [], severityChanges: [] },
  };

  const section = renderAuditDiffSection(
    diff,
    "base123",
    {
      serverUrl: "https://github.com",
      repository: "owner/repo",
      currentRef: "head456",
      baseRef: "base123",
      changedLineRanges: {
        "src/new.tsx": [{ startLine: 14, endLine: 15 }],
        "src/changed.tsx": [{ startLine: 46, endLine: 47 }],
      },
    },
  );

  assert.match(section, /Changed lines: \[src\/new\.tsx:L14-L15\]/);
  assert.match(section, /blob\/head456\/src\/new\.tsx#L14-L15/);
  assert.match(section, /Previous source: \[src\/old\.tsx:L30-L33\]/);
  assert.match(section, /blob\/base123\/src\/old\.tsx#L30-L33/);
  assert.match(section, /Changed lines: \[src\/changed\.tsx:L46-L47\]/);
  assert.match(section, /blob\/head456\/src\/changed\.tsx#L46-L47/);
});

test("PR comment narrows current findings to changed lines", () => {
  const previous = collected({
    ux: [["contact", uxReport({
      findings: [{
        id: "UX-001",
        severity: "medium",
        area: "forms",
        title: "Form issue",
        evidence: "x",
        userImpact: "x",
        recommendation: "x",
        files: ["src/app/contact/page.tsx"],
        locations: [{
          file: "src/app/contact/page.tsx",
          startLine: 40,
          endLine: 45,
        }],
        fixed: false,
      }],
    })]],
  });

  const current = collected({
    ux: [["contact", uxReport({
      findings: [{
        id: "UX-001",
        severity: "high",
        area: "forms",
        title: "Form issue",
        evidence: "x",
        userImpact: "x",
        recommendation: "x",
        files: ["src/app/contact/page.tsx"],
        locations: [{
          file: "src/app/contact/page.tsx",
          startLine: 42,
          endLine: 47,
        }],
        fixed: false,
      }, {
        id: "UX-002",
        severity: "low",
        area: "navigation",
        title: "New nav issue",
        evidence: "x",
        userImpact: "x",
        recommendation: "x",
        files: ["src/components/nav.tsx"],
        locations: [{
          file: "src/components/nav.tsx",
          startLine: 9,
          endLine: 13,
        }],
        fixed: false,
      }],
    })]],
  });

  const comment = renderAuditPrComment(
    current,
    previous,
    "base123",
    {
      serverUrl: "https://github.com",
      repository: "owner/repo",
      currentRef: "head456",
      baseRef: "base123",
      changedLineRanges: {
        "src/app/contact/page.tsx": [{ startLine: 45, endLine: 46 }],
        "src/components/nav.tsx": [{ startLine: 10, endLine: 11 }],
      },
    },
  );

  assert.match(comment, /Changed lines: \[src\/components\/nav\.tsx:L10-L11\]/);
  assert.match(comment, /blob\/head456\/src\/components\/nav\.tsx#L10-L11/);
  assert.match(comment, /blob\/head456\/src\/app\/contact\/page\.tsx#L45-L46/);
});


test("builds single-line and line-range GitHub anchors", () => {
  assert.equal(
    buildGitHubLineUrl(
      { file: "src/example.tsx", startLine: 12 },
      {
        serverUrl: "https://github.com",
        repository: "owner/repo",
        ref: "abc123",
      },
    ),
    "https://github.com/owner/repo/blob/abc123/src/example.tsx#L12",
  );

  assert.equal(
    buildGitHubLineUrl(
      { file: "src/example.tsx", startLine: 12, endLine: 18 },
      {
        serverUrl: "https://github.com",
        repository: "owner/repo",
        ref: "abc123",
      },
    ),
    "https://github.com/owner/repo/blob/abc123/src/example.tsx#L12-L18",
  );
});

test("renders multiple line-level locations with URL encoding", () => {
  const rendered = renderFindingLocationLinks(
    [
      {
        file: "src/components/contact form.tsx",
        startLine: 11,
        endLine: 15,
      },
      {
        file: "src/lib/validation.ts",
        startLine: 7,
      },
    ],
    [],
    {
      serverUrl: "https://github.com",
      repository: "owner/repo",
      ref: "head123",
    },
  );

  assert.match(
    rendered,
    /contact%20form\.tsx#L11-L15/,
  );
  assert.match(
    rendered,
    /validation\.ts#L7/,
  );
  assert.match(rendered, /contact form\.tsx:L11-L15/);
});

test("line renderer falls back to file links for legacy findings", () => {
  const rendered = renderFindingLocationLinks(
    [],
    ["src/legacy.tsx"],
    {
      serverUrl: "https://github.com",
      repository: "owner/repo",
      ref: "old123",
    },
  );

  assert.equal(
    rendered,
    "[src/legacy.tsx](https://github.com/owner/repo/blob/old123/src/legacy.tsx)",
  );
});


test("parses new-side changed ranges from zero-context unified diff hunks", () => {
  const ranges = parseUnifiedZeroChangedRanges([
    "@@ -10,2 +10,3 @@",
    "@@ -25 +26 @@",
    "@@ -40,2 +41,0 @@",
    "@@ -0,0 +1,2 @@",
  ].join("\n"));

  assert.deepEqual(ranges, [
    { startLine: 10, endLine: 12 },
    { startLine: 26, endLine: 26 },
    { startLine: 1, endLine: 2 },
  ]);
});

test("intersects finding locations with PR changed ranges", () => {
  assert.deepEqual(
    diffAwareLocations(
      [{
        file: "src/example.tsx",
        startLine: 10,
        endLine: 30,
      }],
      {
        "src/example.tsx": [
          { startLine: 12, endLine: 14 },
          { startLine: 22, endLine: 25 },
          { startLine: 40, endLine: 42 },
        ],
      },
    ),
    [
      { file: "src/example.tsx", startLine: 12, endLine: 14 },
      { file: "src/example.tsx", startLine: 22, endLine: 25 },
    ],
  );
});

test("diff-aware renderer falls back without falsely labeling unchanged source as changed", () => {
  const rendered = renderDiffAwareFindingLinks(
    {
      files: ["src/example.tsx"],
      locations: [{
        file: "src/example.tsx",
        startLine: 20,
        endLine: 24,
      }],
    },
    "introduced",
    {
      serverUrl: "https://github.com",
      repository: "owner/repo",
      currentRef: "head123",
      baseRef: "base123",
      changedLineRanges: {
        "src/example.tsx": [{ startLine: 2, endLine: 4 }],
      },
    },
  );

  assert.equal(rendered.usedDiffLines, false);
  assert.equal(rendered.label, "Source (no overlapping changed lines)");
  assert.match(rendered.links, /#L20-L24/);
});

test("resolved finding renderer always preserves previous-commit source location", () => {
  const rendered = renderDiffAwareFindingLinks(
    {
      files: ["src/old.tsx"],
      locations: [{
        file: "src/old.tsx",
        startLine: 31,
        endLine: 35,
      }],
    },
    "resolved",
    {
      serverUrl: "https://github.com",
      repository: "owner/repo",
      currentRef: "head123",
      baseRef: "base123",
      changedLineRanges: {
        "src/old.tsx": [{ startLine: 1, endLine: 100 }],
      },
    },
  );

  assert.equal(rendered.label, "Previous source");
  assert.match(rendered.links, /blob\/base123\/src\/old\.tsx#L31-L35/);
});

test("collects exact changed line ranges from real git diff", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "audit-diff-ranges-"));

  try {
    execFileSync("git", ["init"], { cwd: repoRoot });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repoRoot });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: repoRoot });

    fs.mkdirSync(path.join(repoRoot, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, "src", "example.tsx"),
      [
        "line 1",
        "line 2",
        "line 3",
        "line 4",
        "line 5",
        "line 6",
      ].join("\n") + "\n",
    );
    execFileSync("git", ["add", "."], { cwd: repoRoot });
    execFileSync("git", ["commit", "-m", "base"], { cwd: repoRoot });
    const baseRef = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();

    fs.writeFileSync(
      path.join(repoRoot, "src", "example.tsx"),
      [
        "line 1",
        "line 2 changed",
        "line 3",
        "line 4",
        "line 5 changed",
        "line 6",
      ].join("\n") + "\n",
    );
    execFileSync("git", ["add", "."], { cwd: repoRoot });
    execFileSync("git", ["commit", "-m", "head"], { cwd: repoRoot });
    const headRef = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();

    const ranges = collectChangedLineRanges(
      baseRef,
      headRef,
      ["src/example.tsx"],
      repoRoot,
    );

    assert.deepEqual(ranges["src/example.tsx"], [
      { startLine: 2, endLine: 2 },
      { startLine: 5, endLine: 5 },
    ]);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});


test("parses display diff hunks with added-line ranges", () => {
  const hunks = parseUnifiedDiffHunks([
    "@@ -1,5 +1,6 @@",
    " line 1",
    "-line 2",
    "+line 2 changed",
    "+line 2b",
    " line 3",
    " line 4",
    " line 5",
    "@@ -10,3 +11,3 @@",
    " line 10",
    "-line 11",
    "+line 11 changed",
    " line 12",
  ].join("\n"));

  assert.equal(hunks.length, 2);
  assert.deepEqual(hunks[0].addedLineRanges, [
    { startLine: 2, endLine: 3 },
  ]);
  assert.deepEqual(hunks[1].addedLineRanges, [
    { startLine: 12, endLine: 12 },
  ]);
  assert.match(hunks[0].text, /@@ -1,5 \+1,6 @@/);
  assert.match(hunks[0].text, /\+line 2 changed/);
});

test("selects only hunks whose added lines overlap the finding changed lines", () => {
  const hunks = {
    "src/example.tsx": [
      {
        header: "@@ -1,3 +1,3 @@",
        addedLineRanges: [{ startLine: 2, endLine: 2 }],
        text: "@@ -1,3 +1,3 @@\n-old\n+new",
      },
      {
        header: "@@ -18,4 +18,4 @@",
        addedLineRanges: [{ startLine: 20, endLine: 20 }],
        text: "@@ -18,4 +18,4 @@\n-old 20\n+new 20",
      },
    ],
  };

  const selected = selectDiffHunksForLocations(
    [{
      file: "src/example.tsx",
      startLine: 19,
      endLine: 21,
    }],
    hunks,
  );

  assert.equal(selected.length, 1);
  assert.match(selected[0].text, /\+new 20/);
});

test("renders changed-line hunk beneath a new finding", () => {
  const rendered = renderFindingDiffHunks(
    {
      files: ["src/example.tsx"],
      locations: [{
        file: "src/example.tsx",
        startLine: 10,
        endLine: 16,
      }],
    },
    "introduced",
    {
      changedLineRanges: {
        "src/example.tsx": [{ startLine: 12, endLine: 13 }],
      },
      diffHunks: {
        "src/example.tsx": [{
          header: "@@ -9,5 +9,6 @@",
          addedLineRanges: [{ startLine: 12, endLine: 13 }],
          text: [
            "@@ -9,5 +9,6 @@",
            " context",
            "-old value",
            "+new value",
            "+new helper",
            " context",
          ].join("\n"),
        }],
      },
    },
  );

  assert.match(rendered, /Diff hunk \(src\/example\.tsx, changed lines grouped\):/);
  assert.match(rendered, /```diff/);
  assert.match(rendered, /\+new value/);
  assert.match(rendered, /\+new helper/);
});

test("renders diff hunk beneath severity-changed finding", () => {
  const rendered = renderFindingDiffHunks(
    {
      files: ["src/example.tsx"],
      locations: [{
        file: "src/example.tsx",
        startLine: 40,
        endLine: 50,
      }],
    },
    "severity",
    {
      changedLineRanges: {
        "src/example.tsx": [{ startLine: 45, endLine: 45 }],
      },
      diffHunks: {
        "src/example.tsx": [{
          header: "@@ -42,5 +42,5 @@",
          addedLineRanges: [{ startLine: 45, endLine: 45 }],
          text: "@@ -42,5 +42,5 @@\n-old\n+new",
        }],
      },
    },
  );

  assert.match(rendered, /Diff hunk/);
  assert.match(rendered, /\+new/);
});

test("resolved findings never render a current diff hunk", () => {
  const rendered = renderFindingDiffHunks(
    {
      files: ["src/old.tsx"],
      locations: [{
        file: "src/old.tsx",
        startLine: 30,
        endLine: 35,
      }],
    },
    "resolved",
    {
      changedLineRanges: {
        "src/old.tsx": [{ startLine: 30, endLine: 35 }],
      },
      diffHunks: {
        "src/old.tsx": [{
          header: "@@ -30,6 +30,0 @@",
          addedLineRanges: [],
          text: "@@ -30,6 +30,0 @@\n-old",
        }],
      },
    },
  );

  assert.equal(rendered, "");
});

test("PR comment shows hunks for new and severity changes but not resolved findings", () => {
  const diff = {
    ux: {
      introduced: [{
        report: "contact",
        id: "UX-003",
        severity: "medium",
        title: "New UX issue",
        files: ["src/new.tsx"],
        locations: [{ file: "src/new.tsx", startLine: 12, endLine: 16 }],
      }],
      resolved: [{
        report: "contact",
        id: "UX-001",
        severity: "high",
        title: "Resolved UX issue",
        files: ["src/old.tsx"],
        locations: [{ file: "src/old.tsx", startLine: 30, endLine: 33 }],
      }],
      severityChanges: [{
        report: "contact",
        id: "UX-002",
        title: "Changed severity",
        from: "low",
        to: "high",
        direction: "increased",
        files: ["src/changed.tsx"],
        locations: [{ file: "src/changed.tsx", startLine: 44, endLine: 49 }],
      }],
    },
    ui: { introduced: [], resolved: [], severityChanges: [] },
  };

  const section = renderAuditDiffSection(
    diff,
    "base123",
    {
      serverUrl: "https://github.com",
      repository: "owner/repo",
      currentRef: "head456",
      baseRef: "base123",
      changedLineRanges: {
        "src/new.tsx": [{ startLine: 14, endLine: 14 }],
        "src/changed.tsx": [{ startLine: 46, endLine: 46 }],
      },
      diffHunks: {
        "src/new.tsx": [{
          header: "@@ -12,3 +12,3 @@",
          addedLineRanges: [{ startLine: 14, endLine: 14 }],
          text: "@@ -12,3 +12,3 @@\n-old new\n+new new",
        }],
        "src/changed.tsx": [{
          header: "@@ -44,3 +44,3 @@",
          addedLineRanges: [{ startLine: 46, endLine: 46 }],
          text: "@@ -44,3 +44,3 @@\n-old severity\n+new severity",
        }],
      },
    },
  );

  assert.match(section, /\+new new/);
  assert.match(section, /\+new severity/);

  const resolvedSection = section.split("**Resolved findings (1)**")[1]
    .split("**Severity changes (1)**")[0];

  assert.match(resolvedSection, /Previous source/);
  assert.doesNotMatch(resolvedSection, /```diff/);
});

test("collects display hunks from a real git diff", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "audit-display-hunks-"));

  try {
    execFileSync("git", ["init"], { cwd: repoRoot });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repoRoot });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: repoRoot });

    fs.mkdirSync(path.join(repoRoot, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, "src", "example.tsx"),
      [
        "one",
        "two",
        "three",
        "four",
        "five",
        "six",
        "seven",
      ].join("\n") + "\n",
    );
    execFileSync("git", ["add", "."], { cwd: repoRoot });
    execFileSync("git", ["commit", "-m", "base"], { cwd: repoRoot });
    const baseRef = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();

    fs.writeFileSync(
      path.join(repoRoot, "src", "example.tsx"),
      [
        "one",
        "two changed",
        "three",
        "four",
        "five",
        "six changed",
        "seven",
      ].join("\n") + "\n",
    );
    execFileSync("git", ["add", "."], { cwd: repoRoot });
    execFileSync("git", ["commit", "-m", "head"], { cwd: repoRoot });
    const headRef = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();

    const hunks = collectChangedDiffHunks(
      baseRef,
      headRef,
      ["src/example.tsx"],
      repoRoot,
    );

    assert.ok(hunks["src/example.tsx"].length >= 1);
    const combined = hunks["src/example.tsx"]
      .map((hunk) => hunk.text)
      .join("\n");

    assert.match(combined, /\+two changed/);
    assert.match(combined, /\+six changed/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});


test("collapses unchanged hunk context to one surrounding line by default", () => {
  const compact = collapseDiffHunkText([
    "@@ -1,9 +1,9 @@",
    " context 1",
    " context 2",
    " context 3",
    "-old value",
    "+new value",
    " context 4",
    " context 5",
    " context 6",
    " context 7",
  ].join("\n"));

  assert.match(compact, /^@@ -1,9 \+1,9 @@/);
  assert.doesNotMatch(compact, /context 1/);
  assert.doesNotMatch(compact, /context 2/);
  assert.match(compact, /context 3/);
  assert.match(compact, /-old value/);
  assert.match(compact, /\+new value/);
  assert.match(compact, /context 4/);
  assert.doesNotMatch(compact, /context 5/);
  assert.match(compact, /unchanged lines omitted/);
});

test("keeps separate changed clusters and collapses the gap between them", () => {
  const compact = collapseDiffHunkText([
    "@@ -10,12 +10,12 @@",
    " before",
    "-old a",
    "+new a",
    " middle 1",
    " middle 2",
    " middle 3",
    " middle 4",
    "-old b",
    "+new b",
    " after",
  ].join("\n"));

  assert.match(compact, /-old a/);
  assert.match(compact, /\+new a/);
  assert.match(compact, /-old b/);
  assert.match(compact, /\+new b/);
  assert.match(compact, /unchanged lines omitted/);
  assert.doesNotMatch(compact, /middle 2/);
  assert.doesNotMatch(compact, /middle 3/);
});

test("supports zero context when maximum diff emphasis is requested", () => {
  const compact = collapseDiffHunkText([
    "@@ -1,5 +1,5 @@",
    " before",
    "-old",
    "+new",
    " after",
  ].join("\n"), 0);

  assert.match(compact, /-old/);
  assert.match(compact, /\+new/);
  assert.doesNotMatch(compact, / before/);
  assert.doesNotMatch(compact, / after/);
  assert.doesNotMatch(compact, /unchanged .* omitted/);
});

test("preserves no-newline markers attached to changed lines", () => {
  const compact = collapseDiffHunkText([
    "@@ -1 +1 @@",
    "-old",
    "\\ No newline at end of file",
    "+new",
    "\\ No newline at end of file",
  ].join("\n"));

  assert.equal(
    (compact.match(/No newline at end of file/g) ?? []).length,
    2,
  );
});

test("rendered finding hunk shows only added and removed lines", () => {
  const rendered = renderFindingDiffHunks(
    {
      files: ["src/example.tsx"],
      locations: [{
        file: "src/example.tsx",
        startLine: 10,
        endLine: 20,
      }],
    },
    "introduced",
    {
      changedLineRanges: {
        "src/example.tsx": [{ startLine: 14, endLine: 14 }],
      },
      diffHunks: {
        "src/example.tsx": [{
          header: "@@ -10,9 +10,9 @@",
          addedLineRanges: [{ startLine: 14, endLine: 14 }],
          text: [
            "@@ -10,9 +10,9 @@",
            " context 1",
            " context 2",
            " context 3",
            "-old",
            "+new",
            " context 4",
            " context 5",
            " context 6",
          ].join("\n"),
        }],
      },
    },
  );

  assert.match(rendered, /Diff hunk \(src\/example\.tsx, changed lines grouped\):/);
  assert.match(rendered, /-old/);
  assert.match(rendered, /\+new/);
  assert.doesNotMatch(rendered, /context 1/);
  assert.doesNotMatch(rendered, /context 3/);
  assert.doesNotMatch(rendered, /context 4/);
  assert.doesNotMatch(rendered, /unchanged lines omitted/);
});


test("displayed PR hunks remain changed-only even if a context override is supplied", () => {
  const rendered = renderFindingDiffHunks(
    {
      files: ["src/example.tsx"],
      locations: [{
        file: "src/example.tsx",
        startLine: 1,
        endLine: 20,
      }],
    },
    "severity",
    {
      diffContextLines: 5,
      changedLineRanges: {
        "src/example.tsx": [{ startLine: 5, endLine: 5 }],
      },
      diffHunks: {
        "src/example.tsx": [{
          header: "@@ -2,7 +2,7 @@",
          addedLineRanges: [{ startLine: 5, endLine: 5 }],
          text: [
            "@@ -2,7 +2,7 @@",
            " unchanged before 1",
            " unchanged before 2",
            "-old",
            "+new",
            " unchanged after 1",
            " unchanged after 2",
          ].join("\n"),
        }],
      },
    },
  );

  assert.match(rendered, /-old/);
  assert.match(rendered, /\+new/);
  assert.doesNotMatch(rendered, /unchanged before/);
  assert.doesNotMatch(rendered, /unchanged after/);
  assert.doesNotMatch(rendered, /omitted/);
});


test("groups adjacent added and removed lines into one change cluster", () => {
  const clusters = extractChangedDiffClusters([
    "@@ -10,5 +10,6 @@",
    " context before",
    "-old a",
    "-old b",
    "+new a",
    "+new b",
    "+new c",
    " context after",
  ].join("\n"));

  assert.deepEqual(clusters, [[
    "-old a",
    "-old b",
    "+new a",
    "+new b",
    "+new c",
  ]]);
});

test("keeps separate change clusters distinct when context originally separated them", () => {
  const clusters = extractChangedDiffClusters([
    "@@ -1,12 +1,12 @@",
    " context 1",
    "-old a",
    "+new a",
    " unchanged separator",
    " unchanged separator 2",
    "-old b",
    "+new b",
    " context 2",
  ].join("\n"));

  assert.deepEqual(clusters, [
    ["-old a", "+new a"],
    ["-old b", "+new b"],
  ]);
});

test("keeps a no-newline marker attached to its adjacent changed line", () => {
  const clusters = extractChangedDiffClusters([
    "@@ -1 +1 @@",
    "-old",
    "\\ No newline at end of file",
    "+new",
    "\\ No newline at end of file",
  ].join("\n"));

  assert.deepEqual(clusters, [[
    "-old",
    "\\ No newline at end of file",
    "+new",
    "\\ No newline at end of file",
  ]]);
});

test("renders separate fenced diff blocks for separate change clusters", () => {
  const rendered = renderChangedDiffClusters([
    "@@ -1,10 +1,10 @@",
    "-old a",
    "+new a",
    " unchanged",
    "-old b",
    "+new b",
  ].join("\n"));

  assert.equal(
    (rendered.match(/```diff/g) ?? []).length,
    2,
  );
  assert.match(rendered, /-old a\n\+new a/);
  assert.match(rendered, /-old b\n\+new b/);
  assert.doesNotMatch(rendered, / unchanged/);
});

test("PR finding renderer labels multiple clusters and keeps them in separate blocks", () => {
  const rendered = renderFindingDiffHunks(
    {
      files: ["src/example.tsx"],
      locations: [{
        file: "src/example.tsx",
        startLine: 1,
        endLine: 30,
      }],
    },
    "introduced",
    {
      changedLineRanges: {
        "src/example.tsx": [
          { startLine: 4, endLine: 4 },
          { startLine: 12, endLine: 12 },
        ],
      },
      diffHunks: {
        "src/example.tsx": [{
          header: "@@ -1,15 +1,15 @@",
          addedLineRanges: [
            { startLine: 4, endLine: 4 },
            { startLine: 12, endLine: 12 },
          ],
          text: [
            "@@ -1,15 +1,15 @@",
            " context",
            "-old first",
            "+new first",
            " unchanged 1",
            " unchanged 2",
            "-old second",
            "+new second",
            " context",
          ].join("\n"),
        }],
      },
    },
  );

  assert.match(rendered, /changed lines grouped/);
  assert.match(rendered, /Change cluster 1\/2/);
  assert.match(rendered, /Change cluster 2\/2/);
  assert.equal((rendered.match(/```diff/g) ?? []).length, 2);
  assert.doesNotMatch(rendered, /unchanged 1/);
  assert.doesNotMatch(rendered, /unchanged 2/);
});

test("single change cluster stays compact without redundant cluster heading", () => {
  const rendered = renderFindingDiffHunks(
    {
      files: ["src/example.tsx"],
      locations: [{
        file: "src/example.tsx",
        startLine: 1,
        endLine: 10,
      }],
    },
    "severity",
    {
      changedLineRanges: {
        "src/example.tsx": [{ startLine: 4, endLine: 5 }],
      },
      diffHunks: {
        "src/example.tsx": [{
          header: "@@ -1,6 +1,7 @@",
          addedLineRanges: [{ startLine: 4, endLine: 5 }],
          text: [
            "@@ -1,6 +1,7 @@",
            " context",
            "-old",
            "+new",
            "+helper",
            " context",
          ].join("\n"),
        }],
      },
    },
  );

  assert.equal((rendered.match(/```diff/g) ?? []).length, 1);
  assert.doesNotMatch(rendered, /Change cluster 1\/1/);
  assert.match(rendered, /-old/);
  assert.match(rendered, /\+new/);
  assert.match(rendered, /\+helper/);
});


test("tracks exact old and new line ranges for each change cluster", () => {
  const clusters = extractChangedDiffClustersWithRanges([
    "@@ -10,8 +10,9 @@",
    " context",
    "-old a",
    "-old b",
    "+new a",
    "+new b",
    "+new c",
    " separator",
    "-old c",
    "+new d",
  ].join("\n"));

  assert.deepEqual(clusters, [
    {
      lines: [
        "-old a",
        "-old b",
        "+new a",
        "+new b",
        "+new c",
      ],
      oldStartLine: 11,
      oldEndLine: 12,
      newStartLine: 11,
      newEndLine: 13,
    },
    {
      lines: [
        "-old c",
        "+new d",
      ],
      oldStartLine: 14,
      oldEndLine: 14,
      newStartLine: 15,
      newEndLine: 15,
    },
  ]);
});

test("labels each displayed cluster with its exact source file and head-side changed range", () => {
  const rendered = renderFindingDiffHunks(
    {
      files: ["src/example.tsx"],
      locations: [{
        file: "src/example.tsx",
        startLine: 1,
        endLine: 30,
      }],
    },
    "introduced",
    {
      serverUrl: "https://github.com",
      repository: "owner/repo",
      currentRef: "head123",
      baseRef: "base123",
      changedLineRanges: {
        "src/example.tsx": [
          { startLine: 3, endLine: 4 },
          { startLine: 10, endLine: 10 },
        ],
      },
      diffHunks: {
        "src/example.tsx": [{
          header: "@@ -1,14 +1,15 @@",
          addedLineRanges: [
            { startLine: 3, endLine: 4 },
            { startLine: 10, endLine: 10 },
          ],
          text: [
            "@@ -1,14 +1,15 @@",
            " context 1",
            " context 2",
            "-old first",
            "+new first",
            "+new helper",
            " separator 1",
            " separator 2",
            " separator 3",
            " separator 4",
            " separator 5",
            "-old second",
            "+new second",
            " context end",
          ].join("\n"),
        }],
      },
    },
  );

  assert.match(
    rendered,
    /\[src\/example\.tsx:L3-L4\]\(https:\/\/github\.com\/owner\/repo\/blob\/head123\/src\/example\.tsx#L3-L4\)/,
  );
  assert.match(
    rendered,
    /\[src\/example\.tsx:L10\]\(https:\/\/github\.com\/owner\/repo\/blob\/head123\/src\/example\.tsx#L10\)/,
  );
  assert.match(rendered, /Change cluster 1\/2/);
  assert.match(rendered, /Change cluster 2\/2/);
});

test("uses previous-commit range for a deletion-only cluster label", () => {
  const clusters = extractChangedDiffClustersWithRanges([
    "@@ -20,3 +20,2 @@",
    "-removed line",
    " context",
    " context",
  ].join("\n"));

  assert.deepEqual(clusters, [{
    lines: ["-removed line"],
    oldStartLine: 20,
    oldEndLine: 20,
    newStartLine: null,
    newEndLine: null,
  }]);
});

test("cluster filtering omits unrelated changed clusters outside the finding range", () => {
  const rendered = renderFindingDiffHunks(
    {
      files: ["src/example.tsx"],
      locations: [{
        file: "src/example.tsx",
        startLine: 10,
        endLine: 12,
      }],
    },
    "severity",
    {
      serverUrl: "https://github.com",
      repository: "owner/repo",
      currentRef: "head123",
      baseRef: "base123",
      changedLineRanges: {
        "src/example.tsx": [{ startLine: 10, endLine: 10 }],
      },
      diffHunks: {
        "src/example.tsx": [{
          header: "@@ -8,12 +8,12 @@",
          addedLineRanges: [
            { startLine: 10, endLine: 10 },
            { startLine: 17, endLine: 17 },
          ],
          text: [
            "@@ -8,12 +8,12 @@",
            " context",
            " context",
            "-relevant old",
            "+relevant new",
            " sep 1",
            " sep 2",
            " sep 3",
            " sep 4",
            " sep 5",
            " sep 6",
            "-unrelated old",
            "+unrelated new",
          ].join("\n"),
        }],
      },
    },
  );

  assert.match(rendered, /relevant old/);
  assert.match(rendered, /relevant new/);
  assert.doesNotMatch(rendered, /unrelated old/);
  assert.doesNotMatch(rendered, /unrelated new/);
});


test("uses one compact source line immediately above each clustered diff block", () => {
  const rendered = renderFindingDiffHunks(
    {
      files: ["src/example.tsx"],
      locations: [{
        file: "src/example.tsx",
        startLine: 1,
        endLine: 20,
      }],
    },
    "introduced",
    {
      serverUrl: "https://github.com",
      repository: "owner/repo",
      currentRef: "head123",
      baseRef: "base123",
      changedLineRanges: {
        "src/example.tsx": [{ startLine: 2, endLine: 3 }],
      },
      diffHunks: {
        "src/example.tsx": [{
          header: "@@ -1,4 +1,5 @@",
          addedLineRanges: [{ startLine: 2, endLine: 3 }],
          text: [
            "@@ -1,4 +1,5 @@",
            " context",
            "-old",
            "+new",
            "+helper",
            " context",
          ].join("\n"),
        }],
      },
    },
  );

  assert.match(
    rendered,
    /\[src\/example\.tsx:L2-L3\]\(https:\/\/github\.com\/owner\/repo\/blob\/head123\/src\/example\.tsx#L2-L3\)\n\n    ```diff/,
  );
  assert.doesNotMatch(rendered, /Source:/);
});

test("deletion-only cluster compact label uses previous revision marker", () => {
  const source = renderFindingDiffHunks(
    {
      files: ["src/example.tsx"],
      locations: [{
        file: "src/example.tsx",
        startLine: 1,
        endLine: 20,
      }],
    },
    "introduced",
    {
      serverUrl: "https://github.com",
      repository: "owner/repo",
      currentRef: "head123",
      baseRef: "base123",
      changedLineRanges: {
        "src/example.tsx": [{ startLine: 5, endLine: 5 }],
      },
      diffHunks: {
        "src/example.tsx": [{
          header: "@@ -5,2 +5 @@",
          addedLineRanges: [{ startLine: 5, endLine: 5 }],
          text: [
            "@@ -5,2 +5 @@",
            "-removed line",
            "+replacement line",
          ].join("\n"),
        }],
      },
    },
  );

  assert.doesNotMatch(source, /Source:/);
  assert.doesNotMatch(source, /Previous source:/);
});
