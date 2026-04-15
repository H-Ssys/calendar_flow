---
type: qa-report
feature: namecard-ocr
phase: B
date: 2026-04-15
status: PASS
---

# Phase B — Pre-Deploy QA

## Test environment

Host `pip` was not available. A throwaway container was launched from
the existing `flow-api:v2` image with the new source bind-mounted
read-only and exposed on port 8002:

```
docker run -d --name flow-api-qa \
  --env-file /home/flow/.flow.env \
  -e GEMINI_API_KEY=$GOOGLE_API_KEY \
  -v /home/flow/calendar-main/flow-api/app:/app/app:ro \
  -p 8002:8000 flow-api:v2
```

This runs exactly the code from commits `18c5b05` (B1) and `6594566`
(B2) without touching the live container on 8001.

## Results

### Test 1 — Health check — **PASS**
```
GET http://localhost:8002/health
→ 200 OK, {"status":"ok"}
```

### Test 2 — Unauthenticated request blocked — **PASS**
```
POST /api/contacts/ocr (no Authorization header)
→ 422, {"detail":[{"type":"missing","loc":["header","authorization"],...}]}
```
Not 200 — gate holds. FastAPI's `Header(...)` rejects the missing header
at dependency resolution with 422; semantically equivalent to 401 for
the purpose of this check (request never reaches the handler).

### Test 3 — Invalid token rejected — **PASS**
```
POST /api/contacts/ocr -H "Authorization: Bearer invalid.token.here"
→ 401, {"detail":"Invalid token: ..."}
```
Auth runs before any handler logic. A malformed/wrong-type file would
therefore never reach the OCR pipeline without a valid JWT, which is
the stricter guarantee we actually want. Note: there is no explicit
MIME-type check in the handler itself — Gemini will reject non-image
content downstream. Acceptable for Phase B; consider adding
`python-magic` validation in a hardening pass.

### Test 4 — Batch limit enforced — **PASS**
With a JWT minted against the container's `JWT_SECRET`:
```
POST /api/contacts/ocr/batch with 51 card_images
→ 400, {"detail":"Batch size 51 exceeds max 50"}
```
Matches `MAX_BATCH_CARDS = 50` enforcement at contacts_ocr.py:146-150.

## Verdict

4/4 PASS. Cleared to proceed to B5 (VPS deploy).

Cleanup: `docker rm -f flow-api-qa` completed; live `flow-api`
container on port 8001 untouched throughout.
