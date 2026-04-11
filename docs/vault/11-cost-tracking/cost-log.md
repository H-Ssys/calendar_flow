---
type: cost-log
created: 2026-04-09
---

# Cost Tracking Log

Append a new entry after every feature ships using the cost-entry template.

See [[workflow-state]] for the active feature and [[codebase-scan]] for scope.

---

## Feature: hotfix-supabase-url — 2026-04-11

| Metric | Value |
|--------|-------|
| Workflow used | 5-step bug fix (diagnose → patch → build → deploy → verify) |
| Sessions used | 1 |
| Rework incidents | 0 |
| Lines changed | 1 (`.env`) + rebuilt bundle |
| Modules touched | `.env`, `calendar_flow` container assets |
| Time to ship | ~5 min wall clock |
| Root cause | Build-time env drift: `VITE_SUPABASE_URL=54322` (Studio) instead of `54321` (Kong). |
| Impact | Production auth completely broken — every `/auth/v1/token` call blocked by CORS. |
| Verification | Kong preflight returns `Access-Control-Allow-Origin: *`; served bundle `input-DLQ5q6lq.js` contains only `54321`. |
| Related | [[workflow-state]] · [[dead-code-candidates]] · [[config]] |

---
