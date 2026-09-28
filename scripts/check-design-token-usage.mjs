#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const DEFAULT_SCAN_ROOTS = ["src"];
const EXCLUDED_FILES = new Set([
  path.normalize("src/styles/tokens.css"),
]);

const SOURCE_EXTENSIONS = new Set([
  ".css",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const DESIGN_TOKENS = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "design", "tokens.json"), "utf8"),
);

const RULES = [
  {
    id: "hardcoded-color",
    category: "colors",
    description: "Use a semantic design color token instead of a raw color literal.",
    patterns: [
      /#[0-9a-fA-F]{3,8}\b/g,
      /\brgba?\(\s*[^)]+\)/g,
      /\bhsla?\(\s*[^)]+\)/g,
      /\boklch\(\s*[^)]+\)/g,
      /\boklab\(\s*[^)]+\)/g,
    ],
  },
  {
    id: "hardcoded-spacing-css",
    category: "spacing",
    description: "Use a spacing token instead of a raw CSS spacing value.",
    patterns: [
      /\b(?:margin|margin-top|margin-right|margin-bottom|margin-left|padding|padding-top|padding-right|padding-bottom|padding-left|gap|row-gap|column-gap)\s*:\s*(?!var\(|0(?:\s|;|$))[-+]?(?:\d*\.)?\d+(?:px|rem|em|vh|vw)\b/g,
    ],
  },
  {
    id: "hardcoded-spacing-tailwind",
    category: "spacing",
    description: "Avoid arbitrary Tailwind spacing values; use the shared spacing scale.",
    patterns: [
      /(?:^|[\s"'`])(?:-?(?:m|p)(?:[trblxy])?|gap(?:-[xy])?|space-[xy])-\[[^\]]+\]/g,
    ],
  },
  {
    id: "hardcoded-radius-css",
    category: "radii",
    description: "Use a radius token instead of a raw border-radius value.",
    patterns: [
      /\bborder-radius\s*:\s*(?!var\(|0(?:\s|;|$))[-+]?(?:\d*\.)?\d+(?:px|rem|em|%)\b/g,
    ],
  },
  {
    id: "hardcoded-radius-tailwind",
    category: "radii",
    description: "Avoid arbitrary Tailwind radius values; use the shared radius scale.",
    patterns: [
      /(?:^|[\s"'`])rounded(?:-[trbl]{1,2})?-\[[^\]]+\]/g,
    ],
  },
  {
    id: "hardcoded-shadow-css",
    category: "shadows",
    description: "Use a shadow token instead of a raw shadow declaration.",
    patterns: [
      /\b(?:box-shadow|text-shadow)\s*:\s*(?:inset\s+)?[-+]?(?:\d*\.)?\d[^;}\n]*/g,
    ],
  },
  {
    id: "hardcoded-shadow-tailwind",
    category: "shadows",
    description: "Avoid arbitrary Tailwind shadow values; use the shared shadow scale.",
    patterns: [
      /(?:^|[\s"'`])shadow-\[[^\]]+\]/g,
    ],
  },
  {
    id: "hardcoded-motion-css",
    category: "motion",
    description: "Use a motion duration/easing token instead of a raw timing value.",
    patterns: [
      /\b(?:transition-duration|animation-duration|transition-delay|animation-delay)\s*:\s*(?!var\(|0(?:s|ms)?(?:\s|;|$))[-+]?(?:\d*\.)?\d+(?:ms|s)\b/g,
      /\btransition\s*:\s*[^;}\n]*\b[-+]?(?:\d*\.)?\d+(?:ms|s)\b[^;}\n]*/g,
    ],
  },
  {
    id: "hardcoded-motion-tailwind",
    category: "motion",
    description: "Avoid arbitrary Tailwind timing values; use shared motion tokens.",
    patterns: [
      /(?:^|[\s"'`])(?:duration|delay)-\[[^\]]+\]/g,
    ],
  },
  {
    id: "hardcoded-breakpoint-css",
    category: "breakpoints",
    description: "Use a responsive breakpoint token instead of a raw media-query width.",
    patterns: [
      /@media[^{]*(?:min-width|max-width)\s*:\s*[-+]?(?:\d*\.)?\d+(?:px|rem|em)\b/gi,
    ],
  },
  {
    id: "hardcoded-breakpoint-tailwind",
    category: "breakpoints",
    description: "Avoid arbitrary Tailwind responsive breakpoints; use named breakpoints.",
    patterns: [
      /(?:^|[\s"'`])(?:min|max)-\[[^\]]+\]:/g,
    ],
  },
];

function lineAndColumn(content, offset) {
  const before = content.slice(0, offset);
  const line = before.split("\n").length;
  const lastNewline = before.lastIndexOf("\n");
  const column = offset - lastNewline;
  return { line, column };
}

function collectFiles(startPath) {
  const stat = fs.statSync(startPath);

  if (stat.isFile()) return [startPath];

  const files = [];
  for (const entry of fs.readdirSync(startPath, { withFileTypes: true })) {
    const absolute = path.join(startPath, entry.name);
    if (entry.name === "node_modules" || entry.name === ".next") continue;

    if (entry.isDirectory()) {
      files.push(...collectFiles(absolute));
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(absolute);
    }
  }
  return files;
}

function parseCssLength(raw) {
  if (typeof raw !== "string") return null;
  const match = raw.trim().match(/^(-?(?:\d*\.)?\d+)(px|rem|em)$/i);
  if (!match) return null;

  const value = Number.parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === "px") return value;
  if (unit === "rem" || unit === "em") return value * 16;
  return null;
}

function parseDurationMs(raw) {
  if (typeof raw !== "string") return null;
  const match = raw.trim().match(/^((?:\d*\.)?\d+)(ms|s)$/i);
  if (!match) return null;

  const value = Number.parseFloat(match[1]);
  return match[2].toLowerCase() === "s" ? value * 1000 : value;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "").trim();
  if (![3, 6, 8].includes(clean.length)) return null;

  const expanded =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : clean.slice(0, 6);

  const number = Number.parseInt(expanded, 16);
  if (Number.isNaN(number)) return null;

  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

function parseRgbFunction(raw) {
  const match = raw.match(
    /rgba?\(\s*([0-9.]+)[,\s]+([0-9.]+)[,\s]+([0-9.]+)/i,
  );
  if (!match) return null;

  return {
    r: Number.parseFloat(match[1]),
    g: Number.parseFloat(match[2]),
    b: Number.parseFloat(match[3]),
  };
}

function parseColor(raw) {
  if (raw.startsWith("#")) return hexToRgb(raw);
  if (/^rgba?\(/i.test(raw)) return parseRgbFunction(raw);
  return null;
}

function colorDistance(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.sqrt(
    (a.r - b.r) ** 2 +
      (a.g - b.g) ** 2 +
      (a.b - b.b) ** 2,
  );
}

function nearestEntry(entries, target, parser) {
  const targetValue = parser(target);
  if (targetValue === null) return null;

  let best = null;

  for (const [name, raw] of entries) {
    const parsed = parser(raw);
    if (parsed === null) continue;

    const distance =
      typeof targetValue === "number"
        ? Math.abs(targetValue - parsed)
        : colorDistance(targetValue, parsed);

    if (!best || distance < best.distance) {
      best = { name, raw, distance };
    }
  }

  return best;
}

function extractValue(violation) {
  const raw = violation.value;

  if (violation.category === "colors") return raw.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/)?.[0] ?? raw;

  if (violation.category === "spacing") {
    return raw.match(/-?(?:\d*\.)?\d+(?:px|rem|em)/)?.[0] ?? null;
  }

  if (violation.category === "radii") {
    return raw.match(/-?(?:\d*\.)?\d+(?:px|rem|em|%)/)?.[0] ?? null;
  }

  if (violation.category === "motion") {
    return raw.match(/(?:\d*\.)?\d+(?:ms|s)/)?.[0] ?? null;
  }

  if (violation.category === "breakpoints") {
    return raw.match(/(?:\d*\.)?\d+(?:px|rem|em)/)?.[0] ?? null;
  }

  return raw;
}

function tailwindSpacingPrefix(raw) {
  const match = raw.trim().match(/(?:^|[\s"'`])(-?(?:m|p)(?:[trblxy])?|gap(?:-[xy])?|space-[xy])-\[/);
  return match?.[1] ?? null;
}

function tailwindMotionPrefix(raw) {
  const match = raw.trim().match(/(?:^|[\s"'`])((?:duration|delay))-\[/);
  return match?.[1] ?? "duration";
}

function tailwindBreakpointPrefix(raw) {
  return raw.includes("max-[") ? "max" : "min";
}

export function suggestReplacement(violation) {
  const value = extractValue(violation);

  if (violation.category === "colors") {
    const candidates = Object.entries(DESIGN_TOKENS.colors).filter(([, raw]) =>
      /^#[0-9a-fA-F]{3,8}$/.test(raw),
    );
    const nearest = nearestEntry(candidates, value, parseColor);

    if (!nearest) {
      return "Use the nearest semantic color token, e.g. var(--color-brand) or a named Tailwind semantic color.";
    }

    return `Closest token: colors.${nearest.name} (${nearest.raw}) → use var(--color-${nearest.name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}) or the matching semantic Tailwind utility.`;
  }

  if (violation.category === "spacing") {
    const nearest = nearestEntry(
      Object.entries(DESIGN_TOKENS.spacing),
      value,
      parseCssLength,
    );

    if (!nearest) {
      return "Use an existing spacing token such as var(--space-4) or a named Tailwind spacing utility.";
    }

    if (violation.rule === "hardcoded-spacing-tailwind") {
      const prefix = tailwindSpacingPrefix(violation.value);
      if (prefix) {
        return `Closest token: spacing.${nearest.name} (${nearest.raw}) → use ${prefix}-${nearest.name}.`;
      }
    }

    return `Closest token: spacing.${nearest.name} (${nearest.raw}) → use var(--space-${nearest.name}).`;
  }

  if (violation.category === "radii") {
    const candidates = Object.entries(DESIGN_TOKENS.radii).filter(
      ([name]) => name !== "full",
    );
    const nearest = nearestEntry(candidates, value, parseCssLength);

    if (!nearest) {
      return "Use an existing radius token such as var(--radius-md) or a named Tailwind rounded utility.";
    }

    if (violation.rule === "hardcoded-radius-tailwind") {
      return `Closest token: radii.${nearest.name} (${nearest.raw}) → use rounded-${nearest.name}.`;
    }

    return `Closest token: radii.${nearest.name} (${nearest.raw}) → use var(--radius-${nearest.name}).`;
  }

  if (violation.category === "shadows") {
    const entries = Object.entries(DESIGN_TOKENS.shadows);
    const fallback = entries.find(([name]) => name === "md") ?? entries[0];

    if (violation.rule === "hardcoded-shadow-tailwind") {
      return `Use a named shadow token; recommended starting point: shadow-${fallback[0]} (${fallback[1]}).`;
    }

    return `Use a shadow token; recommended starting point: var(--shadow-${fallback[0]}) (${fallback[1]}).`;
  }

  if (violation.category === "motion") {
    const nearest = nearestEntry(
      Object.entries(DESIGN_TOKENS.motion.duration),
      value,
      parseDurationMs,
    );

    if (!nearest) {
      return "Use a motion duration token such as var(--motion-normal) or a named Tailwind duration utility.";
    }

    if (violation.rule === "hardcoded-motion-tailwind") {
      const prefix = tailwindMotionPrefix(violation.value);
      const ms = Math.round(parseDurationMs(nearest.raw));
      return `Closest token: motion.duration.${nearest.name} (${nearest.raw}) → use ${prefix}-${ms}.`;
    }

    return `Closest token: motion.duration.${nearest.name} (${nearest.raw}) → use var(--motion-${nearest.name}).`;
  }

  if (violation.category === "breakpoints") {
    const nearest = nearestEntry(
      Object.entries(DESIGN_TOKENS.breakpoints),
      value,
      parseCssLength,
    );

    if (!nearest) {
      return "Use one of the named responsive breakpoints: xs, sm, md, lg, xl, or 2xl.";
    }

    if (violation.rule === "hardcoded-breakpoint-tailwind") {
      const prefix = tailwindBreakpointPrefix(violation.value);
      return `Closest breakpoint: ${nearest.name} (${nearest.raw}) → prefer ${nearest.name}: for min-width behavior${prefix === "max" ? `, or express the max-width behavior using the nearest named breakpoint strategy` : ""}.`;
    }

    return `Closest breakpoint: ${nearest.name} (${nearest.raw}) → use var(--breakpoint-${nearest.name}) where supported, or the ${nearest.name}: responsive utility.`;
  }

  return "Replace the hardcoded value with the closest existing design token.";
}

export function scanContent(content, relativePath = "inline.tsx") {
  const normalizedPath = path.normalize(relativePath);
  if (EXCLUDED_FILES.has(normalizedPath)) return [];

  const violations = [];

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(content)) !== null) {
        const { line, column } = lineAndColumn(content, match.index);
        const violation = {
          rule: rule.id,
          category: rule.category,
          file: relativePath,
          line,
          column,
          value: match[0].trim(),
          message: rule.description,
        };

        violation.suggestion = suggestReplacement(violation);
        violations.push(violation);

        if (match.index === pattern.lastIndex) pattern.lastIndex += 1;
      }
    }
  }

  return violations.sort(
    (a, b) =>
      a.line - b.line ||
      a.column - b.column ||
      a.rule.localeCompare(b.rule),
  );
}

export function scanPaths(scanRoots = DEFAULT_SCAN_ROOTS) {
  const violations = [];

  for (const root of scanRoots) {
    const absoluteRoot = path.resolve(repoRoot, root);
    if (!fs.existsSync(absoluteRoot)) continue;

    for (const absoluteFile of collectFiles(absoluteRoot)) {
      const relativePath = path.relative(repoRoot, absoluteFile);
      const content = fs.readFileSync(absoluteFile, "utf8");
      violations.push(...scanContent(content, relativePath));
    }
  }

  return violations;
}

function main() {
  const violations = scanPaths();

  if (violations.length > 0) {
    process.stderr.write("DESIGN TOKEN USAGE: BLOCKED\n");

    for (const violation of violations) {
      process.stderr.write(
        `- [${violation.category}] ${violation.file}:${violation.line}:${violation.column} ${violation.value}\n`,
      );
      process.stderr.write(`  ${violation.message}\n`);
      process.stderr.write(`  Suggestion: ${violation.suggestion}\n`);
    }

    process.exitCode = 2;
    return;
  }

  process.stdout.write("DESIGN TOKEN USAGE: PASS\n");
  process.stdout.write(
    "No hardcoded colors, arbitrary spacing/radii/shadows/motion values, or custom breakpoints found outside the token source.\n",
  );
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isCli) main();
