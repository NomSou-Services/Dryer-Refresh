# Design Token Contract

`design/tokens.json` is the canonical source of visual primitives for this repository.

The machine-readable contract is:

```text
.grok/contracts/design-tokens.schema.json
```

Do not invent one-off visual values inside components when an existing token can express the design.


## 60/30/10 color balance

Use `design/COLOR_BALANCE.md` and `.grok/contracts/color-balance.schema.json` whenever choosing or applying the palette.

Default composition target:

- **60% dominant/base** — backgrounds, large surfaces, quiet neutral canvas.
- **30% secondary/supporting** — alternate sections, panels, cards, brand-supporting surfaces.
- **10% accent/emphasis** — primary CTAs, selected states, highlights, and small focal details.

This is a visual hierarchy guideline, not pixel-exact math. Accessibility, semantic status colors, approved references, and functional requirements take precedence. Accent should remain scarce enough that primary actions retain visual priority.

## Required groups

Every valid token file must contain all of these top-level groups:

```text
version
colors
typography
spacing
radii
shadows
motion
breakpoints
```

## Colors

Required semantic colors:

```text
background
surface
foreground
muted
mutedForeground
border
brand
brandForeground
dominant
dominantForeground
secondary
secondaryForeground
accent
accentForeground
destructive
focus
```

The explicit role tokens make the 60/30/10 hierarchy usable in components without guessing:

- `dominant` / `dominantForeground` — the 60% foundational canvas.
- `secondary` / `secondaryForeground` — the 30% supporting surfaces.
- `accent` / `accentForeground` — the 10% emphasis and primary-action layer.
- `brand` / `brandForeground` — a supporting structural brand surface, commonly used for footers, CTA panels, or other substantial secondary regions.


Prefer semantic names over raw palette names in components. A component should depend on `brand` or `border`, not `blue500` or `gray200`, unless a broader palette is deliberately added to the contract.

## Typography

Typography contains:

```text
fontFamily
fontSize
fontWeight
lineHeight
letterSpacing
```

Text styles should be composed from tokens. Do not create arbitrary font sizes or weights in isolated sections without a documented design-system reason.

## Spacing

Spacing values form the shared layout rhythm.

Use existing spacing tokens for:

- section padding
- component gaps
- card padding
- stack spacing
- inline spacing

Avoid arbitrary spacing values unless the approved design cannot be represented by the scale.

## Radii

Use the radius scale consistently across:

- buttons
- cards
- form fields
- image frames
- dialogs
- visual containers

Do not give each component its own unrelated radius.

## Shadows

Shadows should communicate elevation, not decoration.

Use the smallest existing shadow that establishes the needed hierarchy.

## Motion

Motion contains:

```text
duration
easing
```

Rules:

- motion must be purposeful;
- default to transform and opacity;
- respect `prefers-reduced-motion`;
- avoid long decorative animation on core interactions;
- do not invent per-component timing values when a motion token exists.

## Responsive breakpoints

Required breakpoints:

```text
xs
sm
md
lg
xl
2xl
```

They must be pixel values and must increase strictly from `xs` through `2xl`.

The breakpoints define shared responsive checkpoints. Components should remain fluid between them and should not be designed only for the exact breakpoint widths.

## Change rules

When changing the token system:

1. Update `design/tokens.json`.
2. Run `npm run tokens:check`.
3. Update `src/styles/tokens.css` if generated token values changed.
4. Audit affected components.
5. Do not silently rename or remove a token that existing components depend on.
6. Treat semantic token changes as visual API changes.

## Grok behavior

Before building or significantly restyling a page/section, Grok must:

1. read this document;
2. read `design/tokens.json`;
3. prefer existing tokens;
4. explain any proposed new token;
5. avoid arbitrary values unless the request explicitly requires them.


## Hardcoded value enforcement

Run:

```bash
npm run tokens:usage
```

The usage check scans application source and blocks raw visual literals outside the canonical token source.

It flags:

- raw hex/rgb/hsl/oklch color literals;
- raw CSS margin, padding, and gap values;
- arbitrary Tailwind spacing values such as `p-[23px]`;
- raw CSS and arbitrary Tailwind radii;
- raw CSS and arbitrary Tailwind shadows;
- raw CSS animation/transition durations and arbitrary Tailwind durations/delays;
- raw media-query widths and arbitrary Tailwind responsive breakpoints.

`src/styles/tokens.css` is exempt because it is the generated CSS token source.

Named Tailwind utilities such as `px-5`, `rounded-xl`, `shadow-md`, `duration-200`, `sm:`, and `lg:` are allowed. The scanner is intended to catch arbitrary visual literals rather than prohibit the framework's named utility system.


## Autofix suggestions

The token-usage scanner does not rewrite source automatically. Instead, every violation includes a safe recommendation for the closest existing token or named Tailwind utility.

Examples:

```text
padding: 18px
→ closest token: spacing.4 / spacing.5
→ use var(--space-4) or the corresponding named utility
```

```text
duration-[210ms]
→ closest token: motion.duration.normal (200ms)
→ use duration-200
```

```text
@media (min-width: 1000px)
→ closest breakpoint: lg (1024px)
→ prefer the `lg:` responsive utility
```

This keeps fixes reviewable and avoids destructive automated rewrites.
