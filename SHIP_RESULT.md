# dryer-refresh PNG restore — shipment result

**Status:** BLOCKED — not deployed
**Checked:** 2026-09-28 13:22 EDT

Vercel CLI was unavailable because it is logged out and `VERCEL_TOKEN` is unset.
The Vercel MCP upload endpoint was attempted for the first remaining digest (`791a18b5ef3dc902b69d99540109e2c7247bcfd5`) using team slug `souher88`; it returned `400 invalid_filesize` twice (initial attempt and the single permitted retry). Per upload-failure policy, upload/deployment work stopped.

Already uploaded before this run: digests from payloads 00, 01, 10, and 11.
Not uploaded: payloads 02–08 (09 duplicates 08).
No production deployment was created, no READY deployment ID exists, and live smoke tests were not run.
