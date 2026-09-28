#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

export const COMMANDS = Object.freeze({
  "/new-client": {
    prompt: ".grok/commands/new-client.md",
    contract: ".grok/contracts/design-tokens.schema.json",
    required: ["client_name", "industry", "primary_goal"],
    allowed: [
      "client_name", "industry", "primary_goal", "audience", "site_type", "pages",
      "primary_cta", "brand_direction", "content_status", "assets", "integrations",
      "seo_targets", "contact_details", "references", "hosting", "analytics", "cms",
      "forms", "constraints", "deadline_note",
    ],
  },
  "/build-page": {
    prompt: ".grok/commands/build-page.md",
    contracts: [
      ".grok/contracts/design-tokens.schema.json",
      ".grok/contracts/color-balance.schema.json",
      ".grok/contracts/component-states.schema.json",
      ".grok/contracts/responsive-behavior.schema.json",
      ".grok/contracts/forms.schema.json",
      ".grok/contracts/interaction-patterns.schema.json",
      ".grok/contracts/accessibility.schema.json",
    ],
    required: ["route", "goal"],
    allowed: [
      "route", "goal", "sections", "content_source", "primary_cta", "seo_topic",
      "design_direction", "reference", "interactions", "schema_type",
      "conversion_notes", "constraints", "new_components_allowed",
    ],
  },
  "/build-section": {
    prompt: ".grok/commands/build-section.md",
    contracts: [
      ".grok/contracts/design-tokens.schema.json",
      ".grok/contracts/color-balance.schema.json",
    ],
    required: ["section", "purpose"],
    allowed: [
      "section", "purpose", "route", "content", "variant", "cta",
      "design_direction", "interaction", "reference", "data_shape",
      "reusability_notes", "animation", "constraints",
    ],
  },
  "/audit": {
    prompt: ".grok/commands/audit.md",
    contracts: [
      ".grok/contracts/design-tokens.schema.json",
      ".grok/contracts/color-balance.schema.json",
      ".grok/contracts/component-states.schema.json",
      ".grok/contracts/responsive-behavior.schema.json",
      ".grok/contracts/forms.schema.json",
      ".grok/contracts/interaction-patterns.schema.json",
      ".grok/contracts/accessibility.schema.json",
    ],
    required: ["scope"],
    allowed: ["scope", "areas", "mode", "severity", "route", "notes"],
  },
  "/ux-audit": {
    prompt: ".grok/commands/ux-audit.md",
    contracts: [
      ".grok/contracts/component-states.schema.json",
      ".grok/contracts/responsive-behavior.schema.json",
      ".grok/contracts/forms.schema.json",
      ".grok/contracts/interaction-patterns.schema.json",
      ".grok/contracts/accessibility.schema.json",
      ".grok/contracts/ux-audit-checks.schema.json",
      ".grok/contracts/ux-audit-output.schema.json",
    ],
    required: ["scope", "goal"],
    allowed: [
      "scope", "goal", "areas", "mode", "severity", "route", "audience",
      "primary_action", "notes", "output",
    ],
  },
  "/ui-audit": {
    prompt: ".grok/commands/ui-audit.md",
    contracts: [
      ".grok/contracts/design-tokens.schema.json",
      ".grok/contracts/color-balance.schema.json",
      ".grok/contracts/component-states.schema.json",
      ".grok/contracts/responsive-behavior.schema.json",
      ".grok/contracts/ui-audit-checks.schema.json",
      ".grok/contracts/ui-audit-output.schema.json",
    ],
    required: ["scope"],
    allowed: [
      "scope", "areas", "mode", "severity", "route", "reference",
      "design_direction", "notes", "output",
    ],
  },
  "/fix": {
    prompt: ".grok/commands/fix.md",
    required: ["problem"],
    allowed: [
      "problem", "expected", "actual", "reproduction", "scope", "error_message",
      "logs", "screenshots", "first_seen", "recent_changes", "constraints",
    ],
  },
  "/refactor": {
    prompt: ".grok/commands/refactor.md",
    required: ["target", "goal"],
    allowed: [
      "target", "goal", "preserve", "pain_points", "scope_limit", "desired_pattern",
      "performance_goal", "dependency_constraints", "migration_notes",
    ],
  },
  "/design-tokens": {
    prompt: ".grok/commands/design-tokens.md",
    contracts: [
      ".grok/contracts/design-tokens.schema.json",
      ".grok/contracts/color-balance.schema.json",
    ],
    required: ["mode", "source"],
    allowed: [
      "mode", "source", "colors", "typography", "spacing", "radii", "shadows",
      "motion", "breakpoints", "color_balance", "constraints", "notes",
    ],
  },
  "/ship": {
    prompt: ".grok/commands/ship.md",
    required: ["release_scope"],
    allowed: [
      "release_scope", "environment", "release_name", "version", "known_changes",
      "deployment_target", "known_risks", "analytics_expectations", "form_endpoints",
      "manual_test_routes", "rollback_note",
    ],
  },
});

const commandPattern = new RegExp(
  `^\\s*(${Object.keys(COMMANDS)
    .map((command) => command.replace("/", "\\/"))
    .join("|")})(?=\\s|$)`,
  "i",
);

export function detectCommand(input) {
  const match = input.match(commandPattern);
  return match ? match[1].toLowerCase() : null;
}

function normalizeKey(key) {
  return key
    .trim()
    .toLowerCase()
    .replace(/[ -]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function parseInputsDetailed(input, command) {
  const firstLineEnd = input.indexOf("\n");
  const firstLine = firstLineEnd === -1 ? input : input.slice(0, firstLineEnd);
  const firstLineRemainder = firstLine.replace(command, "").trim();
  const body = firstLineEnd === -1 ? "" : input.slice(firstLineEnd + 1);
  const lines = body.split(/\r?\n/);

  const values = {};
  const seen = new Map();
  const duplicates = new Set();
  const duplicateDetails = {};
  const malformedLines = [];
  const repeatedCommandHeaders = [];
  let currentKey = null;

  function recordField(rawKey, value) {
    const normalizedKey = normalizeKey(rawKey);
    const rawName = rawKey.trim();

    if (seen.has(normalizedKey)) {
      duplicates.add(normalizedKey);
      const existing = duplicateDetails[normalizedKey] ?? [seen.get(normalizedKey)];
      existing.push(rawName);
      duplicateDetails[normalizedKey] = existing;
      return normalizedKey;
    }

    seen.set(normalizedKey, rawName);
    values[normalizedKey] = value.trim();
    return normalizedKey;
  }

  if (firstLineRemainder) {
    const inlineMatch = firstLineRemainder.match(/^([A-Za-z0-9 _-]+?)\s*[:=]\s*(.*)$/);
    if (inlineMatch) {
      currentKey = recordField(inlineMatch[1], inlineMatch[2]);
    } else {
      malformedLines.push(firstLineRemainder);
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ");
    const trimmed = line.trim();

    if (!trimmed) continue;

    if (/^\/[a-z][a-z0-9-]*(?:\s|$)/i.test(trimmed)) {
      repeatedCommandHeaders.push(trimmed.split(/\s+/)[0].toLowerCase());
      currentKey = null;
      continue;
    }

    const fieldMatch = line.match(/^\s*([A-Za-z0-9 _-]+?)\s*[:=]\s*(.*)$/);
    if (fieldMatch) {
      currentKey = recordField(fieldMatch[1], fieldMatch[2]);
      continue;
    }

    const looksLikeContinuation =
      line.startsWith("  ") || trimmed.startsWith("- ");

    if (looksLikeContinuation) {
      if (currentKey && Object.hasOwn(values, currentKey)) {
        const previous = values[currentKey];
        values[currentKey] = previous ? `${previous}\n${trimmed}` : trimmed;
      } else {
        malformedLines.push(trimmed);
      }
      continue;
    }

    malformedLines.push(trimmed);
    currentKey = null;
  }

  return {
    values,
    duplicates: [...duplicates].sort(),
    duplicateDetails,
    malformedLines,
    repeatedCommandHeaders,
  };
}

export function parseInputs(input, command) {
  return parseInputsDetailed(input, command).values;
}

export function validateRequest(input) {
  const command = detectCommand(input);

  if (!command) {
    return {
      ok: false,
      command: null,
      inputs: {},
      missing: [],
      unknown: [],
      duplicates: [],
      duplicateDetails: {},
      malformedLines: [],
      repeatedCommandHeaders: [],
      allowed: [],
      error: `Unknown or missing Grok command. Expected one of: ${Object.keys(COMMANDS).join(", ")}`,
    };
  }

  const definition = COMMANDS[command];
  const parsed = parseInputsDetailed(input, command);
  const inputs = parsed.values;

  const missing = definition.required.filter((field) => {
    const value = inputs[field];
    return typeof value !== "string" || value.trim().length === 0;
  });

  const unknown = Object.keys(inputs)
    .filter((field) => !definition.allowed.includes(field))
    .sort();

  const duplicates = parsed.duplicates;
  const malformedLines = parsed.malformedLines;
  const repeatedCommandHeaders = parsed.repeatedCommandHeaders;

  const errors = [];

  if (missing.length > 0) {
    errors.push(
      `Missing required input${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`,
    );
  }

  if (unknown.length > 0) {
    errors.push(
      `Unknown input field${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}`,
    );
  }

  if (duplicates.length > 0) {
    errors.push(
      `Duplicate input field${duplicates.length === 1 ? "" : "s"}: ${duplicates.join(", ")}`,
    );
  }

  if (repeatedCommandHeaders.length > 0) {
    errors.push(
      `Repeated command header${repeatedCommandHeaders.length === 1 ? "" : "s"}: ${repeatedCommandHeaders.join(", ")}`,
    );
  }

  if (malformedLines.length > 0) {
    errors.push(
      `Malformed input line${malformedLines.length === 1 ? "" : "s"}: ${malformedLines.join(" | ")}`,
    );
  }

  return {
    ok:
      missing.length === 0 &&
      unknown.length === 0 &&
      duplicates.length === 0 &&
      repeatedCommandHeaders.length === 0 &&
      malformedLines.length === 0,
    command,
    inputs,
    missing,
    unknown,
    duplicates,
    duplicateDetails: parsed.duplicateDetails,
    malformedLines,
    repeatedCommandHeaders,
    allowed: definition.allowed,
    prompt: definition.prompt,
    contracts: definition.contracts ?? (definition.contract ? [definition.contract] : []),
    contract: definition.contract ?? definition.contracts?.[0] ?? null,
    error: errors.length > 0 ? errors.join(". ") : null,
  };
}

export function loadCommandPrompt(relativePromptPath) {
  const absolutePath = path.resolve(repoRoot, relativePromptPath);
  const allowedRoot = path.resolve(repoRoot, ".grok", "commands") + path.sep;

  if (!absolutePath.startsWith(allowedRoot)) {
    throw new Error(`Refusing to load prompt outside .grok/commands: ${relativePromptPath}`);
  }

  return fs.readFileSync(absolutePath, "utf8");
}

export function loadCommandContract(relativeContractPath) {
  if (!relativeContractPath) return null;

  const absolutePath = path.resolve(repoRoot, relativeContractPath);
  const allowedRoot = path.resolve(repoRoot, ".grok", "contracts") + path.sep;

  if (!absolutePath.startsWith(allowedRoot)) {
    throw new Error(
      `Refusing to load contract outside .grok/contracts: ${relativeContractPath}`,
    );
  }

  const raw = fs.readFileSync(absolutePath, "utf8");
  return JSON.parse(raw);
}

export function loadCommandContracts(relativeContractPaths = []) {
  return relativeContractPaths.map((contractPath) => ({
    path: contractPath,
    content: loadCommandContract(contractPath),
  }));
}

export function routeRequest(input) {
  const validation = validateRequest(input);

  if (!validation.ok) {
    return {
      ...validation,
      promptContent: null,
      contractContents: [],
      contractContent: null,
    };
  }

  const contractContents = loadCommandContracts(validation.contracts);

  return {
    ...validation,
    promptContent: loadCommandPrompt(validation.prompt),
    contractContents,
    contractContent: contractContents[0]?.content ?? null,
  };
}

function getArgValue(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

function readStdin() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function getInput(args) {
  const text = getArgValue(args, "--text");
  if (text !== null) return text;

  const file = getArgValue(args, "--file");
  if (file !== null) {
    return fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
  }

  return readStdin();
}

function printHelp() {
  const commandHelp = Object.entries(COMMANDS)
    .map(([command, definition]) => {
      const required = definition.required.join(", ");
      const allowed = definition.allowed.join(", ");
      return `  ${command}\n    required: ${required}\n    allowed:  ${allowed}`;
    })
    .join("\n");

  process.stdout.write(
    `Grok command router\n\nUsage:\n  printf '/build-page\\nroute: /services\\ngoal: Generate leads' | npm run grok:route\n  node scripts/grok-command-router.mjs --file request.txt\n  node scripts/grok-command-router.mjs --text $'/audit\\nscope: site'\n  node scripts/grok-command-router.mjs --json --file request.txt\n\nSupported commands and fields:\n${commandHelp}\n`,
  );
}

function renderHuman(result, rawInput) {
  if (!result.ok) {
    const lines = [
      "GROK COMMAND ROUTER: BLOCKED",
      result.command ? `Command: ${result.command}` : "Command: not detected",
      `Reason: ${result.error}`,
    ];

    if (result.missing.length > 0) {
      lines.push("", "Required before any repo edit:");
      for (const field of result.missing) lines.push(`- ${field}: <value>`);
    }

    if (result.unknown.length > 0) {
      lines.push("", "Unknown fields:");
      for (const field of result.unknown) lines.push(`- ${field}`);
    }

    if (result.duplicates.length > 0) {
      lines.push("", "Conflicting duplicate fields:");
      for (const field of result.duplicates) {
        const rawNames = result.duplicateDetails[field] ?? [];
        const rawSuffix = rawNames.length > 1 ? ` (${rawNames.join(" ↔ ")})` : "";
        lines.push(`- ${field}${rawSuffix}`);
      }
    }

    if (result.repeatedCommandHeaders.length > 0) {
      lines.push("", "Repeated command headers:");
      for (const header of result.repeatedCommandHeaders) lines.push(`- ${header}`);
    }

    if (result.malformedLines.length > 0) {
      lines.push("", "Malformed input lines:");
      for (const line of result.malformedLines) lines.push(`- ${line}`);
    }

    if (result.command && result.allowed.length > 0) {
      lines.push("", `Allowed fields for ${result.command}:`);
      for (const field of result.allowed) {
        const requiredMarker = COMMANDS[result.command].required.includes(field)
          ? " (required)"
          : "";
        lines.push(`- ${field}${requiredMarker}`);
      }
    }

    lines.push("", "No repository files should be edited until this gate passes.");
    return `${lines.join("\n")}\n`;
  }

  return `GROK COMMAND ROUTER: PASS\nCommand: ${result.command}\nPrompt: ${result.prompt}\nContracts: ${result.contracts.length > 0 ? result.contracts.join(", ") : "none"}\nRequired inputs: validated\nUnknown inputs: none\nDuplicate inputs: none\nMalformed inputs: none\nAllowed-field validation: passed\n\n--- PARSED INPUTS ---\n${JSON.stringify(result.inputs, null, 2)}\n\n--- LOADED COMMAND PROMPT ---\n${result.promptContent.trim()}\n\n--- LOADED CONTRACTS ---\n${result.contractContents.length > 0 ? result.contractContents.map(({ path, content }) => `# ${path}\n${JSON.stringify(content, null, 2)}`).join("\n\n") : "none"}\n\n--- ORIGINAL REQUEST ---\n${rawInput.trim()}\n\n--- ROUTER DIRECTIVE ---\nThe command gate passed. Follow the loaded command prompt and AGENTS.md. Do not edit outside the command's stated scope.\n`;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const input = getInput(args).trim();
  if (!input) {
    printHelp();
    process.exitCode = 64;
    return;
  }

  let result;
  try {
    result = routeRequest(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`GROK COMMAND ROUTER: ERROR\n${message}\n`);
    process.exitCode = 70;
    return;
  }

  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(renderHuman(result, input));
  }

  if (!result.ok) process.exitCode = 2;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isCli) {
  await main();
}
