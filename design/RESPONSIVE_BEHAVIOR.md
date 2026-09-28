# Responsive Behavior Contract

Responsive design must preserve task priority, not merely shrink desktop layouts.

## Principles

1. Content priority must remain clear at every width.
2. Layouts should be fluid between named breakpoints.
3. Mobile order must reflect reading and action priority.
4. Navigation must remain operable by touch and keyboard.
5. Important actions must not disappear on smaller screens.
6. Do not create horizontal scrolling for ordinary content.

## Required checks

Review at least:

- 320px
- 375px
- 430px
- 768px
- 1024px
- 1440px

Check:

- heading wrapping
- CTA visibility
- image cropping
- content order
- form usability
- touch target spacing
- navigation behavior
- tables/grids
- overflow
- sticky/fixed elements

Responsive changes should use the shared breakpoint system rather than arbitrary media-query widths.
