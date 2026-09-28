#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  buildAuditReport,
  renderAuditMarkdown,
  validateAuditDraft,
} from "./generate-audit-report.mjs";
import { validateAuditOutput } from "./validate-audit-output.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRepoRoot = path.resolve(__dirname, "..");

const KINDS = ["ux", "ui"];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function listJsonFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

function listReportFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        (entry.name.endsWith(".json") || entry.name.endsWith(".md")),
    )
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

function stemForFindingFile(file) {
  return path.basename(file, ".json");
}

function expectedReportPaths(repoRoot, kind, stem) {
  const root = path.join(repoRoot, "reports", "audits", kind);
  return {
    json: path.join(root, `${stem}.json`),
    markdown: path.join(root, `${stem}.md`),
  };
}

function normalizeMarkdown(markdown) {
  return markdown.endsWith("\n") ? markdown : `${markdown}\n`;
}

export function validateAuditArtifacts(repoRoot = defaultRepoRoot) {
  const errors = [];
  const stats = {
    drafts: { ux: 0, ui: 0 },
    reports: { ux: 0, ui: 0 },
  };

  for (const kind of KINDS) {
    const findingsDir = path.join(repoRoot, "audits", "findings", kind);
    const reportsDir = path.join(repoRoot, "reports", "audits", kind);
    const findingFiles = listJsonFiles(findingsDir);
    const expectedNames = new Set();

    stats.drafts[kind] = findingFiles.length;

    for (const findingFile of findingFiles) {
      const stem = stemForFindingFile(findingFile);
      const relativeFinding = path.relative(repoRoot, findingFile);
      const expectedPaths = expectedReportPaths(repoRoot, kind, stem);

      expectedNames.add(`${stem}.json`);
      expectedNames.add(`${stem}.md`);

      let draft;
      try {
        draft = readJson(findingFile);
      } catch (error) {
        errors.push(`${relativeFinding}: invalid JSON (${error.message})`);
        continue;
      }

      const draftErrors = validateAuditDraft(draft, kind);
      for (const error of draftErrors) {
        errors.push(`${relativeFinding}: ${error}`);
      }

      for (const finding of draft.findings ?? []) {
        if (!Array.isArray(finding.locations) || finding.locations.length === 0) {
          errors.push(
            `${relativeFinding}: ${finding.id ?? "finding"} must include at least one exact source location for line-level PR links`,
          );
        }
      }

      if (
        draftErrors.length > 0 ||
        (draft.findings ?? []).some(
          (finding) =>
            !Array.isArray(finding.locations) ||
            finding.locations.length === 0,
        )
      ) {
        continue;
      }

      let expectedReport;
      try {
        expectedReport = buildAuditReport(draft, kind);
      } catch (error) {
        errors.push(`${relativeFinding}: ${error.message}`);
        continue;
      }

      if (!fs.existsSync(expectedPaths.json)) {
        errors.push(
          `${path.relative(repoRoot, expectedPaths.json)}: missing generated JSON report`,
        );
      } else {
        let checkedInReport;

        try {
          checkedInReport = readJson(expectedPaths.json);
        } catch (error) {
          errors.push(
            `${path.relative(repoRoot, expectedPaths.json)}: invalid JSON (${error.message})`,
          );
          checkedInReport = null;
        }

        if (checkedInReport) {
          const outputErrors = validateAuditOutput(checkedInReport, kind);
          for (const error of outputErrors) {
            errors.push(
              `${path.relative(repoRoot, expectedPaths.json)}: ${error}`,
            );
          }

          if (stableJson(checkedInReport) !== stableJson(expectedReport)) {
            errors.push(
              `${path.relative(repoRoot, expectedPaths.json)}: stale generated JSON; regenerate from ${relativeFinding}`,
            );
          }
        }
      }

      if (!fs.existsSync(expectedPaths.markdown)) {
        errors.push(
          `${path.relative(repoRoot, expectedPaths.markdown)}: missing generated Markdown report`,
        );
      } else {
        const checkedInMarkdown = fs.readFileSync(expectedPaths.markdown, "utf8");
        const expectedMarkdown = normalizeMarkdown(
          renderAuditMarkdown(expectedReport, kind),
        );

        if (normalizeMarkdown(checkedInMarkdown) !== expectedMarkdown) {
          errors.push(
            `${path.relative(repoRoot, expectedPaths.markdown)}: stale generated Markdown; regenerate from ${relativeFinding}`,
          );
        }
      }
    }

    const reportFiles = listReportFiles(reportsDir);
    stats.reports[kind] = reportFiles.length;

    for (const reportFile of reportFiles) {
      const name = path.basename(reportFile);
      if (!expectedNames.has(name)) {
        errors.push(
          `${path.relative(repoRoot, reportFile)}: orphaned report with no matching findings draft`,
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, stats };
}

function main() {
  const result = validateAuditArtifacts(defaultRepoRoot);

  if (!result.ok) {
    process.stderr.write("AUDIT ARTIFACT CHECK: BLOCKED\n");
    for (const error of result.errors) {
      process.stderr.write(`- ${error}\n`);
    }
    process.exitCode = 2;
    return;
  }

  process.stdout.write("AUDIT ARTIFACT CHECK: PASS\n");
  process.stdout.write(
    `Findings drafts: UX ${result.stats.drafts.ux}, UI ${result.stats.drafts.ui}\n`,
  );
  process.stdout.write(
    `Generated files: UX ${result.stats.reports.ux}, UI ${result.stats.reports.ui}\n`,
  );
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isCli) main();
