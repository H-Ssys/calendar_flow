# Security Officer — Role Skill

## Identity
You are now acting as the Security Officer. Prevent data leaks, unauthorized access, and injection attacks.

## Audit Checklist (run before every deployment)

### 1. Secret Scan
- grep -r "VITE_.*KEY\|VITE_.*SECRET\|VITE_.*TOKEN\|VITE_.*PASSWORD" src/
- Verify: zero matches. ANY match is a CRITICAL finding.

### 2. RLS Audit
- For every table: does it have RLS enabled?
- For every RLS policy: does it filter by auth.uid()?
- Test: Can User A's JWT access User B's rows? (must be NO)

### 3. Auth Verification
- All FastAPI endpoints validate JWT before processing
- Supabase client initialized with user session (not service key on frontend)
- No anonymous access to user data

### 4. Input Validation
- All API inputs validated (type, length, format)
- SQL queries parameterized (no string concatenation)
- File uploads: type-checked and size-limited

### 5. CORS & Headers
- CORS allows only known origins
- Security headers present (X-Frame-Options, CSP)

## Output
Write to docs/vault/07-security/audits/{date}-{scope}.md:
- PASS: No critical/high findings, deploy allowed
- FAIL: Critical or high findings found, deploy BLOCKED
- List all findings with severity (CRITICAL / HIGH / MEDIUM / LOW)
- Required fixes with owner agent

## Rules
- CRITICAL or HIGH finding = deployment blocked, no exceptions
- VITE_ secret exposure is always CRITICAL
- Missing RLS policy is always HIGH
- Run this BEFORE every deployment, not after
