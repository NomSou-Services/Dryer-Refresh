import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  REQUIRED_COLORS,
  REQUIRED_GROUPS,
  validateDesignTokens,
} from "./validate-design-tokens.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function readTokens() {
  return JSON.parse(
    fs.readFileSync(path.join(repoRoot, "design", "tokens.json"), "utf8"),
  );
}

test("canonical token file satisfies the contract", () => {
  const errors = validateDesignTokens(readTokens());
  assert.deepEqual(errors, []);
});

test("contract includes every required visual primitive group", () => {
  assert.deepEqual(REQUIRED_GROUPS, [
    "version",
    "colors",
    "typography",
    "spacing",
    "radii",
    "shadows",
    "motion",
    "breakpoints",
  ]);
});

test("missing token group is rejected", () => {
  const tokens = readTokens();
  delete tokens.shadows;

  assert.match(
    validateDesignTokens(tokens).join("\n"),
    /Missing top-level token group: shadows/,
  );
});

test("breakpoints must be strictly increasing", () => {
  const tokens = readTokens();
  tokens.breakpoints.lg = "700px";

  assert.match(
    validateDesignTokens(tokens).join("\n"),
    /Responsive breakpoints must increase strictly/,
  );
});

test("breakpoints must use pixel values", () => {
  const tokens = readTokens();
  tokens.breakpoints.md = "48rem";

  assert.match(
    validateDesignTokens(tokens).join("\n"),
    /breakpoints\.md must be an integer pixel value/,
  );
});


test("contract requires explicit 60/30/10 role colors", () => {
  for (const role of [
    "dominant",
    "dominantForeground",
    "secondary",
    "secondaryForeground",
    "accent",
    "accentForeground",
  ]) {
    assert.ok(REQUIRED_COLORS.includes(role));
  }
});

test("missing a 60/30/10 role color is rejected", () => {
  const tokens = readTokens();
  delete tokens.colors.secondaryForeground;

  assert.match(
    validateDesignTokens(tokens).join("\n"),
    /colors\.secondaryForeground/,
  );
});
