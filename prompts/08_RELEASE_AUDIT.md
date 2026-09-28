# Grok Prompt — Release Audit

Act as the final release reviewer.

Do not add new features.

Review:
- requested functionality,
- responsive behavior,
- accessibility,
- SEO,
- security,
- errors and edge cases,
- unused/demo content,
- environment variables,
- broken links,
- production build readiness.

Run:

npm run lint
npm run typecheck
npm run build

Return a release report with:
- PASS / NEEDS WORK for each area,
- exact blocking issues,
- non-blocking follow-ups,
- files changed during fixes.

Do not call the release ready if a required check is failing.
