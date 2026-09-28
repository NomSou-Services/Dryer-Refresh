#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const requiredRoleColors = [
  "dominant",
  "dominantForeground",
  "secondary",
  "secondaryForeground",
  "accent",
  "accentForeground",
];

const requiredUsage = [
  {
    file: "src/components/sections/hero.tsx",
    patterns: ["bg-dominant", "text-dominant-foreground", "text-accent"],
  },
  {
    file: "src/components/sections/feature-grid.tsx",
    patterns: ["bg-secondary", "text-secondary-foreground", "bg-surface", "bg-accent"],
  },
  {
    file: "src/components/sections/cta.tsx",
    patterns: ["bg-dominant", "bg-brand", "text-brand-foreground"],
  },
  {
    file: "src/components/ui/button-link.tsx",
    patterns: ["bg-accent", "text-accent-foreground", "bg-surface", "hover:bg-secondary"],
  },
  {
    file: "src/components/layout/site-footer.tsx",
    patterns: ["bg-brand", "text-brand-foreground"],
  },
];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

export function checkColorBalanceUi(rootPath = repoRoot) {
  const errors = [];
  const tokens = JSON.parse(
    fs.readFileSync(path.join(rootPath, "design/tokens.json"), "utf8"),
  );

  for (const key of requiredRoleColors) {
    if (
      typeof tokens.colors?.[key] !== "string" ||
      tokens.colors[key].trim() === ""
    ) {
      errors.push(`Missing 60/30/10 role token: colors.${key}`);
    }
  }

  const tokenCss = fs.readFileSync(
    path.join(rootPath, "src/styles/tokens.css"),
    "utf8",
  );
  for (const cssName of [
    "--token-color-dominant",
    "--token-color-dominant-foreground",
    "--token-color-secondary",
    "--token-color-secondary-foreground",
    "--token-color-accent",
    "--token-color-accent-foreground",
  ]) {
    if (!tokenCss.includes(cssName)) {
      errors.push(`Missing CSS role token: ${cssName}`);
    }
  }

  const globalsCss = fs.readFileSync(
    path.join(rootPath, "src/app/globals.css"),
    "utf8",
  );
  for (const utilityToken of [
    "--color-dominant:",
    "--color-dominant-foreground:",
    "--color-secondary:",
    "--color-secondary-foreground:",
    "--color-accent:",
    "--color-accent-foreground:",
  ]) {
    if (!globalsCss.includes(utilityToken)) {
      errors.push(`Tailwind theme does not expose ${utilityToken.slice(0, -1)}`);
    }
  }

  for (const entry of requiredUsage) {
    const source = fs.readFileSync(path.join(rootPath, entry.file), "utf8");
    for (const pattern of entry.patterns) {
      if (!source.includes(pattern)) {
        errors.push(`${entry.file} must use ${pattern}`);
      }
    }
  }

  return errors;
}

function main() {
  const errors = checkColorBalanceUi(repoRoot);

  if (errors.length > 0) {
    process.stderr.write("60/30/10 UI CHECK: BLOCKED\n");
    for (const error of errors) {
      process.stderr.write(`- ${error}\n`);
    }
    process.exitCode = 2;
    return;
  }

  process.stdout.write("60/30/10 UI CHECK: PASS\n");
  process.stdout.write("Role tokens are wired into the shared starter UI.\n");
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isCli) main();
