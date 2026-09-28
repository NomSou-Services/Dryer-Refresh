# Interaction Patterns Contract

Use predictable interaction patterns so users do not need to relearn controls on each page.

## Navigation

- Use links for navigation and buttons for actions.
- Mobile navigation must expose a clear menu trigger and return focus when closed.
- Current location should be identifiable when useful.

## Buttons and actions

- One visually dominant primary action per decision area.
- Destructive actions require appropriate confirmation.
- Loading actions must communicate progress and block accidental duplicates.

## Dialogs and overlays

- Use dialogs only when interruption is justified.
- Move focus into the dialog and contain it while open.
- Escape/close behavior must be predictable.
- Return focus to the invoking control after close.

## Feedback

- Success, warning, and error feedback should be placed near the relevant action.
- Toasts must not be the only location for critical or persistent information.
- Do not make essential behavior dependent on hover.

## Rules

Interactions must work with pointer, keyboard, and touch where applicable, remain understandable without animation, and respect reduced-motion preferences.
