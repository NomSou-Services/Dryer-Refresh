#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

export const REQUIRED_GROUPS = [
  "version",
  "colors",
  "typography",
  "spacing",
  "radii",
  "shadows",
  "motion",
  "breakpoints",
];

export const REQUIRED_COLORS = [
  "background",
  "surface",
  "foreground",
  "muted",
  "mutedForeground",
  "border",
  "brand",
  "brandForeground",
  "dominant",
  "dominantForeground",
  "secondary",
  "secondaryForeground",
  "accent",
  "accentForeground",
  "destructive",
  "focus",
];

export const REQUIRED_TYPOGRAPHY_GROUPS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
];

export const REQUIRED_BREAKPOINTS = ["xs", "sm", "md", "lg", "xl", "2xl"];

function isNonEmptyObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}

function parsePx(value) {
  if (typeof value !== "string" || !/^\d+px$/.test(value)) return null;
  return Number.parseInt(value, 10);
}

export function validateDesignTokens(tokens) {
  const errors = [];

  if (!isNonEmptyObject(tokens)) {
    return ["Token document must be a JSON object."];
  }

  for (const group of REQUIRED_GROUPS) {
    if (!(group in tokens)) errors.push(`Missing top-level token group: ${group}`);
  }

  if (typeof tokens.version !== "string" || !/^\d+\.\d+\.\d+$/.test(tokens.version)) {
    errors.push("version must use semantic version format, e.g. 1.0.0");
  }

  if (isNonEmptyObject(tokens.colors)) {
    for (const key of REQUIRED_COLORS) {
      if (typeof tokens.colors[key] !== "string" || tokens.colors[key].trim() === "") {
        errors.push(`Missing or invalid color token: colors.${key}`);
      }
    }
  } else if ("colors" in tokens) {
    errors.push("colors must be a non-empty object.");
  }

  if (isNonEmptyObject(tokens.typography)) {
    for (const key of REQUIRED_TYPOGRAPHY_GROUPS) {
      if (!isNonEmptyObject(tokens.typography[key])) {
        errors.push(`Missing or invalid typography group: typography.${key}`);
      }
    }
  } else if ("typography" in tokens) {
    errors.push("typography must be a non-empty object.");
  }

  for (const group of ["spacing", "radii", "shadows"]) {
    if (group in tokens && !isNonEmptyObject(tokens[group])) {
      errors.push(`${group} must be a non-empty object.`);
    }
  }

  if (isNonEmptyObject(tokens.motion)) {
    if (!isNonEmptyObject(tokens.motion.duration)) {
      errors.push("motion.duration must be a non-empty object.");
    }
    if (!isNonEmptyObject(tokens.motion.easing)) {
      errors.push("motion.easing must be a non-empty object.");
    }
  } else if ("motion" in tokens) {
    errors.push("motion must be a non-empty object.");
  }

  if (isNonEmptyObject(tokens.breakpoints)) {
    const numeric = [];

    for (const key of REQUIRED_BREAKPOINTS) {
      const raw = tokens.breakpoints[key];
      const px = parsePx(raw);

      if (px === null) {
        errors.push(`breakpoints.${key} must be an integer pixel value, e.g. 768px`);
      } else {
        numeric.push([key, px]);
      }
    }

    for (let index = 1; index < numeric.length; index += 1) {
      const [previousKey, previousValue] = numeric[index - 1];
      const [currentKey, currentValue] = numeric[index];

      if (currentValue <= previousValue) {
        errors.push(
          `Responsive breakpoints must increase strictly: ${currentKey} (${currentValue}px) must be greater than ${previousKey} (${previousValue}px)`,
        );
      }
    }
  } else if ("breakpoints" in tokens) {
    errors.push("breakpoints must be a non-empty object.");
  }

  return errors;
}

function main() {
  const tokenPath = path.resolve(repoRoot, "design", "tokens.json");
  const raw = fs.readFileSync(tokenPath, "utf8");
  const tokens = JSON.parse(raw);
  const errors = validateDesignTokens(tokens);

  if (errors.length > 0) {
    process.stderr.write("DESIGN TOKEN CONTRACT: BLOCKED\n");
    for (const error of errors) process.stderr.write(`- ${error}\n`);
    process.exitCode = 2;
    return;
  }

  process.stdout.write("DESIGN TOKEN CONTRACT: PASS\n");
  process.stdout.write(`Validated: ${path.relative(repoRoot, tokenPath)}\n`);
  process.stdout.write(`Groups: ${REQUIRED_GROUPS.join(", ")}\n`);
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isCli) main();
