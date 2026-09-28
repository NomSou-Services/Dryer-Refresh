# UI Audit Contract

`/ui-audit` evaluates visual-system consistency, component quality, hierarchy, and responsive interface behavior.

## Severity model

- `critical` — interface is unusable or visually broken in a core workflow.
- `high` — major hierarchy, contrast, responsive, state, or system-consistency problem.
- `medium` — meaningful inconsistency or visual defect affecting comprehension or polish.
- `low` — minor visual inconsistency with limited impact.
- `info` — optional refinement or design-system opportunity.

## Structured checks

### Design tokens
- Are colors, spacing, radii, shadows, motion, and breakpoints tokenized?
- Are arbitrary values avoided?
- Are semantic tokens used appropriately?

### Typography
- Is heading hierarchy consistent?
- Are text sizes, weights, line heights, and measures readable?
- Are display styles reused consistently?

### Spacing and density
- Is section rhythm consistent?
- Are related items grouped more tightly than unrelated items?
- Are arbitrary gaps avoided?

### Alignment and grid
- Do sections align to shared containers and columns?
- Are edges, baselines, and repeated structures visually coherent?

### Color and contrast
- Is color usage semantically consistent?
- Does contrast support readability and state recognition?
- Does the composition approximately follow the 60/30/10 role hierarchy from `design/COLOR_BALANCE.md`?
- Is the dominant/base color visually stable across most of the page?
- Do secondary surfaces support rather than compete with the dominant canvas?
- Is accent color intentionally scarce enough that primary CTAs and focal states stand out?
- Are semantic status colors and accessibility needs preserved even when they fall outside the decorative 60/30/10 balance?
- Is accent color overused?

### Component consistency
- Do repeated controls look and behave the same?
- Are variants intentional?
- Are one-off components avoided when reusable variants exist?

### Component states
- Are default, hover, focus, active, disabled, loading, invalid, and selected states complete where applicable?

### Responsive UI
- Does layout adapt without visual collapse?
- Are images cropped intentionally?
- Do grids/cards reflow cleanly?

### Imagery
- Are aspect ratios, treatment, quality, and subject matter consistent?
- Are decorative visuals subordinate to content?

### Motion
- Does animation follow shared timing/easing?
- Is motion purposeful and reduced-motion safe?

### Visual hierarchy
- Is there a clear primary element?
- Are CTAs ranked appropriately?
- Is supporting content visually subordinate?

## Output

Default output is structured JSON conforming to:

```text
.grok/contracts/ui-audit-output.schema.json
```

Do not invent screenshot, browser, or visual-regression results that were not actually observed.
