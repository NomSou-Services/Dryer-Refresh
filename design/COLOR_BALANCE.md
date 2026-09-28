# 60/30/10 Color Balance Rule

Use the 60/30/10 rule as the default color-composition framework for marketing pages and reusable sections.

## Target balance

- **60% — Dominant / base**
  - page background
  - large surfaces
  - whitespace-bearing neutral areas
  - primary canvas behind most content
- **30% — Secondary / supporting**
  - alternate section backgrounds
  - cards and panels
  - brand-supporting surfaces
  - navigation/footer regions when visually substantial
- **10% — Accent / emphasis**
  - primary CTAs
  - important links
  - selected/highlighted states
  - badges and small emphasis details
  - intentional focal moments

## Rules

1. Treat 60/30/10 as an approximate composition target, not pixel-exact arithmetic.
2. Preserve the role hierarchy even when the palette changes:
   - dominant = quiet foundation,
   - secondary = supporting contrast,
   - accent = scarce emphasis.
3. Do not let the accent color become a large background treatment by default.
4. Primary CTAs should normally use the accent/emphasis role unless the approved brand direction requires another accessible treatment.
5. Repeated decorative accent use must not compete with the primary action.
6. Semantic colors such as destructive, warning, success, and focus indicators are functional colors. Do not distort them merely to satisfy the decorative 10% target.
7. Accessibility overrides the ratio. Text/background contrast, focus visibility, status recognition, and readable states must remain compliant.
8. Images, gradients, and illustrations may visually influence the composition, but do not force literal percentage calculations over photographic content.
9. On dark themes, the actual color values may invert while the 60/30/10 role hierarchy remains the same.
10. Apply the rule at the page/viewport composition level and across major sections; do not force every small component to contain all three roles.
11. When an approved reference intentionally departs from 60/30/10, preserve the reference and document the exception rather than mechanically recoloring it.
12. Avoid adding extra decorative colors when the dominant, secondary, and accent roles already solve the hierarchy.

## Recommended token mapping

Use semantic tokens rather than hard-coded colors.

Starter mapping:

```text
60% dominant:
dominant
dominantForeground
background
surface

30% secondary:
secondary
secondaryForeground
brand
brandForeground
muted
border

10% accent:
accent
accentForeground
primary CTA emphasis
selected/highlighted states
small decorative emphasis
```

The starter homepage applies those roles directly:

- `Hero` → `bg-dominant`
- `FeatureGrid` → `bg-secondary`
- feature cards and header → `bg-surface`
- CTA panel and footer → `bg-brand`
- primary buttons, eyebrow labels, and small feature markers → `bg-accent` / `text-accent`


The exact mapping can change by client brand. The important requirement is to keep accent visually scarce and purposeful.

## UI audit interpretation

A UI audit should flag color-balance issues when:

- accent color dominates large portions of the interface without an approved reason;
- primary CTAs do not stand out because accent is used everywhere;
- the page lacks a stable dominant/base color;
- secondary surfaces compete with the dominant canvas;
- too many decorative colors weaken hierarchy;
- the 60/30/10 balance harms accessibility or semantic state clarity.

Do not report a finding solely because the page is not mathematically 60/30/10.
