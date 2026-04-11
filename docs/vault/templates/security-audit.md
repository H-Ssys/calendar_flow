---
type: security-audit
status: in_progress
phase: 
agents: [security-officer]
created: {{date}}
updated: {{date}}
tags: []
tool_owner: claude-code
---

# Security Audit: {{scope}}

## Summary
- **Date**: {{date}}
- **Scope**: 
- **Result**: PASS / FAIL

## Checklist
- [ ] No secrets in frontend (VITE_ prefix scan)
- [ ] All tables have RLS policies
- [ ] RLS policies filter by auth.uid()
- [ ] User isolation verified (User A ≠ User B)
- [ ] All endpoints validate JWT
- [ ] Inputs validated (type, length, format)
- [ ] CORS configured correctly
- [ ] No SQL injection vectors

## Findings
| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 |  |  | open / fixed |

## Required Fixes (blocks deploy if CRITICAL/HIGH)
- 

## Related
- [[supabase-tables]]
- [[api-endpoints]]
