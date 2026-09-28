# Forms UX Contract

Forms should minimize friction while collecting only information necessary for the task.

## Field rules

- Every control needs a persistent accessible label.
- Mark required and optional fields clearly.
- Use appropriate HTML input types and autocomplete attributes.
- Group related fields semantically.
- Preserve user-entered values after validation errors.
- Avoid requesting sensitive or unnecessary data.

## Validation

- Validate at a useful time; avoid aggressive erroring before the user can finish.
- Place the error near the field and associate it programmatically.
- Explain how to fix the problem.
- Do not rely on color alone.
- Move or announce focus appropriately for submission-level errors.

## Submission

- Provide a clear submit action.
- Prevent accidental duplicate submissions.
- Show loading/progress when submission is not immediate.
- Provide an explicit success confirmation.
- Provide a recoverable error state.
- Never claim success when the request actually failed.

Multi-step forms should expose progress and preserve previous answers.
