import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const workflow = fs.readFileSync(
  path.join(repoRoot, ".github", "workflows", "ci.yml"),
  "utf8",
);

test("CI grants pull-request comment permission", () => {
  assert.match(workflow, /pull-requests:\s*write/);
});

test("CI builds audit comment only for pull requests", () => {
  assert.match(workflow, /name: Build audit PR comment/);
  assert.match(workflow, /npm run audit:comment > audit-pr-comment\.md/);
  assert.match(workflow, /if: github\.event_name == 'pull_request'/);
});

test("CI posts or updates one sticky audit comment", () => {
  assert.match(workflow, /actions\/github-script@v7/);
  assert.match(workflow, /grok-audit-summary/);
  assert.match(workflow, /issues\.updateComment/);
  assert.match(workflow, /issues\.createComment/);
});

test("CI handles read-only fork PR tokens without failing validation", () => {
  assert.match(workflow, /error\.status === 403/);
  assert.match(workflow, /core\.warning/);
});


test("CI resolves the previous PR-head commit for audit diffing", () => {
  assert.match(workflow, /name: Resolve previous PR head commit/);
  assert.match(workflow, /github\.event\.pull_request\.head\.sha/);
  assert.match(workflow, /AUDIT_BASE_REF/);
  assert.match(workflow, /git rev-parse/);
});

test("audit comment renderer receives the previous commit through environment", () => {
  assert.match(workflow, /echo "AUDIT_BASE_REF=/);
  assert.match(workflow, /npm run audit:comment > audit-pr-comment\.md/);
});


test("CI exposes exact current and previous refs for file links", () => {
  assert.match(workflow, /AUDIT_CURRENT_REF/);
  assert.match(workflow, /AUDIT_BASE_REF/);
  assert.match(workflow, /github\.event\.pull_request\.head\.sha/);
});


test("CI exposes refs needed for commit-pinned line links", () => {
  assert.match(workflow, /AUDIT_CURRENT_REF/);
  assert.match(workflow, /AUDIT_BASE_REF/);
});


test("CI fetches the PR-head ref with enough history for diff-aware line links", () => {
  assert.match(
    workflow,
    /git fetch --no-tags --depth=2 origin "pull\/\$\{\{ github\.event\.pull_request\.number \}\}\/head"/,
  );
  assert.match(workflow, /PREVIOUS_AUDIT_REF=.*CURRENT_AUDIT_REF.*\^/);
});
