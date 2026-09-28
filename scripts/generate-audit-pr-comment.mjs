#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { validateAuditOutput } from "./validate-audit-output.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

export const COMMENT_MARKER = "<!-- grok-audit-summary -->";
const SEVERITIES = ["critical", "high", "medium", "low", "info"];
const PRIORITIES = ["P0", "P1", "P2", "P3"];
const SEVERITY_RANK = Object.freeze({
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
});

function emptySeverityCounts() {
  return {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
}

function listJsonReports(repoRootPath, kind) {
  const directory = path.join(repoRootPath, "reports", "audits", kind);
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

function validateReport(report, kind, label) {
  const errors = validateAuditOutput(report, kind);

  if (errors.length > 0) {
    throw new Error(
      `${label} failed audit-output validation:\n- ${errors.join("\n- ")}`,
    );
  }

  return report;
}

function readValidatedReport(file, kind) {
  const report = JSON.parse(fs.readFileSync(file, "utf8"));
  return validateReport(report, kind, path.relative(repoRoot, file));
}

export function collectAuditReports(repoRootPath = repoRoot) {
  const result = {
    ux: [],
    ui: [],
  };

  for (const kind of ["ux", "ui"]) {
    for (const file of listJsonReports(repoRootPath, kind)) {
      result[kind].push({
        name: path.basename(file, ".json"),
        file,
        report: readValidatedReport(file, kind),
      });
    }
  }

  return result;
}

function git(repoRootPath, args) {
  return execFileSync("git", args, {
    cwd: repoRootPath,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function parseUnifiedZeroChangedRanges(diffText) {
  const ranges = [];

  for (const line of String(diffText ?? "").split(/\r?\n/)) {
    const match = line.match(
      /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/,
    );

    if (!match) continue;

    const startLine = Number.parseInt(match[1], 10);
    const count =
      match[2] === undefined ? 1 : Number.parseInt(match[2], 10);

    if (!Number.isInteger(startLine) || !Number.isInteger(count) || count <= 0) {
      continue;
    }

    ranges.push({
      startLine,
      endLine: startLine + count - 1,
    });
  }

  return ranges;
}


function pushContiguousLine(ranges, lineNumber) {
  const last = ranges[ranges.length - 1];

  if (last && last.endLine + 1 === lineNumber) {
    last.endLine = lineNumber;
    return;
  }

  ranges.push({
    startLine: lineNumber,
    endLine: lineNumber,
  });
}

export function parseUnifiedDiffHunks(diffText) {
  const lines = String(diffText ?? "").split(/\r?\n/);
  const hunks = [];
  let current = null;
  let oldLine = 0;
  let newLine = 0;

  const finish = () => {
    if (!current) return;

    while (current.lines.length > 0 && current.lines.at(-1) === "") {
      current.lines.pop();
    }

    current.text = [current.header, ...current.lines].join("\n");
    delete current.lines;
    hunks.push(current);
    current = null;
  };

  for (const line of lines) {
    const header = line.match(
      /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/,
    );

    if (header) {
      finish();

      const oldStart = Number.parseInt(header[1], 10);
      const oldCount =
        header[2] === undefined ? 1 : Number.parseInt(header[2], 10);
      const newStart = Number.parseInt(header[3], 10);
      const newCount =
        header[4] === undefined ? 1 : Number.parseInt(header[4], 10);

      current = {
        header: line,
        oldStart,
        oldCount,
        newStart,
        newCount,
        addedLineRanges: [],
        lines: [],
      };
      oldLine = oldStart;
      newLine = newStart;
      continue;
    }

    if (!current) continue;
    if (line.startsWith("diff --git ")) {
      finish();
      continue;
    }

    current.lines.push(line);

    if (line.startsWith("+") && !line.startsWith("+++")) {
      pushContiguousLine(current.addedLineRanges, newLine);
      newLine += 1;
      continue;
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      oldLine += 1;
      continue;
    }

    if (line.startsWith("\\")) {
      continue;
    }

    oldLine += 1;
    newLine += 1;
  }

  finish();
  return hunks;
}

export function collectChangedDiffHunks(
  baseRef,
  currentRef,
  files,
  repoRootPath = repoRoot,
) {
  const result = {};

  if (!baseRef || !currentRef) return result;

  for (const file of normalizeDiffFileList(files)) {
    let diffText = "";

    try {
      diffText = git(repoRootPath, [
        "diff",
        "--unified=3",
        "--no-color",
        "--no-ext-diff",
        baseRef,
        currentRef,
        "--",
        file,
      ]);
    } catch (error) {
      throw new Error(
        `Could not collect diff hunks for ${file} between ${baseRef} and ${currentRef}: ${error.message}`,
      );
    }

    const hunks = parseUnifiedDiffHunks(diffText);
    if (hunks.length > 0) {
      result[file] = hunks;
    }
  }

  return result;
}

function normalizeDiffFileList(files) {
  return [
    ...new Set(
      (Array.isArray(files) ? files : [])
        .filter((file) => typeof file === "string")
        .map((file) => file.trim())
        .filter(Boolean),
    ),
  ].sort();
}

export function collectChangedLineRanges(
  baseRef,
  currentRef,
  files,
  repoRootPath = repoRoot,
) {
  const result = {};

  if (!baseRef || !currentRef) return result;

  for (const file of normalizeDiffFileList(files)) {
    let diffText = "";

    try {
      diffText = git(repoRootPath, [
        "diff",
        "--unified=0",
        "--no-color",
        "--no-ext-diff",
        baseRef,
        currentRef,
        "--",
        file,
      ]);
    } catch (error) {
      throw new Error(
        `Could not inspect changed lines for ${file} between ${baseRef} and ${currentRef}: ${error.message}`,
      );
    }

    const ranges = parseUnifiedZeroChangedRanges(diffText);
    if (ranges.length > 0) {
      result[file] = ranges;
    }
  }

  return result;
}

function currentFindingFiles(collected) {
  const files = [];

  for (const kind of ["ux", "ui"]) {
    for (const entry of collected?.[kind] ?? []) {
      for (const finding of entry.report.findings ?? []) {
        for (const location of finding.locations ?? []) {
          if (typeof location.file === "string") files.push(location.file);
        }

        for (const file of finding.files ?? []) {
          if (typeof file === "string") files.push(file);
        }
      }
    }
  }

  return normalizeDiffFileList(files);
}

function intersectLocationWithChangedRanges(location, changedRanges) {
  if (
    !location ||
    !Number.isInteger(location.startLine) ||
    location.startLine < 1
  ) {
    return [];
  }

  const locationEnd =
    Number.isInteger(location.endLine) && location.endLine >= location.startLine
      ? location.endLine
      : location.startLine;

  const intersections = [];

  for (const range of changedRanges ?? []) {
    const startLine = Math.max(location.startLine, range.startLine);
    const endLine = Math.min(locationEnd, range.endLine);

    if (startLine <= endLine) {
      intersections.push({
        file: location.file,
        startLine,
        ...(endLine !== startLine ? { endLine } : {}),
      });
    }
  }

  return intersections;
}

export function diffAwareLocations(locations, changedLineRanges = {}) {
  const result = [];
  const seen = new Set();

  for (const location of Array.isArray(locations) ? locations : []) {
    const intersections = intersectLocationWithChangedRanges(
      location,
      changedLineRanges?.[location.file] ?? [],
    );

    for (const intersection of intersections) {
      const key = `${intersection.file}:${intersection.startLine}:${intersection.endLine ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(intersection);
    }
  }

  return result;
}

export function collectAuditReportsFromGitRef(
  ref,
  repoRootPath = repoRoot,
) {
  const result = {
    ux: [],
    ui: [],
  };

  if (!ref) return result;

  try {
    git(repoRootPath, ["rev-parse", "--verify", `${ref}^{commit}`]);
  } catch {
    throw new Error(`Previous audit ref is not available: ${ref}`);
  }

  for (const kind of ["ux", "ui"]) {
    const prefix = `reports/audits/${kind}/`;
    let names = [];

    try {
      names = git(repoRootPath, [
        "ls-tree",
        "-r",
        "--name-only",
        ref,
        "--",
        prefix,
      ])
        .split(/\r?\n/)
        .filter((name) => name.endsWith(".json"))
        .sort();
    } catch {
      names = [];
    }

    for (const relativePath of names) {
      let raw;

      try {
        raw = git(repoRootPath, ["show", `${ref}:${relativePath}`]);
      } catch (error) {
        throw new Error(
          `Could not read previous audit report ${relativePath} at ${ref}: ${error.message}`,
        );
      }

      let report;
      try {
        report = JSON.parse(raw);
      } catch (error) {
        throw new Error(
          `${relativePath} at ${ref} is invalid JSON (${error.message})`,
        );
      }

      validateReport(report, kind, `${relativePath} at ${ref}`);

      result[kind].push({
        name: path.basename(relativePath, ".json"),
        file: `${ref}:${relativePath}`,
        report,
      });
    }
  }

  return result;
}

function aggregateKind(entries) {
  const severity = emptySeverityCounts();
  const groups = new Map();
  const remediation = new Map();

  for (const entry of entries) {
    const { name, report } = entry;

    for (const level of SEVERITIES) {
      severity[level] += report.summary.bySeverity[level] ?? 0;
    }

    const findingMap = new Map(
      report.findings.map((finding) => [finding.id, finding]),
    );

    for (const group of report.groupedFindings) {
      if (!groups.has(group.area)) groups.set(group.area, []);

      for (const id of group.findingIds) {
        const finding = findingMap.get(id);
        if (!finding) continue;

        groups.get(group.area).push({
          report: name,
          id,
          severity: finding.severity,
          title: finding.title,
          fixed: finding.fixed,
        });
      }
    }

    for (const item of report.prioritizedRemediation) {
      if (!remediation.has(item.priority)) remediation.set(item.priority, []);

      remediation.get(item.priority).push({
        report: name,
        ...item,
      });
    }
  }

  return {
    reportCount: entries.length,
    findingCount: Object.values(severity).reduce((sum, count) => sum + count, 0),
    severity,
    groups,
    remediation,
  };
}

function findingKey(reportName, id) {
  return `${reportName}:${id}`;
}

function flattenFindings(entries) {
  const map = new Map();

  for (const entry of entries) {
    for (const finding of entry.report.findings) {
      const key = findingKey(entry.name, finding.id);
      map.set(key, {
        key,
        report: entry.name,
        ...finding,
      });
    }
  }

  return map;
}

export function compareAuditFindings(currentCollected, previousCollected) {
  const result = {
    ux: { introduced: [], resolved: [], severityChanges: [] },
    ui: { introduced: [], resolved: [], severityChanges: [] },
  };

  for (const kind of ["ux", "ui"]) {
    const current = flattenFindings(currentCollected?.[kind] ?? []);
    const previous = flattenFindings(previousCollected?.[kind] ?? []);

    for (const [key, finding] of current) {
      const before = previous.get(key);

      if (!before) {
        result[kind].introduced.push(finding);
        continue;
      }

      if (before.severity !== finding.severity) {
        result[kind].severityChanges.push({
          key,
          report: finding.report,
          id: finding.id,
          title: finding.title,
          from: before.severity,
          to: finding.severity,
          direction:
            SEVERITY_RANK[finding.severity] > SEVERITY_RANK[before.severity]
              ? "increased"
              : "decreased",
          files: Array.isArray(finding.files) ? finding.files : [],
          locations: Array.isArray(finding.locations) ? finding.locations : [],
        });
      }
    }

    for (const [key, finding] of previous) {
      if (!current.has(key)) {
        result[kind].resolved.push(finding);
      }
    }

    const stableSort = (a, b) =>
      a.report.localeCompare(b.report) || a.id.localeCompare(b.id);

    result[kind].introduced.sort(stableSort);
    result[kind].resolved.sort(stableSort);
    result[kind].severityChanges.sort(stableSort);
  }

  return result;
}

function titleCase(value) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function renderSeverityTable(aggregate) {
  return [
    "| Critical | High | Medium | Low | Info | Total |",
    "| ---: | ---: | ---: | ---: | ---: | ---: |",
    `| ${aggregate.severity.critical} | ${aggregate.severity.high} | ${aggregate.severity.medium} | ${aggregate.severity.low} | ${aggregate.severity.info} | ${aggregate.findingCount} |`,
  ].join("\n");
}

function renderGroupedFindings(aggregate) {
  if (aggregate.groups.size === 0) return "_No findings._";

  const lines = [];

  for (const [area, findings] of [...aggregate.groups.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    lines.push(`**${titleCase(area)}**`);

    for (const finding of findings) {
      const fixed = finding.fixed ? " — fixed" : "";
      lines.push(
        `- \`${finding.severity}\` **${finding.id}** [${finding.report}] — ${finding.title}${fixed}`,
      );
    }

    lines.push("");
  }

  return lines.join("\n").trim();
}

function renderRemediation(aggregate) {
  if (aggregate.remediation.size === 0) return "_No remediation items._";

  const lines = [];

  for (const priority of PRIORITIES) {
    const items = aggregate.remediation.get(priority) ?? [];
    if (items.length === 0) continue;

    lines.push(`**${priority}**`);

    for (const item of items) {
      lines.push(
        `- [${item.report}] ${item.action} — findings ${item.findingIds
          .map((id) => `\`${id}\``)
          .join(", ")}; effort \`${item.effort}\``,
      );
    }

    lines.push("");
  }

  return lines.join("\n").trim();
}

function renderKind(kind, aggregate) {
  const label = kind === "ux" ? "/ux-audit" : "/ui-audit";

  return [
    `## ${label}`,
    "",
    `Reports: **${aggregate.reportCount}**`,
    "",
    "### Severity counts",
    "",
    renderSeverityTable(aggregate),
    "",
    "### Grouped findings",
    "",
    renderGroupedFindings(aggregate),
    "",
    "### Prioritized remediation",
    "",
    renderRemediation(aggregate),
  ].join("\n");
}

function encodeRepositoryPath(filePath) {
  return filePath
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function buildGitHubFileUrl(
  filePath,
  { serverUrl, repository, ref } = {},
) {
  if (
    typeof filePath !== "string" ||
    !filePath.trim() ||
    !serverUrl ||
    !repository ||
    !ref
  ) {
    return null;
  }

  const normalizedServer = serverUrl.replace(/\/+$/, "");
  const normalizedRepository = repository.replace(/^\/+|\/+$/g, "");
  const encodedPath = encodeRepositoryPath(filePath);

  if (!normalizedRepository || !encodedPath) return null;

  return `${normalizedServer}/${normalizedRepository}/blob/${encodeURIComponent(ref)}/${encodedPath}`;
}

function escapeMarkdownLabel(value) {
  return String(value).replace(/([\\[\]])/g, "\\$1");
}

export function buildGitHubLineUrl(
  location,
  { serverUrl, repository, ref } = {},
) {
  if (
    !location ||
    typeof location.file !== "string" ||
    !location.file.trim() ||
    !Number.isInteger(location.startLine) ||
    location.startLine < 1
  ) {
    return null;
  }

  const fileUrl = buildGitHubFileUrl(location.file, {
    serverUrl,
    repository,
    ref,
  });

  if (!fileUrl) return null;

  const endLine =
    Number.isInteger(location.endLine) &&
    location.endLine >= location.startLine
      ? location.endLine
      : null;

  return `${fileUrl}#L${location.startLine}${
    endLine && endLine !== location.startLine ? `-L${endLine}` : ""
  }`;
}

function locationLabel(location) {
  return `${location.file}:L${location.startLine}${
    location.endLine && location.endLine !== location.startLine
      ? `-L${location.endLine}`
      : ""
  }`;
}

export function renderFindingLocationLinks(
  locations,
  files,
  { serverUrl, repository, ref } = {},
) {
  const uniqueLocations = [];
  const seen = new Set();

  for (const location of Array.isArray(locations) ? locations : []) {
    if (
      !location ||
      typeof location.file !== "string" ||
      !location.file.trim() ||
      !Number.isInteger(location.startLine) ||
      location.startLine < 1
    ) {
      continue;
    }

    const key = `${location.file}:${location.startLine}:${location.endLine ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueLocations.push(location);
    }
  }

  if (uniqueLocations.length > 0) {
    return uniqueLocations
      .map((location) => {
        const url = buildGitHubLineUrl(location, {
          serverUrl,
          repository,
          ref,
        });
        const label = locationLabel(location);

        return url
          ? `[${escapeMarkdownLabel(label)}](${url})`
          : `\`${label}\``;
      })
      .join(", ");
  }

  // Compatibility fallback for pre-line-metadata history.
  return renderFindingFileLinks(files, {
    serverUrl,
    repository,
    ref,
  });
}

export function renderFindingFileLinks(
  files,
  { serverUrl, repository, ref } = {},
) {
  const uniqueFiles = [
    ...new Set(
      (Array.isArray(files) ? files : [])
        .filter((file) => typeof file === "string")
        .map((file) => file.trim())
        .filter(Boolean),
    ),
  ];

  if (uniqueFiles.length === 0) return "_none listed_";

  return uniqueFiles
    .map((file) => {
      const url = buildGitHubFileUrl(file, {
        serverUrl,
        repository,
        ref,
      });

      return url
        ? `[${escapeMarkdownLabel(file)}](${url})`
        : `\`${file}\``;
    })
    .join(", ");
}

function rangesOverlap(a, b) {
  return a.startLine <= b.endLine && b.startLine <= a.endLine;
}

export function selectDiffHunksForLocations(
  locations,
  diffHunks = {},
) {
  const selected = [];
  const seen = new Set();

  for (const location of Array.isArray(locations) ? locations : []) {
    const locationRange = {
      startLine: location.startLine,
      endLine:
        Number.isInteger(location.endLine) &&
        location.endLine >= location.startLine
          ? location.endLine
          : location.startLine,
    };

    for (const [index, hunk] of (diffHunks?.[location.file] ?? []).entries()) {
      const overlapsAddedLine = (hunk.addedLineRanges ?? []).some(
        (range) => rangesOverlap(locationRange, range),
      );

      if (!overlapsAddedLine) continue;

      const key = `${location.file}:${index}:${hunk.header}`;
      if (seen.has(key)) continue;
      seen.add(key);

      selected.push({
        file: location.file,
        ...hunk,
      });
    }
  }

  return selected;
}

export function collapseDiffHunkText(
  hunkText,
  contextLines = 1,
) {
  const lines = String(hunkText ?? "").split("\n");
  if (lines.length <= 1) return String(hunkText ?? "");

  const header = lines[0];
  const body = lines.slice(1);
  const changedIndexes = [];

  for (let index = 0; index < body.length; index += 1) {
    const line = body[index];
    if (
      (line.startsWith("+") && !line.startsWith("+++")) ||
      (line.startsWith("-") && !line.startsWith("---"))
    ) {
      changedIndexes.push(index);
    }
  }

  if (changedIndexes.length === 0) return String(hunkText ?? "");

  if (contextLines === 0) {
    const output = [header];

    for (let index = 0; index < body.length; index += 1) {
      const line = body[index];
      const changed =
        (line.startsWith("+") && !line.startsWith("+++")) ||
        (line.startsWith("-") && !line.startsWith("---"));

      if (changed) {
        output.push(line);

        if (
          index + 1 < body.length &&
          body[index + 1].startsWith("\\")
        ) {
          output.push(body[index + 1]);
        }
      }
    }

    return output.join("\n");
  }

  const keep = new Set();

  for (const index of changedIndexes) {
    const start = Math.max(0, index - contextLines);
    const end = Math.min(body.length - 1, index + contextLines);

    for (let candidate = start; candidate <= end; candidate += 1) {
      keep.add(candidate);
    }
  }

  // Preserve Git's no-newline marker when it belongs to a kept line.
  for (let index = 0; index < body.length; index += 1) {
    if (
      body[index].startsWith("\\") &&
      index > 0 &&
      keep.has(index - 1)
    ) {
      keep.add(index);
    }
  }

  const keptIndexes = [...keep].sort((a, b) => a - b);
  const output = [header];
  let previous = -1;

  for (const index of keptIndexes) {
    if (previous >= 0 && index > previous + 1) {
      const omitted = index - previous - 1;
      output.push(
        ` … ${omitted} unchanged ${
          omitted === 1 ? "line" : "lines"
        } omitted …`,
      );
    } else if (previous === -1 && index > 0) {
      output.push(
        ` … ${index} unchanged ${
          index === 1 ? "line" : "lines"
        } omitted …`,
      );
    }

    output.push(body[index]);
    previous = index;
  }

  if (previous < body.length - 1) {
    const omitted = body.length - previous - 1;
    output.push(
      ` … ${omitted} unchanged ${
        omitted === 1 ? "line" : "lines"
      } omitted …`,
    );
  }

  return output.join("\n");
}

export function extractChangedDiffClustersWithRanges(hunkText) {
  const lines = String(hunkText ?? "").split("\n");
  if (lines.length <= 1) return [];

  const header = lines[0];
  const match = header.match(
    /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/,
  );

  if (!match) return [];

  let oldLine = Number.parseInt(match[1], 10);
  let newLine = Number.parseInt(match[3], 10);
  const body = lines.slice(1);
  const clusters = [];
  let current = null;

  const ensureCluster = () => {
    if (!current) {
      current = {
        lines: [],
        oldStartLine: null,
        oldEndLine: null,
        newStartLine: null,
        newEndLine: null,
      };
    }
    return current;
  };

  const flush = () => {
    if (!current || current.lines.length === 0) {
      current = null;
      return;
    }

    clusters.push(current);
    current = null;
  };

  for (let index = 0; index < body.length; index += 1) {
    const line = body[index];
    const added = line.startsWith("+") && !line.startsWith("+++");
    const removed = line.startsWith("-") && !line.startsWith("---");

    if (added || removed) {
      const cluster = ensureCluster();
      cluster.lines.push(line);

      if (removed) {
        cluster.oldStartLine ??= oldLine;
        cluster.oldEndLine = oldLine;
        oldLine += 1;
      }

      if (added) {
        cluster.newStartLine ??= newLine;
        cluster.newEndLine = newLine;
        newLine += 1;
      }

      if (
        index + 1 < body.length &&
        body[index + 1].startsWith("\\")
      ) {
        cluster.lines.push(body[index + 1]);
        index += 1;
      }

      continue;
    }

    // Unchanged/context source separates independent change clusters.
    flush();

    if (!line.startsWith("\\")) {
      oldLine += 1;
      newLine += 1;
    }
  }

  flush();
  return clusters;
}

export function extractChangedDiffClusters(hunkText) {
  return extractChangedDiffClustersWithRanges(hunkText).map(
    (cluster) => cluster.lines,
  );
}

function lineRangeLabel(startLine, endLine) {
  if (!Number.isInteger(startLine)) return null;
  return endLine && endLine !== startLine
    ? `L${startLine}-L${endLine}`
    : `L${startLine}`;
}

function clusterRangeLocation(file, cluster) {
  if (Number.isInteger(cluster.newStartLine)) {
    return {
      side: "head",
      location: {
        file,
        startLine: cluster.newStartLine,
        ...(cluster.newEndLine !== cluster.newStartLine
          ? { endLine: cluster.newEndLine }
          : {}),
      },
    };
  }

  if (Number.isInteger(cluster.oldStartLine)) {
    return {
      side: "base",
      location: {
        file,
        startLine: cluster.oldStartLine,
        ...(cluster.oldEndLine !== cluster.oldStartLine
          ? { endLine: cluster.oldEndLine }
          : {}),
      },
    };
  }

  return null;
}

function renderClusterSourceLabel(file, cluster, linkContext = {}) {
  const ranged = clusterRangeLocation(file, cluster);
  if (!ranged) return `Source: \`${file}\``;

  const { side, location } = ranged;
  const ref =
    side === "head"
      ? linkContext.currentRef
      : linkContext.baseRef;
  const range = lineRangeLabel(
    location.startLine,
    location.endLine,
  );
  const label = `${file}:${range}`;
  const url = buildGitHubLineUrl(location, {
    serverUrl: linkContext.serverUrl,
    repository: linkContext.repository,
    ref,
  });

  if (side === "base") {
    return url
      ? `[${escapeMarkdownLabel(label)}](${url}) _(previous)_`
      : `\`${label}\` _(previous)_`;
  }

  return url
    ? `[${escapeMarkdownLabel(label)}](${url})`
    : `\`${label}\``;
}

function clusterOverlapsLocations(file, cluster, locations) {
  if (!Number.isInteger(cluster.newStartLine)) return false;

  const clusterRange = {
    startLine: cluster.newStartLine,
    endLine: cluster.newEndLine ?? cluster.newStartLine,
  };

  return (locations ?? []).some((location) => {
    if (location.file !== file) return false;

    const locationRange = {
      startLine: location.startLine,
      endLine: location.endLine ?? location.startLine,
    };

    return rangesOverlap(clusterRange, locationRange);
  });
}

export function renderChangedDiffClusters(
  hunkText,
) {
  const clusters = extractChangedDiffClusters(hunkText);

  if (clusters.length === 0) return "";

  return clusters
    .map((cluster) => {
      const text = cluster.join("\n");
      const fence = safeDiffFence(text);

      return [
        `${fence}diff`,
        text,
        fence,
      ].join("\n");
    })
    .join("\n\n");
}

function safeDiffFence(text) {
  const body = String(text ?? "");
  const longestRun = Math.max(
    3,
    ...[...body.matchAll(/`+/g)].map((match) => match[0].length + 1),
  );

  return "`".repeat(longestRun);
}

export function renderFindingDiffHunks(
  item,
  mode,
  linkContext = {},
) {
  if (mode === "resolved") return "";

  const changedLocations = diffAwareLocations(
    item.locations,
    linkContext.changedLineRanges ?? {},
  );

  if (changedLocations.length === 0) return "";

  const hunks = selectDiffHunksForLocations(
    changedLocations,
    linkContext.diffHunks ?? {},
  );

  if (hunks.length === 0) {
    return "  - Diff hunk: _unavailable for the overlapping changed lines_";
  }

  return hunks
    .map((hunk) => {
      const allClusters =
        extractChangedDiffClustersWithRanges(hunk.text);
      const matchingClusters = allClusters.filter((cluster) =>
        clusterOverlapsLocations(
          hunk.file,
          cluster,
          changedLocations,
        ),
      );
      const clusters =
        matchingClusters.length > 0
          ? matchingClusters
          : allClusters;

      if (clusters.length === 0) {
        return `  - Diff hunk (${hunk.file}): _no added or removed lines_`;
      }

      const blocks = clusters.flatMap((cluster, index) => {
        const text = cluster.lines.join("\n");
        const fence = safeDiffFence(text);
        const sourceLabel = renderClusterSourceLabel(
          hunk.file,
          cluster,
          linkContext,
        );

        return [
          ...(clusters.length > 1
            ? [`    **Change cluster ${index + 1}/${clusters.length}**`, ""]
            : []),
          `    ${sourceLabel}`,
          "",
          `    ${fence}diff`,
          ...text.split("\n").map((line) => `    ${line}`),
          `    ${fence}`,
          ...(index < clusters.length - 1 ? [""] : []),
        ];
      });

      return [
        `  - Diff hunk (${hunk.file}, changed lines grouped):`,
        "",
        ...blocks,
      ].join("\n");
    })
    .join("\n");
}

export function renderDiffAwareFindingLinks(
  item,
  mode,
  linkContext = {},
) {
  const ref = linkRefForDiffMode(mode, linkContext);

  if (mode === "resolved") {
    return {
      label: "Previous source",
      links: renderFindingLocationLinks(
        item.locations,
        item.files,
        {
          serverUrl: linkContext.serverUrl,
          repository: linkContext.repository,
          ref,
        },
      ),
      usedDiffLines: false,
      changedLocations: [],
    };
  }

  const changedLocations = diffAwareLocations(
    item.locations,
    linkContext.changedLineRanges ?? {},
  );

  if (changedLocations.length > 0) {
    return {
      label: "Changed lines",
      links: renderFindingLocationLinks(
        changedLocations,
        item.files,
        {
          serverUrl: linkContext.serverUrl,
          repository: linkContext.repository,
          ref,
        },
      ),
      usedDiffLines: true,
      changedLocations,
    };
  }

  return {
    label: "Source (no overlapping changed lines)",
    links: renderFindingLocationLinks(
      item.locations,
      item.files,
      {
        serverUrl: linkContext.serverUrl,
        repository: linkContext.repository,
        ref,
      },
    ),
    usedDiffLines: false,
    changedLocations: [],
  };
}

function linkRefForDiffMode(mode, linkContext) {
  if (mode === "resolved") return linkContext?.baseRef ?? null;
  return linkContext?.currentRef ?? null;
}

function renderDiffList(items, mode, linkContext) {
  if (items.length === 0) return "_None._";

  return items
    .map((item) => {
      const source = renderDiffAwareFindingLinks(
        item,
        mode,
        linkContext,
      );

      const diffHunks = renderFindingDiffHunks(
        item,
        mode,
        linkContext,
      );

      if (mode === "severity") {
        const arrow = item.direction === "increased" ? "↑" : "↓";
        return [
          `- ${arrow} **${item.id}** [${item.report}] — \`${item.from}\` → \`${item.to}\` — ${item.title}`,
          `  - ${source.label}: ${source.links}`,
          ...(diffHunks ? [diffHunks] : []),
        ].join("\n");
      }

      return [
        `- \`${item.severity}\` **${item.id}** [${item.report}] — ${item.title}`,
        `  - ${source.label}: ${source.links}`,
        ...(diffHunks ? [diffHunks] : []),
      ].join("\n");
    })
    .join("\n");
}

function renderKindDiff(kind, diff, linkContext) {
  const label = kind === "ux" ? "UX" : "UI";

  return [
    `### ${label} changes`,
    "",
    `**New findings (${diff.introduced.length})**`,
    "",
    renderDiffList(diff.introduced, "introduced", linkContext),
    "",
    `**Resolved findings (${diff.resolved.length})**`,
    "",
    renderDiffList(diff.resolved, "resolved", linkContext),
    "",
    `**Severity changes (${diff.severityChanges.length})**`,
    "",
    renderDiffList(diff.severityChanges, "severity", linkContext),
  ].join("\n");
}

export function renderAuditDiffSection(
  diff,
  baseLabel = "previous commit",
  linkContext = {},
) {
  const totalChanges =
    diff.ux.introduced.length +
    diff.ux.resolved.length +
    diff.ux.severityChanges.length +
    diff.ui.introduced.length +
    diff.ui.resolved.length +
    diff.ui.severityChanges.length;

  return [
    "## Changes since previous commit",
    "",
    `Compared with: \`${baseLabel}\``,
    "",
    totalChanges === 0
      ? "_No audit finding changes detected._"
      : [
          renderKindDiff("ux", diff.ux, linkContext),
          "",
          renderKindDiff("ui", diff.ui, linkContext),
        ].join("\n"),
  ].join("\n");
}

export function renderAuditPrComment(
  collected,
  previousCollected = null,
  baseLabel = null,
  linkContext = {},
) {
  const ux = aggregateKind(collected.ux ?? []);
  const ui = aggregateKind(collected.ui ?? []);

  const sections = [
    COMMENT_MARKER,
    "# UX/UI Audit Summary",
    "",
    "Generated by CI from the committed audit JSON reports.",
  ];

  if (previousCollected) {
    const diff = compareAuditFindings(collected, previousCollected);
    sections.push(
      "",
      renderAuditDiffSection(
        diff,
        baseLabel ?? "previous commit",
        linkContext,
      ),
    );
  }

  sections.push(
    "",
    renderKind("ux", ux),
    "",
    "---",
    "",
    renderKind("ui", ui),
    "",
    "---",
    "",
    "_This comment is updated automatically when audit artifacts change._",
    "",
  );

  return sections.join("\n");
}

function parseCli(argv) {
  const args = [...argv];
  let baseRef = process.env.AUDIT_BASE_REF || null;
  let currentRef =
    process.env.AUDIT_CURRENT_REF ||
    process.env.GITHUB_SHA ||
    null;

  while (args.length > 0) {
    const flag = args.shift();

    if (flag === "--base-ref") {
      baseRef = args.shift() || null;
      continue;
    }

    if (flag === "--current-ref") {
      currentRef = args.shift() || null;
      continue;
    }

    throw new Error(`Unknown option: ${flag}`);
  }

  return { baseRef, currentRef };
}

function main() {
  try {
    const { baseRef, currentRef } = parseCli(process.argv.slice(2));
    const collected = collectAuditReports(repoRoot);
    const previousCollected = baseRef
      ? collectAuditReportsFromGitRef(baseRef, repoRoot)
      : null;
    const findingFiles = currentFindingFiles(collected);
    const changedLineRanges =
      baseRef && currentRef
        ? collectChangedLineRanges(
            baseRef,
            currentRef,
            findingFiles,
            repoRoot,
          )
        : {};
    const diffHunks =
      baseRef && currentRef
        ? collectChangedDiffHunks(
            baseRef,
            currentRef,
            findingFiles,
            repoRoot,
          )
        : {};

    process.stdout.write(
      renderAuditPrComment(
        collected,
        previousCollected,
        baseRef,
        {
          serverUrl: process.env.GITHUB_SERVER_URL || "https://github.com",
          repository: process.env.GITHUB_REPOSITORY || null,
          currentRef,
          baseRef,
          changedLineRanges,
          diffHunks,
        },
      ),
    );
  } catch (error) {
    process.stderr.write("AUDIT PR COMMENT: BLOCKED\n");
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isCli) main();
