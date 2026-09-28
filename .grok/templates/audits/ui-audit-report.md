# UI Audit Report

**Scope:** `<scope>`  
**Mode:** `<report|fix>`  
**Minimum severity:** `<low>`  
**Reference:** `<design source or none>`  
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

<2–5 sentence summary of the largest visual-system risks, consistency issues, and overall audit result.>

## Findings by Area

### Design Tokens

#### UI-001 — <Finding title>
- **Severity:** `<critical|high|medium|low|info>`
- **Evidence:** <What was actually observed>
- **Visual impact:** <How this affects hierarchy, consistency, readability, or polish>
- **Files:** `<file paths>`
- **Source lines:** `<path:Lstart-Lend>`
- **Recommendation:** <Specific corrective action>
- **Fixed:** `<yes|no>`

### Typography

<Repeat findings using the same structure. Omit empty groups.>

### Spacing & Density

<Repeat findings using the same structure. Omit empty groups.>

### Alignment & Grid

<Repeat findings using the same structure. Omit empty groups.>

### Color & Contrast

<Repeat findings using the same structure. Omit empty groups.>

### Component Consistency

<Repeat findings using the same structure. Omit empty groups.>

### Component States

<Repeat findings using the same structure. Omit empty groups.>

### Responsive UI

<Repeat findings using the same structure. Omit empty groups.>

### Imagery

<Repeat findings using the same structure. Omit empty groups.>

### Motion

<Repeat findings using the same structure. Omit empty groups.>

### Visual Hierarchy

<Repeat findings using the same structure. Omit empty groups.>

## Prioritized Remediation

Prioritize verified findings by severity, visual-system leverage, dependency order, and effort.

### P0 — Release Blockers

1. **<Action>**
   - Findings: `<UI-###>`
   - Why now: <Reason this blocks release or makes a core interface unusable>
   - Effort: `<small|medium|large>`
   - Validation: <How to verify the fix>

### P1 — High Priority

1. **<Action>**
   - Findings: `<UI-###, UI-###>`
   - Why now: <High-impact interface reason>
   - Effort: `<small|medium|large>`
   - Validation: <How to verify the fix>

### P2 — System Improvements

1. **<Action>**
   - Findings: `<UI-###>`
   - Why: <Meaningful but non-blocking system improvement>
   - Effort: `<small|medium|large>`
   - Validation: <How to verify the fix>

### P3 — Polish / Opportunities

1. **<Action>**
   - Findings: `<UI-###>`
   - Why: <Low-impact visual refinement>
   - Effort: `<small|medium|large>`
   - Validation: <How to verify the fix>

## Validation

| Check | Status | Notes |
| --- | --- | --- |
| Token contract | `<pass|fail|not_run>` | <notes> |
| Token usage | `<pass|fail|not_run>` | <notes> |
| Lint | `<pass|fail|not_run>` | <notes> |
| Typecheck | `<pass|fail|not_run>` | <notes> |
| Build | `<pass|fail|not_run>` | <notes> |
| Responsive visual review | `<pass|fail|manual_review>` | <notes> |
| State coverage review | `<pass|fail|manual_review>` | <notes> |

## Assumptions & Evidence Limits

- <State what was and was not directly inspected.>
- <Do not claim screenshot comparison, visual regression, browser testing, or device testing that was not actually performed.>
