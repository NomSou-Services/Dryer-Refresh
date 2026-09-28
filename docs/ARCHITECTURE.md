# Architecture

## Goal

Keep client websites easy to understand, easy to edit, and difficult for an AI coding agent to accidentally turn into a pile of duplicated components.

## Boundaries

### `src/app`

Routing and route-level composition only.

A page should mainly compose sections and route-specific data. Avoid putting large reusable components directly in `page.tsx`.

### `src/components/ui`

Small primitives used across many places:

- buttons
- containers
- fields
- badges
- accordions
- dialogs

Do not put business-specific copy here.

### `src/components/layout`

Global or cross-page layout:

- header
- footer
- announcement bar
- breadcrumbs

### `src/components/sections`

Reusable page sections:

- hero
- features
- testimonials
- pricing
- FAQ
- CTA
- contact

Sections can accept business data through props.

### `src/config`

Project-wide configuration, URLs, navigation, contact details, feature flags.

### `src/data`

Human-editable page copy and structured content.

### `src/lib`

Small helpers and integrations. Keep this folder intentional; do not turn it into a dumping ground.

## Data flow

Prefer:

```text
src/data/home.ts
      ↓
src/app/page.tsx
      ↓
section props
      ↓
reusable section
```

Avoid hard-coding all business copy inside JSX.

## Server/client rule

Default to Server Components.

Use a Client Component only for actual interactivity such as:

- state
- effects
- event-driven browser behavior
- browser APIs

Keep the client boundary as low in the component tree as practical.

## Dependency rule

Before adding a package, Grok must answer:

1. What problem does it solve?
2. Can the platform or existing stack solve it?
3. Is the package maintained?
4. What does it add to bundle/runtime risk?
5. Is there a smaller alternative?
