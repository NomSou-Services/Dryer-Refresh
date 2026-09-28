import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { checkColorBalanceUi } from "./check-color-balance-ui.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function copyFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "color-balance-ui-"));
  for (const relativePath of [
    "design/tokens.json",
    "src/styles/tokens.css",
    "src/app/globals.css",
    "src/components/sections/hero.tsx",
    "src/components/sections/feature-grid.tsx",
    "src/components/sections/cta.tsx",
    "src/components/ui/button-link.tsx",
    "src/components/layout/site-footer.tsx",
  ]) {
    const source = path.join(repoRoot, relativePath);
    const destination = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  return root;
}

test("current starter wires 60/30/10 roles into shared UI", () => {
  assert.deepEqual(checkColorBalanceUi(repoRoot), []);
});

test("missing accent role token blocks the UI check", () => {
  const root = copyFixture();

  try {
    const tokenPath = path.join(root, "design/tokens.json");
    const tokens = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
    delete tokens.colors.accentForeground;
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));

    assert.match(
      checkColorBalanceUi(root).join("\n"),
      /colors\.accentForeground/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("missing Tailwind role mapping blocks the UI check", () => {
  const root = copyFixture();

  try {
    const cssPath = path.join(root, "src/app/globals.css");
    const css = fs
      .readFileSync(cssPath, "utf8")
      .replace("--color-secondary:", "--color-secondary-missing:");
    fs.writeFileSync(cssPath, css);

    assert.match(
      checkColorBalanceUi(root).join("\n"),
      /--color-secondary/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("hero must visibly use the dominant role", () => {
  const root = copyFixture();

  try {
    const heroPath = path.join(root, "src/components/sections/hero.tsx");
    const hero = fs
      .readFileSync(heroPath, "utf8")
      .replace("bg-dominant", "bg-surface");
    fs.writeFileSync(heroPath, hero);

    assert.match(
      checkColorBalanceUi(root).join("\n"),
      /hero\.tsx must use bg-dominant/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("primary button must retain the accent role", () => {
  const root = copyFixture();

  try {
    const buttonPath = path.join(root, "src/components/ui/button-link.tsx");
    const button = fs
      .readFileSync(buttonPath, "utf8")
      .replace("bg-accent", "bg-brand");
    fs.writeFileSync(buttonPath, button);

    assert.match(
      checkColorBalanceUi(root).join("\n"),
      /button-link\.tsx must use bg-accent/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
