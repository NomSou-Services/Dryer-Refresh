# Component States Contract

Every interactive component must define the states that matter to its behavior.

## Interactive controls

At minimum consider:

- default
- hover
- focus-visible
- active/pressed
- disabled
- selected/current when applicable

Hover must never be the only way to reveal essential information or actions.

## Form controls

At minimum consider:

- empty/default
- focused
- filled
- invalid
- disabled
- read-only when applicable
- success/confirmed when the workflow benefits from it

Errors must be tied to the relevant control and remain understandable without color alone.

## Async UI

Where data or submission is asynchronous, consider:

- idle
- loading
- success
- empty
- error

Do not leave users without feedback after initiating an action.

## Rules

1. State changes must preserve layout stability where practical.
2. Focus-visible states must be visually obvious.
3. Disabled styling must not be used as a substitute for explaining unavailable actions.
4. Loading states must prevent duplicate destructive/submission actions.
5. State labels and icons must remain understandable with assistive technology.
