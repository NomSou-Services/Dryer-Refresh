import assert from "node:assert/strict";
import test from "node:test";

import { scanContent, scanPaths, suggestReplacement } from "./check-design-token-usage.mjs";

function rules(source, file = "src/example.tsx") {
  return scanContent(source, file).map((violation) => violation.rule);
}

test("current source tree has no token-usage violations", () => {
  assert.deepEqual(scanPaths(["src"]), []);
});

test("flags raw hex and rgb colors", () => {
  const source = `
    const a = "bg-[#123456]";
    const style = { color: "rgb(12 34 56)" };
  `;

  assert.ok(rules(source).filter((rule) => rule === "hardcoded-color").length >= 2);
});

test("allows CSS variable color references", () => {
  const source = `
    .card {
      background: var(--color-surface);
      color: var(--color-foreground);
    }
  `;

  assert.deepEqual(rules(source, "src/card.css"), []);
});

test("flags raw CSS spacing values", () => {
  const source = `
    .card {
      padding: 23px;
      gap: 1.7rem;
    }
  `;

  assert.ok(rules(source, "src/card.css").includes("hardcoded-spacing-css"));
});

test("allows spacing through CSS variables", () => {
  const source = `
    .card {
      padding: var(--space-6);
      gap: var(--space-4);
    }
  `;

  assert.deepEqual(rules(source, "src/card.css"), []);
});

test("flags arbitrary Tailwind spacing", () => {
  const source = `<div className="p-[23px] gap-[1.7rem]" />`;

  assert.ok(rules(source).includes("hardcoded-spacing-tailwind"));
});

test("allows named Tailwind spacing utilities", () => {
  const source = `<div className="px-5 py-3 gap-4 sm:gap-6" />`;

  assert.deepEqual(rules(source), []);
});

test("flags raw and arbitrary radii", () => {
  assert.ok(
    rules(".card { border-radius: 17px; }", "src/card.css").includes(
      "hardcoded-radius-css",
    ),
  );

  assert.ok(
    rules(`<div className="rounded-[17px]" />`).includes(
      "hardcoded-radius-tailwind",
    ),
  );
});

test("allows radius token and named Tailwind radius", () => {
  assert.deepEqual(
    rules(
      `.card { border-radius: var(--radius-md); }`,
      "src/card.css",
    ),
    [],
  );

  assert.deepEqual(rules(`<div className="rounded-xl" />`), []);
});

test("flags raw and arbitrary shadows", () => {
  assert.ok(
    rules(
      ".card { box-shadow: 0 8px 24px rgb(0 0 0 / 0.08); }",
      "src/card.css",
    ).includes("hardcoded-shadow-css"),
  );

  assert.ok(
    rules(`<div className="shadow-[0_8px_24px_rgb(0_0_0_/_0.08)]" />`).includes(
      "hardcoded-shadow-tailwind",
    ),
  );
});

test("allows shadow tokens and named Tailwind shadows", () => {
  assert.deepEqual(
    rules(".card { box-shadow: var(--shadow-md); }", "src/card.css"),
    [],
  );
  assert.deepEqual(rules(`<div className="shadow-md" />`), []);
});

test("flags raw motion durations and arbitrary Tailwind timing", () => {
  assert.ok(
    rules(
      ".button { transition-duration: 275ms; }",
      "src/button.css",
    ).includes("hardcoded-motion-css"),
  );

  assert.ok(
    rules(`<div className="duration-[275ms]" />`).includes(
      "hardcoded-motion-tailwind",
    ),
  );
});

test("allows motion tokens and named Tailwind motion utilities", () => {
  assert.deepEqual(
    rules(
      ".button { transition-duration: var(--motion-normal); }",
      "src/button.css",
    ),
    [],
  );
  assert.deepEqual(rules(`<div className="duration-200" />`), []);
});

test("flags raw media-query breakpoints and arbitrary Tailwind breakpoints", () => {
  assert.ok(
    rules(
      "@media (min-width: 913px) { .card { display: grid; } }",
      "src/card.css",
    ).includes("hardcoded-breakpoint-css"),
  );

  assert.ok(
    rules(`<div className="min-[913px]:grid" />`).includes(
      "hardcoded-breakpoint-tailwind",
    ),
  );
});

test("allows named Tailwind responsive breakpoints", () => {
  assert.deepEqual(
    rules(`<div className="sm:grid md:grid-cols-2 lg:grid-cols-3" />`),
    [],
  );
});

test("canonical tokens.css is exempt because it defines the tokens", () => {
  const source = `
    :root {
      --color-brand: #123456;
      --space-4: 1rem;
      --radius-md: 12px;
      --shadow-md: 0 8px 24px rgb(0 0 0 / 0.08);
      --motion-normal: 200ms;
      --breakpoint-md: 768px;
    }
  `;

  assert.deepEqual(scanContent(source, "src/styles/tokens.css"), []);
});


test("suggests closest semantic color token", () => {
  const [violation] = scanContent(
    `const card = "bg-[#181818]";`,
    "src/card.tsx",
  );

  assert.equal(violation.category, "colors");
  assert.match(violation.suggestion, /colors\.(foreground|brand)/);
});

test("suggests closest spacing token for CSS spacing", () => {
  const [violation] = scanContent(
    `.card { padding: 18px; }`,
    "src/card.css",
  );

  assert.equal(violation.category, "spacing");
  assert.match(violation.suggestion, /spacing\.(4|5)/);
  assert.match(violation.suggestion, /var\(--space-/);
});

test("suggests matching named Tailwind spacing utility", () => {
  const [violation] = scanContent(
    `<div className="p-[18px]" />`,
    "src/card.tsx",
  );

  assert.equal(violation.rule, "hardcoded-spacing-tailwind");
  assert.match(violation.suggestion, /use p-(4|5)/);
});

test("suggests closest radius token", () => {
  const [violation] = scanContent(
    `.card { border-radius: 13px; }`,
    "src/card.css",
  );

  assert.equal(violation.category, "radii");
  assert.match(violation.suggestion, /radii\.md/);
  assert.match(violation.suggestion, /var\(--radius-md\)/);
});

test("suggests named Tailwind radius utility", () => {
  const [violation] = scanContent(
    `<div className="rounded-[13px]" />`,
    "src/card.tsx",
  );

  assert.match(violation.suggestion, /rounded-md/);
});

test("suggests a design shadow token", () => {
  const [violation] = scanContent(
    `.card { box-shadow: 0 9px 25px rgb(0 0 0 / 0.08); }`,
    "src/card.css",
  );

  assert.equal(violation.category, "shadows");
  assert.match(violation.suggestion, /--shadow-md/);
});

test("suggests closest motion duration token", () => {
  const [violation] = scanContent(
    `.button { transition-duration: 210ms; }`,
    "src/button.css",
  );

  assert.equal(violation.category, "motion");
  assert.match(violation.suggestion, /motion\.duration\.normal/);
  assert.match(violation.suggestion, /--motion-normal/);
});

test("suggests named Tailwind duration utility", () => {
  const [violation] = scanContent(
    `<button className="duration-[210ms]" />`,
    "src/button.tsx",
  );

  assert.match(violation.suggestion, /duration-200/);
});

test("suggests closest responsive breakpoint", () => {
  const [violation] = scanContent(
    `@media (min-width: 1000px) { .grid { display: grid; } }`,
    "src/grid.css",
  );

  assert.equal(violation.category, "breakpoints");
  assert.match(violation.suggestion, /lg \(1024px\)/);
});

test("every violation includes a non-empty autofix suggestion", () => {
  const violations = scanContent(
    `
      const a = "bg-[#123456] p-[18px] rounded-[13px] shadow-[0_8px_24px_rgb(0_0_0_/_0.08)] duration-[210ms] min-[1000px]:grid";
    `,
    "src/example.tsx",
  );

  assert.ok(violations.length >= 6);
  for (const violation of violations) {
    assert.equal(typeof violation.suggestion, "string");
    assert.ok(violation.suggestion.length > 10);
  }
});
