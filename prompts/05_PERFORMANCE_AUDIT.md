# Grok Prompt — Performance Audit

Inspect the affected routes for avoidable performance problems.

Prioritize:
- LCP,
- INP,
- CLS,
- oversized images,
- unnecessary client components,
- expensive JavaScript,
- third-party scripts,
- duplicate dependencies,
- layout shifts,
- font loading,
- unnecessary hydration,
- blocking work.

Do not chase tiny benchmark gains by making the code harder to maintain.

Identify the biggest likely wins first, implement only justified changes, and explain expected impact.
