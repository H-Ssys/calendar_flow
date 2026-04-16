---
type: integration-test
feature: namecard-ocr
phase: C
date: 2026-04-16
status: BLOCKED — fixes applied, browser verification pending
tester: flow-orchestrator (Full-Stack Integrator role)
---

# Phase C — Integration Test: Mock Removed

## Scope

Verify the three OCR entry points (Scan Card, New Contact w/ image, Batch
Upload) hit the live FastAPI at `http://187.77.154.212:8001/api/contacts/ocr`
after `VITE_OCR_MOCK` was removed from `.env.local`.

## Honest disclosure

Tests A/B/C as written require a browser (click through UI, upload images,
inspect Network tab). The orchestrator runs headless and cannot execute
them. This report documents:

1. What was verified programmatically against the live API.
2. **Two blocking bugs** discovered while tracing the code path — fixed
   in this pass.
3. What the human tester must verify in the browser after pulling these
   fixes.

## Bugs discovered & fixed in this pass

### Bug 1 — Dev server had no proxy to FastAPI (blocks ALL three tests)

`src/hooks/useCardProcessor.ts:168` calls `fetch('/api/contacts/ocr', ...)`
as a relative URL. In dev, that resolves to `http://localhost:5173/...`.
`vite.config.ts` had **no proxy configured**, so the request would 404
inside Vite's dev server — never reaching the FastAPI container.

**Fix:** added proxy in `vite.config.ts:15-22`:

```ts
server: {
  host: "0.0.0.0",
  port: 5173,
  proxy: {
    "/api": {
      target: "http://187.77.154.212:8001",
      changeOrigin: true,
    },
  },
},
```

**Note for human tester:** the running dev server will not pick this up
automatically — Vite restart required (`Ctrl-C`, re-run `pnpm dev`).

### Bug 2 — Frontend sent no `Authorization` header (blocks ALL three tests)

The FastAPI endpoint at `flow-api/app/api/v1/contacts_ocr.py:112` uses
`Depends(verify_token)` → `app/core/security.py:12` which requires a
valid Supabase JWT in the `Authorization: Bearer <token>` header.

The frontend `runOCR` function in `useCardProcessor.ts:168` sent **no
headers at all**, only FormData. Every request would have returned
422 (missing header) or 401.

Also: `getCurrentUserId()` was a stub returning `''` (TODO from C5) —
`user_id` form field was empty on every call.

**Fix:** `src/hooks/useCardProcessor.ts`

- Added `import { supabase } from '@ofative/supabase-client'`.
- Replaced the `getCurrentUserId` stub with `getAuthHeader()` which
  pulls `supabase.auth.getSession().access_token`, throwing
  "Not authenticated" if absent.
- `runOCR` now attaches `Authorization: Bearer <token>` and populates
  `user_id` from `supabase.auth.getUser()`.

Programmatic verification:

```
curl -X POST http://187.77.154.212:8001/api/contacts/ocr \
     -F front_image=@test.jpg -F user_id=test
→ 422 {"detail":[{"type":"missing","loc":["header","authorization"]...}]}
```

Confirms: endpoint **will** reject the pre-fix frontend requests. Fix
is required.

## What was verified programmatically — PASS

### 1. API reachable
`curl http://187.77.154.212:8001/health → 200 {"status":"ok"}`

### 2. Auth gate enforces
`curl -H "Authorization: Bearer <anon-key>" … → 401
{"detail":"Invalid token: Signature verification failed"}`
The gate rejects tokens not signed with the container's `JWT_SECRET`.
This is the correct defensive behaviour.

### 3. Build compiles with the fixes
`pnpm vite build → ✓ built in 2.02s`. No type errors introduced by
the auth-header plumbing.

## Potential flag — JWT signature mismatch

The Supabase anon key in `.env.local` failed signature verification
against the flow-api container. Two possible causes:

- **Expected**: anon key audience is `anon`, endpoint requires
  `authenticated`. In that case `python-jose` should raise
  `InvalidAudienceError`, not "Signature verification failed".
- **Actual error is "Signature verification failed"**, which means
  the JWT_SECRET in `/home/flow/.flow.env` may not match the secret
  the Supabase instance at port 54321 uses to sign tokens.

**If this mismatch exists, even a correctly signed-in user's token
will be rejected by flow-api.** This cannot be verified without SSH
access. **Verify in browser Test A** — if the OCR request returns
401 "Signature verification failed" for a signed-in user, the
container's JWT_SECRET needs to be reconciled with the Supabase
instance's secret.

## Browser tests — require human tester

After pulling the two fixes above and restarting the dev server
(`pnpm dev`), run:

### Test A — Scan Card
- [ ] User is signed in (check top bar)
- [ ] Contacts → Scan Card → upload any text-containing image
- [ ] `CardCropEditor` opens with crop handles
- [ ] Rotate, click "Use this crop →"
- [ ] "Front side" → "Confirm side"
- [ ] "Extract Info"
- [ ] Form fields populate (green) **OR** amber/red banner appears
      ("partial" / "unreadable" — both valid outcomes)
- [ ] DevTools Network: `POST /api/contacts/ocr` returns **200**
      with JSON `{front, back?, processing_ms}`
- [ ] Request headers include `Authorization: Bearer eyJ...`

### Test B — New Contact with image
- [ ] New Contact → upload image to front drop zone
- [ ] Crop → confirm
- [ ] "Fill automatically" in consent dialog
- [ ] Form fields populate from OCR
- [ ] Network: same `/api/contacts/ocr` call, 200

### Test C — Batch Upload
- [ ] Batch Upload → drop 2–3 images
- [ ] Progress list renders, cards process sequentially
- [ ] Extracted data appears per card
- [ ] Countdown timer ticks
- [ ] Network: either repeated `/api/contacts/ocr` calls (current
      client loop) **or** one `/api/contacts/ocr/batch`

### Known-acceptable failure modes
These are NOT regressions — report the exact error and we
investigate:

- `403` / quota exceeded / "model not found" from Gemini →
  check `GEMINI_API_KEY` and `GEMINI_MODEL` in `/home/flow/.flow.env`
  (default model in code is `gemini-3.1-flash-lite`).
- OCR returns `{raw_text: null, error: "timeout"}` → Gemini slow, retry.
- Form stays empty after "Extract Info" but status = `ocr_failure`
  with banner "Card unreadable" → expected for a non-card image.

### Regression failure modes — **do** report as FAIL
- 404 on `/api/contacts/ocr` → proxy not picked up (restart Vite).
- 401 "Signature verification failed" for a signed-in user → JWT_SECRET
  mismatch on container (see **Potential flag** above).
- 422 missing authorization header → auth header fix not deployed.

## Verdict

- Programmatic API verification: **PASS** (reachable + auth enforced).
- Frontend pre-fix state: **would have failed 100% of Tests A/B/C**
  due to the two bugs above.
- Post-fix state: ready for human browser verification. Two files
  changed:
  - `vite.config.ts` — proxy
  - `src/hooks/useCardProcessor.ts` — Authorization header +
    real `user_id` from Supabase session

## Files changed

- `vite.config.ts:15-22` — dev proxy `/api → 8001`
- `src/hooks/useCardProcessor.ts:1-7, 24-29, 164-179` — Supabase
  session → Authorization header, real `user_id`

## Next actions

1. Human tester: restart `pnpm dev`, run Tests A/B/C against a
   signed-in user.
2. If JWT-signature-mismatch flag materialises, reconcile
   container `JWT_SECRET` with running Supabase instance.
3. On green, proceed to Phase C close-out.
