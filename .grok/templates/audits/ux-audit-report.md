# UX Audit Report

**Scope:** `<scope>`  
**Goal:** `<goal>`  
**Mode:** `<report|fix>`  
**Minimum severity:** `<low>`  
**Date:** `<YYYY-MM-DD>`

## Executive Summary

**Status:** `<pass|pass_with_notes|blocked>`  
**Total findings:** `<count>`  
**Release blockers:** `<count>`

| Severity | Count |
| --- | ---: |
| Critical | `<count>` |
| High | `<count>` |
| Medium | `<count>` |
| Low | `<count>` |
| Info | `<count>` |

### Summary

<2–5 sentence summary of the largest usability risks, affected task(s), and overall audit result.>

## Findings by Area

### Task Flow

#### UX-001 — <Finding title>
- **Severity:** `<critical|high|medium|low|info>`
- **Evidence:** <What was actually observed>
- **User impact:** <How this affects completion, comprehension, trust, or recovery>
- **Files:** `<file paths>`
- **Source lines:** `<path:Lstart-Lend>`
- **Recommendation:** <Specific corrective action>
- **Fixed:** `<yes|no>`

### Information Architecture

<Repeat findings using the same structure. Omit empty groups.>

### Navigation

<Repeat findings using the same structure. Omit empty groups.>

### Content Clarity

<Repeat findings using the same structure. Omit empty groups.>

### Forms

<Repeat findings using the same structure. Omit empty groups.>

### Feedback & Error Recovery

<Repeat findings using the same structure. Omit empty groups.>

### Responsive UX

<Repeat findings using the same structure. Omit empty groups.>

### Accessibility

<Repeat findings using the same structure. Omit empty groups.>

### Trust

<Repeat findings using the same structure. Omit empty groups.>

### Cognitive Load

<Repeat findings using the same structure. Omit empty groups.>

## Prioritized Remediation

Prioritize verified findings by user impact, task criticality, dependencies, and effort.

### P0 — Release Blockers

1. **<Action>**
   - Findings: `<UX-###>`
   - Why now: <Reason this blocks release or the primary task>
   - Effort: `<small|medium|large>`
   - Validation: <How to verify the fix>

### P1 — High Priority

1. **<Action>**
   - Findings: `<UX-###, UX-###>`
   - Why now: <High-impact usability reason>
   - Effort: `<small|medium|large>`
   - Validation: <How to verify the fix>

### P2 — Planned Improvements

1. **<Action>**
   - Findings: `<UX-###>`
   - Why: <Meaningful but non-blocking improvement>
   - Effort: `<small|medium|large>`
   - Validation: <How to verify the fix>

### P3 — Polish / Opportunities

1. **<Action>**
   - Findings: `<UX-###>`
   - Why: <Low-impact refinement or informational opportunity>
   - Effort: `<small|medium|large>`
   - Validation: <How to verify the fix>

## Validation

| Check | Status | Notes |
| --- | --- | --- |
| Lint | `<pass|fail|not_run>` | <notes> |
| Typecheck | `<pass|fail|not_run>` | <notes> |
| Build | `<pass|fail|not_run>` | <notes> |
| Keyboard review | `<pass|fail|manual_review>` | <notes> |
| Responsive review | `<pass|fail|manual_review>` | <notes> |
| Accessibility review | `<pass|fail|manual_review>` | <notes> |

## Assumptions & Evidence Limits

- <State what was and was not directly tested.>
- <Do not claim analytics, user testing, screen-reader testing, or browser behavior that was not actually measured.>
