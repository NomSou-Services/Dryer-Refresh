# UX Audit Contract

`/ux-audit` evaluates whether a user can understand, navigate, and complete the intended task.

## Severity model

- `critical` — blocks the primary task, traps users, causes destructive failure, or creates a severe accessibility barrier.
- `high` — seriously harms completion, comprehension, trust, or recovery for a primary workflow.
- `medium` — creates noticeable friction, confusion, cognitive load, or responsive usability problems.
- `low` — minor usability or clarity issue with limited task impact.
- `info` — observation or improvement opportunity, not a defect.

## Structured checks

### Task flow
- Is the primary task obvious?
- Is the shortest path to completion reasonable?
- Are unnecessary steps or detours present?
- Are dead ends avoided?

### Information architecture
- Are sections ordered around user questions and decisions?
- Are related concepts grouped?
- Can users predict where information lives?

### Navigation
- Are labels clear and specific?
- Is current location understandable?
- Does mobile navigation preserve important actions?

### Content clarity
- Is the page understandable without internal jargon?
- Are CTAs explicit about the result?
- Are instructions concise and actionable?

### Forms
- Are only necessary fields requested?
- Are required/optional states clear?
- Are errors recoverable and tied to the right fields?
- Is success explicit?

### Feedback and error recovery
- Does every meaningful action produce feedback?
- Can users recover from errors without losing work?
- Are loading, empty, success, and failure states understandable?

### Responsive UX
- Does task priority survive on smaller screens?
- Are controls easy to reach and use?
- Does reordering preserve meaning?

### Accessibility
- Can the task be completed with keyboard?
- Are focus, labels, errors, names, and reading order correct?
- Is interaction still understandable with reduced motion?

### Trust
- Are claims supported?
- Is contact/company information easy to verify?
- Are important terms or commitments clear?

### Cognitive load
- Is there one dominant action per decision area?
- Are users asked to process too much at once?
- Are complex tasks progressively disclosed?

## Output

Default output is structured JSON conforming to:

```text
.grok/contracts/ux-audit-output.schema.json
```

Do not fabricate browser, analytics, usability-test, or screen-reader results that were not actually observed.
