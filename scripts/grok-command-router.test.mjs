import assert from "node:assert/strict";
import test from "node:test";

import {
  COMMANDS,
  detectCommand,
  loadCommandContract,
  loadCommandContracts,
  parseInputs,
  parseInputsDetailed,
  routeRequest,
  validateRequest,
} from "./grok-command-router.mjs";

test("detects each supported command", () => {
  for (const command of [
    "/new-client",
    "/build-page",
    "/build-section",
    "/audit",
    "/fix",
    "/refactor",
    "/ship",
  ]) {
    assert.equal(detectCommand(`${command}\nfoo: bar`), command);
  }
});

test("rejects an unknown command", () => {
  const result = validateRequest("/deploy\nenvironment: production");
  assert.equal(result.ok, false);
  assert.equal(result.command, null);
});

test("blocks build-page when a required input is missing", () => {
  const result = validateRequest("/build-page\nroute: /services");
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ["goal"]);
});

test("passes build-page with required fields and loads its prompt", () => {
  const result = routeRequest(
    "/build-page\nroute: /services\ngoal: Generate quote requests",
  );
  assert.equal(result.ok, true);
  assert.equal(result.command, "/build-page");
  assert.match(result.promptContent, /# `\/build-page`/);
});

test("parses key=value and normalizes keys", () => {
  const input = "/new-client\nClient Name=Acme Roofing\nIndustry: Roofing\nPrimary Goal: Leads";
  const values = parseInputs(input, "/new-client");
  assert.equal(values.client_name, "Acme Roofing");
  assert.equal(values.primary_goal, "Leads");
});

test("keeps list-style continuation lines", () => {
  const input = "/build-page\nroute: /services\ngoal: Leads\nsections:\n- hero\n- faq\nnotes: Keep it concise";
  const values = parseInputs(input, "/build-page");
  assert.equal(values.sections, "- hero\n- faq");
  assert.equal(values.notes, "Keep it concise");
});

test("validates all command-specific required inputs", () => {
  const valid = [
    "/new-client\nclient_name: Acme\nindustry: Roofing\nprimary_goal: Leads",
    "/build-page\nroute: /about\ngoal: Build trust",
    "/build-section\nsection: hero\npurpose: Explain the offer",
    "/audit\nscope: site",
    "/fix\nproblem: Menu does not open",
    "/refactor\ntarget: src/components\ngoal: Remove duplication",
    "/ship\nrelease_scope: full site",
  ];

  for (const request of valid) {
    assert.equal(validateRequest(request).ok, true, request);
  }
});


test("blocks an unknown field and reports the allowlist", () => {
  const result = validateRequest(
    "/build-page\nroute: /services\ngoal: Leads\ncolour_scheme: dark",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.unknown, ["colour_scheme"]);
  assert.deepEqual(result.allowed, COMMANDS["/build-page"].allowed);
  assert.match(result.error, /Unknown input field: colour_scheme/);
});

test("blocks multiple unknown fields in sorted order", () => {
  const result = validateRequest(
    "/fix\nproblem: Menu broken\nzebra: one\nbanana: two",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.unknown, ["banana", "zebra"]);
});

test("reports missing required and unknown fields together", () => {
  const result = validateRequest(
    "/build-section\nsection: hero\npurpsoe: Explain offer",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ["purpose"]);
  assert.deepEqual(result.unknown, ["purpsoe"]);
});

test("normalized allowed fields still pass strict validation", () => {
  const result = validateRequest(
    "/new-client\nClient Name: Acme\nIndustry: Roofing\nPrimary Goal: Leads\nBrand Direction: Minimal",
  );

  assert.equal(result.ok, true);
  assert.equal(result.inputs.brand_direction, "Minimal");
});

test("ship accepts release_name and version as allowed alternatives", () => {
  assert.equal(
    validateRequest("/ship\nrelease_scope: site\nrelease_name: v1.0").ok,
    true,
  );
  assert.equal(
    validateRequest("/ship\nrelease_scope: site\nversion: 1.0.0").ok,
    true,
  );
});


test("blocks repeated identical input keys", () => {
  const result = validateRequest(
    "/build-page\nroute: /services\ngoal: Leads\ngoal: More leads",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.duplicates, ["goal"]);
  assert.match(result.error, /Duplicate input field: goal/);
});

test("duplicate detection is normalization-aware", () => {
  const result = validateRequest(
    "/new-client\nClient Name: Acme Roofing\nclient_name: Acme 2\nIndustry: Roofing\nPrimary Goal: Leads",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.duplicates, ["client_name"]);
  assert.deepEqual(result.duplicateDetails.client_name, ["Client Name", "client_name"]);
});

test("blocks more than two occurrences of the same field", () => {
  const result = validateRequest(
    "/audit\nscope: site\nScope: homepage\nscope: /services",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.duplicates, ["scope"]);
  assert.deepEqual(result.duplicateDetails.scope, ["scope", "Scope", "scope"]);
});

test("reports duplicate and unknown fields together", () => {
  const result = validateRequest(
    "/fix\nproblem: Menu broken\nProblem: Still broken\nmystery: value",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.duplicates, ["problem"]);
  assert.deepEqual(result.unknown, ["mystery"]);
});

test("continuation lines do not count as duplicate fields", () => {
  const parsed = parseInputsDetailed(
    "/build-page\nroute: /services\ngoal: Leads\nsections:\n- hero\n- faq",
    "/build-page",
  );

  assert.deepEqual(parsed.duplicates, []);
  assert.equal(parsed.values.sections, "- hero\n- faq");
});


test("duplicate guard blocks normalized aliases of the same field", () => {
  const result = validateRequest(
    "/new-client\nClient Name: Acme Roofing\nclient-name: Acme Roof Co\nIndustry: Roofing\nPrimary Goal: Leads",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.duplicates, ["client_name"]);
  assert.deepEqual(
    result.duplicateDetails.client_name,
    ["Client Name", "client-name"],
  );
  assert.match(result.error, /Duplicate input field: client_name/);
});

test("duplicate guard blocks a three-way duplicate and reports every occurrence", () => {
  const result = validateRequest(
    "/audit\nscope: site\nScope: homepage\nscope: /services",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.duplicates, ["scope"]);
  assert.deepEqual(
    result.duplicateDetails.scope,
    ["scope", "Scope", "scope"],
  );
  assert.match(result.error, /Duplicate input field: scope/);
});

test("duplicate guard reports duplicate and unknown-field errors together", () => {
  const result = validateRequest(
    "/fix\nproblem: Menu broken\nProblem: Still broken\nmystery_field: value",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.duplicates, ["problem"]);
  assert.deepEqual(result.unknown, ["mystery_field"]);
  assert.match(result.error, /Duplicate input field: problem/);
  assert.match(result.error, /Unknown input field: mystery_field/);
});


test("malformed input: blocks a field missing a colon or equals sign", () => {
  const result = validateRequest(
    "/build-page\nroute /services\ngoal: Generate leads",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ["route"]);
  assert.deepEqual(result.malformedLines, ["route /services"]);
  assert.match(result.error, /Malformed input line: route \/services/);
});

test("malformed input: empty required values count as missing", () => {
  const result = validateRequest(
    "/build-page\nroute:\ngoal: Generate leads",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ["route"]);
  assert.equal(result.inputs.route, "");
});

test("malformed input: blocks a repeated command header", () => {
  const result = validateRequest(
    "/audit\nscope: site\n/audit\nmode: report",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.repeatedCommandHeaders, ["/audit"]);
  assert.match(result.error, /Repeated command header: \/audit/);
});

test("malformed input: blocks a different repeated slash-command header too", () => {
  const result = validateRequest(
    "/fix\nproblem: Menu broken\n/build-page\nroute: /services",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.repeatedCommandHeaders, ["/build-page"]);
});

test("malformed input: blocks an invalid continuation line before any field", () => {
  const result = validateRequest(
    "/audit\n- unexpected list item\nscope: site",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.malformedLines, ["- unexpected list item"]);
});

test("malformed input: blocks an indented continuation after a repeated command header", () => {
  const result = validateRequest(
    "/audit\nscope: site\n/audit\n  stray continuation",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.repeatedCommandHeaders, ["/audit"]);
  assert.deepEqual(result.malformedLines, ["stray continuation"]);
});


test("quoted input: preserves colons inside a quoted value", () => {
  const result = validateRequest(
    '/fix\nproblem: "API returned: 401 unauthorized"\nscope: header',
  );

  assert.equal(result.ok, true);
  assert.equal(result.inputs.problem, '"API returned: 401 unauthorized"');
  assert.deepEqual(result.malformedLines, []);
});

test("quoted input: preserves equals signs inside a quoted value", () => {
  const result = validateRequest(
    '/build-page\nroute: /search\ngoal: "Support query strings like q=roofing&sort=recent"',
  );

  assert.equal(result.ok, true);
  assert.equal(
    result.inputs.goal,
    '"Support query strings like q=roofing&sort=recent"',
  );
  assert.deepEqual(result.malformedLines, []);
});

test("quoted input: preserves leading spaces inside double quotes", () => {
  const result = validateRequest(
    '/audit\nscope: site\nnotes: "  preserve these leading spaces"',
  );

  assert.equal(result.ok, true);
  assert.equal(result.inputs.notes, '"  preserve these leading spaces"');
  assert.deepEqual(result.malformedLines, []);
});

test("quoted input: preserves multiple delimiters in the same quoted value", () => {
  const result = validateRequest(
    '/refactor\ntarget: src/lib\ngoal: "Keep token: abc=123 while parsing mode: strict"',
  );

  assert.equal(result.ok, true);
  assert.equal(
    result.inputs.goal,
    '"Keep token: abc=123 while parsing mode: strict"',
  );
  assert.deepEqual(result.malformedLines, []);
});

test("quoted input: preserves leading spaces inside single quotes", () => {
  const result = validateRequest(
    "/audit\nscope: site\nnotes: '  keep this indentation'",
  );

  assert.equal(result.ok, true);
  assert.equal(result.inputs.notes, "'  keep this indentation'");
  assert.deepEqual(result.malformedLines, []);
});


test("quoted input: preserves escaped double quotes inside a double-quoted value", () => {
  const request = String.raw`/fix
problem: "Button says \"Save\" but click fails"
scope: form`;

  const result = validateRequest(request);

  assert.equal(result.ok, true);
  assert.equal(
    result.inputs.problem,
    String.raw`"Button says \"Save\" but click fails"`,
  );
  assert.deepEqual(result.malformedLines, []);
});

test("quoted input: preserves escaped single quotes inside a single-quoted value", () => {
  const request = String.raw`/audit
scope: site
notes: 'Client\'s primary CTA is missing'`;

  const result = validateRequest(request);

  assert.equal(result.ok, true);
  assert.equal(
    result.inputs.notes,
    String.raw`'Client\'s primary CTA is missing'`,
  );
  assert.deepEqual(result.malformedLines, []);
});

test("quoted input: preserves backslashes in Windows-style paths", () => {
  const request = String.raw`/refactor
target: src/lib
goal: "Preserve C:\Projects\Acme\config.json exactly"`;

  const result = validateRequest(request);

  assert.equal(result.ok, true);
  assert.equal(
    result.inputs.goal,
    String.raw`"Preserve C:\Projects\Acme\config.json exactly"`,
  );
  assert.deepEqual(result.malformedLines, []);
});

test("quoted input: preserves escaped quotes and backslashes together", () => {
  const request = String.raw`/fix
problem: "Parser returned \"C:\temp\file.txt\" unexpectedly"`;

  const result = validateRequest(request);

  assert.equal(result.ok, true);
  assert.equal(
    result.inputs.problem,
    String.raw`"Parser returned \"C:\temp\file.txt\" unexpectedly"`,
  );
  assert.deepEqual(result.malformedLines, []);
});

test("quoted input: accepts mixed single- and double-quoted fields in one request", () => {
  const request = String.raw`/build-page
route: '/services?tab=roofing'
goal: "Explain the client's \"premium\" service tier"
design_direction: 'Minimal, don\'t over-animate'`;

  const result = validateRequest(request);

  assert.equal(result.ok, true);
  assert.equal(result.inputs.route, String.raw`'/services?tab=roofing'`);
  assert.equal(
    result.inputs.goal,
    String.raw`"Explain the client's \"premium\" service tier"`,
  );
  assert.equal(
    result.inputs.design_direction,
    String.raw`'Minimal, don\'t over-animate'`,
  );
  assert.deepEqual(result.malformedLines, []);
});

test("quoted input: does not treat escaped delimiter sequences as malformed fields", () => {
  const request = String.raw`/audit
scope: site
notes: "Example syntax: key\=value and label\: text"`;

  const result = validateRequest(request);

  assert.equal(result.ok, true);
  assert.equal(
    result.inputs.notes,
    String.raw`"Example syntax: key\=value and label\: text"`,
  );
  assert.deepEqual(result.malformedLines, []);
});


test("quoted input: preserves escaped newline sequences inside double quotes", () => {
  const request = String.raw`/fix
problem: "First line\nSecond line"
scope: parser`;

  const result = validateRequest(request);

  assert.equal(result.ok, true);
  assert.equal(
    result.inputs.problem,
    String.raw`"First line\nSecond line"`,
  );
  assert.deepEqual(result.malformedLines, []);
});

test("quoted input: preserves escaped tab sequences inside double quotes", () => {
  const request = String.raw`/audit
scope: site
notes: "Column A\tColumn B\tColumn C"`;

  const result = validateRequest(request);

  assert.equal(result.ok, true);
  assert.equal(
    result.inputs.notes,
    String.raw`"Column A\tColumn B\tColumn C"`,
  );
  assert.deepEqual(result.malformedLines, []);
});

test("quoted input: preserves escaped newline and tab sequences together", () => {
  const request = String.raw`/refactor
target: src/lib
goal: "Keep row one\n\tindent row two\nrow three"`;

  const result = validateRequest(request);

  assert.equal(result.ok, true);
  assert.equal(
    result.inputs.goal,
    String.raw`"Keep row one\n\tindent row two\nrow three"`,
  );
  assert.deepEqual(result.malformedLines, []);
});

test("quoted input: preserves escaped whitespace sequences inside single quotes", () => {
  const request = String.raw`/audit
scope: site
notes: 'first\nsecond\tvalue'`;

  const result = validateRequest(request);

  assert.equal(result.ok, true);
  assert.equal(
    result.inputs.notes,
    String.raw`'first\nsecond\tvalue'`,
  );
  assert.deepEqual(result.malformedLines, []);
});

test("quoted input: accepts mixed quoted fields containing escaped newline and tab sequences", () => {
  const request = String.raw`/build-page
route: '/services\tpremium'
goal: "Explain line one\nline two"
design_direction: 'Grid\tlayout\nminimal motion'`;

  const result = validateRequest(request);

  assert.equal(result.ok, true);
  assert.equal(
    result.inputs.route,
    String.raw`'/services\tpremium'`,
  );
  assert.equal(
    result.inputs.goal,
    String.raw`"Explain line one\nline two"`,
  );
  assert.equal(
    result.inputs.design_direction,
    String.raw`'Grid\tlayout\nminimal motion'`,
  );
  assert.deepEqual(result.malformedLines, []);
});

test("quoted input: escaped whitespace sequences do not become continuation lines", () => {
  const request = String.raw`/fix
problem: "Value contains \n and \t but stays on one parsed field"
expected: "No malformed continuation error"`;

  const result = validateRequest(request);

  assert.equal(result.ok, true);
  assert.equal(
    result.inputs.problem,
    String.raw`"Value contains \n and \t but stays on one parsed field"`,
  );
  assert.equal(
    result.inputs.expected,
    String.raw`"No malformed continuation error"`,
  );
  assert.deepEqual(result.malformedLines, []);
});


test("design tokens command is detected and validates required inputs", () => {
  const result = validateRequest(
    "/design-tokens\nmode: update\nsource: Figma design system",
  );

  assert.equal(result.ok, true);
  assert.equal(result.command, "/design-tokens");
  assert.equal(
    result.contract,
    ".grok/contracts/design-tokens.schema.json",
  );
});

test("design tokens command blocks when source is missing", () => {
  const result = validateRequest(
    "/design-tokens\nmode: update",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ["source"]);
});

test("design tokens command blocks unknown token-category fields", () => {
  const result = validateRequest(
    "/design-tokens\nmode: update\nsource: Figma\nblur_tokens: heavy",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.unknown, ["blur_tokens"]);
});

test("router loads the design token contract for design-token work", () => {
  const result = routeRequest(
    "/design-tokens\nmode: audit\nsource: design/tokens.json",
  );

  assert.equal(result.ok, true);
  assert.equal(result.contractContent.type, "object");
  assert.deepEqual(
    result.contractContent.required,
    [
      "version",
      "colors",
      "typography",
      "spacing",
      "radii",
      "shadows",
      "motion",
      "breakpoints",
    ],
  );
});

test("build-page receives the same design token contract", () => {
  const result = routeRequest(
    "/build-page\nroute: /services\ngoal: Generate leads",
  );

  assert.equal(result.ok, true);
  assert.equal(
    result.contract,
    ".grok/contracts/design-tokens.schema.json",
  );
  assert.equal(result.contractContent.title, "Grok Website Design Token Contract");
});

test("design token schema requires all visual primitive groups", () => {
  const contract = loadCommandContract(
    ".grok/contracts/design-tokens.schema.json",
  );

  assert.deepEqual(
    contract.required,
    [
      "version",
      "colors",
      "typography",
      "spacing",
      "radii",
      "shadows",
      "motion",
      "breakpoints",
    ],
  );
});


test("build-page loads all UX/UI design contracts", () => {
  const result = routeRequest(
    "/build-page\nroute: /services\ngoal: Generate leads",
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.contracts, [
    ".grok/contracts/design-tokens.schema.json",
    ".grok/contracts/color-balance.schema.json",
    ".grok/contracts/component-states.schema.json",
    ".grok/contracts/responsive-behavior.schema.json",
    ".grok/contracts/forms.schema.json",
    ".grok/contracts/interaction-patterns.schema.json",
    ".grok/contracts/accessibility.schema.json",
  ]);
  assert.equal(result.contractContents.length, 7);
});

test("audit loads all UX/UI design contracts", () => {
  const result = routeRequest(
    "/audit\nscope: /services\nareas: responsive, accessibility, forms",
  );

  assert.equal(result.ok, true);
  assert.equal(result.contractContents.length, 7);
  assert.deepEqual(
    result.contractContents.map(({ content }) => content.title),
    [
      "Grok Website Design Token Contract",
      "60/30/10 Color Balance Contract",
      "Component States Contract",
      "Responsive Behavior Contract",
      "Forms UX Contract",
      "Interaction Patterns Contract",
      "Accessibility Contract",
    ],
  );
});

test("component-state contract exposes interactive, form, and async states", () => {
  const contract = loadCommandContract(
    ".grok/contracts/component-states.schema.json",
  );

  assert.deepEqual(contract.properties.requiredStates.required, [
    "interactive",
    "formControls",
    "async",
  ]);
});

test("responsive contract requires principles and checks", () => {
  const contract = loadCommandContract(
    ".grok/contracts/responsive-behavior.schema.json",
  );

  assert.deepEqual(contract.required, ["version", "principles", "checks"]);
});

test("forms contract requires field, validation, and submission rules", () => {
  const contract = loadCommandContract(
    ".grok/contracts/forms.schema.json",
  );

  assert.deepEqual(contract.required, [
    "version",
    "fieldRules",
    "validationRules",
    "submissionRules",
  ]);
});

test("interaction contract defines core interaction pattern groups", () => {
  const contract = loadCommandContract(
    ".grok/contracts/interaction-patterns.schema.json",
  );

  assert.deepEqual(contract.properties.patterns.required, [
    "navigation",
    "buttons",
    "dialogs",
    "feedback",
  ]);
});

test("accessibility contract requires a baseline and checks", () => {
  const contract = loadCommandContract(
    ".grok/contracts/accessibility.schema.json",
  );

  assert.deepEqual(contract.required, ["version", "baseline", "checks"]);
});

test("multi-contract loader preserves contract order", () => {
  const loaded = loadCommandContracts([
    ".grok/contracts/forms.schema.json",
    ".grok/contracts/accessibility.schema.json",
  ]);

  assert.deepEqual(
    loaded.map(({ content }) => content.title),
    ["Forms UX Contract", "Accessibility Contract"],
  );
});


test("ux-audit validates required scope and goal", () => {
  const good = validateRequest(
    "/ux-audit\nscope: /contact\ngoal: Submit inquiry\noutput: json",
  );
  assert.equal(good.ok, true);

  const missingGoal = validateRequest(
    "/ux-audit\nscope: /contact",
  );
  assert.equal(missingGoal.ok, false);
  assert.deepEqual(missingGoal.missing, ["goal"]);
});

test("ui-audit validates required scope", () => {
  const result = validateRequest(
    "/ui-audit\nscope: /services\noutput: json",
  );

  assert.equal(result.ok, true);
  assert.equal(result.command, "/ui-audit");
});

test("ux-audit loads UX checks and output schema", () => {
  const result = routeRequest(
    "/ux-audit\nscope: /contact\ngoal: Submit inquiry",
  );

  assert.equal(result.ok, true);
  const titles = result.contractContents.map(({ content }) => content.title);
  assert.ok(titles.includes("UX Audit Checks Contract"));
  assert.ok(titles.includes("UX Audit Output"));
});

test("ui-audit loads UI checks and output schema", () => {
  const result = routeRequest(
    "/ui-audit\nscope: /services",
  );

  assert.equal(result.ok, true);
  const titles = result.contractContents.map(({ content }) => content.title);
  assert.ok(titles.includes("UI Audit Checks Contract"));
  assert.ok(titles.includes("UI Audit Output"));
});

test("ux and ui audit output schemas define severity enum", () => {
  const ux = loadCommandContract(
    ".grok/contracts/ux-audit-output.schema.json",
  );
  const ui = loadCommandContract(
    ".grok/contracts/ui-audit-output.schema.json",
  );

  assert.deepEqual(
    ux.properties.findings.items.properties.severity.enum,
    ["critical", "high", "medium", "low", "info"],
  );
  assert.deepEqual(
    ui.properties.findings.items.properties.severity.enum,
    ["critical", "high", "medium", "low", "info"],
  );
});

test("ux audit output requires UX-specific impact field", () => {
  const ux = loadCommandContract(
    ".grok/contracts/ux-audit-output.schema.json",
  );

  assert.ok(
    ux.properties.findings.items.required.includes("userImpact"),
  );
});

test("ui audit output requires UI-specific impact field", () => {
  const ui = loadCommandContract(
    ".grok/contracts/ui-audit-output.schema.json",
  );

  assert.ok(
    ui.properties.findings.items.required.includes("visualImpact"),
  );
});


test("ux-audit prompt references Markdown and JSON report templates", () => {
  const result = routeRequest(
    "/ux-audit\nscope: /contact\ngoal: Submit inquiry",
  );

  assert.match(result.promptContent, /ux-audit-report\.md/);
  assert.match(result.promptContent, /ux-audit-report\.json/);
});

test("ui-audit prompt references Markdown and JSON report templates", () => {
  const result = routeRequest(
    "/ui-audit\nscope: /services",
  );

  assert.match(result.promptContent, /ui-audit-report\.md/);
  assert.match(result.promptContent, /ui-audit-report\.json/);
});

test("audit output schemas require grouped findings and prioritized remediation", () => {
  const ux = loadCommandContract(
    ".grok/contracts/ux-audit-output.schema.json",
  );
  const ui = loadCommandContract(
    ".grok/contracts/ui-audit-output.schema.json",
  );

  for (const schema of [ux, ui]) {
    assert.ok(schema.required.includes("groupedFindings"));
    assert.ok(schema.required.includes("prioritizedRemediation"));
    assert.deepEqual(
      schema.properties.prioritizedRemediation.items.properties.priority.enum,
      ["P0", "P1", "P2", "P3"],
    );
  }
});


test("ux-audit prompt wires the report generator", () => {
  const result = routeRequest(
    "/ux-audit\nscope: /contact\ngoal: Submit inquiry",
  );

  assert.match(result.promptContent, /generate-audit-report\.mjs ux/);
  assert.match(result.promptContent, /ux-audit-findings\.example\.json/);
});

test("ui-audit prompt wires the report generator", () => {
  const result = routeRequest(
    "/ui-audit\nscope: /services",
  );

  assert.match(result.promptContent, /generate-audit-report\.mjs ui/);
  assert.match(result.promptContent, /ui-audit-findings\.example\.json/);
});


test("60/30/10 color-balance contract fixes the role targets at 60, 30, and 10", () => {
  const contract = loadCommandContract(
    ".grok/contracts/color-balance.schema.json",
  );

  assert.equal(contract.title, "60/30/10 Color Balance Contract");
  assert.equal(
    contract.properties.distribution.properties.dominant.properties.targetPercent.const,
    60,
  );
  assert.equal(
    contract.properties.distribution.properties.secondary.properties.targetPercent.const,
    30,
  );
  assert.equal(
    contract.properties.distribution.properties.accent.properties.targetPercent.const,
    10,
  );
});

test("design-tokens loads the 60/30/10 color-balance contract", () => {
  const result = routeRequest(
    "/design-tokens\nmode: audit\nsource: design/tokens.json",
  );

  const titles = result.contractContents.map(({ content }) => content.title);
  assert.deepEqual(titles.slice(0, 2), [
    "Grok Website Design Token Contract",
    "60/30/10 Color Balance Contract",
  ]);
});

test("ui-audit loads the 60/30/10 color-balance contract", () => {
  const result = routeRequest(
    "/ui-audit\nscope: /services",
  );

  const titles = result.contractContents.map(({ content }) => content.title);
  assert.ok(titles.includes("60/30/10 Color Balance Contract"));
});

test("build-section loads design tokens and 60/30/10 color balance together", () => {
  const result = routeRequest(
    "/build-section\nsection: hero\npurpose: Explain the offer",
  );

  assert.deepEqual(
    result.contractContents.map(({ content }) => content.title),
    [
      "Grok Website Design Token Contract",
      "60/30/10 Color Balance Contract",
    ],
  );
});

test("design-tokens accepts color_balance as an explicit input field", () => {
  const result = validateRequest(
    "/design-tokens\nmode: update\nsource: Figma\ncolor_balance: 60/30/10",
  );

  assert.equal(result.ok, true);
});
