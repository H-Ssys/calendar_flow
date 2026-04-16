# Phase B Deployment Log

## Image
flow-api:b5

## Date
2026-04-16

## Health check
http://localhost:8001/health → {"status":"ok"}

## Routes confirmed live
- /api/contacts/ocr
- /api/contacts/ocr/batch
- /api/contacts/ocr/status/{job_id}
- /api/contacts/{contact_id}/cards
- /api/contacts/{contact_id}/cards/{side}
- /api/v1/ocr (legacy route also present)

## Container
Port mapping: 8001:8000
Env file: /home/flow/.flow.env
Restart policy: unless-stopped

## Env vars added during deploy
SUPABASE_URL=http://187.77.154.212:8000
SUPABASE_SERVICE_KEY=(aliased from SERVICE_ROLE_KEY)
GEMINI_API_KEY=(set)
GEMINI_MODEL=gemini-3.1-flash-lite

## Notes
- B3-fix: CORS tightened to env-var origins
- B3-fix: user_id derived from JWT, not Form field
- Celery not in stack — batch endpoint uses sync fallback
- Rate limiting flagged for post-launch hardening
