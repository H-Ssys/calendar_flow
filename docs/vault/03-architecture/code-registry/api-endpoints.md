---
type: registry
category: api-endpoints
updated: 2026-04-11
scan: step-5
---

# API Endpoints Registry

## Overlap Analysis: `backend/` vs `flow-api/`

| Dimension | `backend/` | `flow-api/` (canonical) |
|---|---|---|
| **Python** | 3.12-slim | 3.11-slim |
| **Has `__pycache__`** | No (never executed) | Yes (ran in production) |
| **Dockerfile** | 202 B, minimal | 319 B, installs libmagic/Pillow deps |
| **requirements.txt** | 11 packages (250 B) | 16 packages (314 B) |
| **JWT lib** | python-jose | PyJWT |
| **Auth pattern** | HTTPBearer scheme → `verify_token` returns `user_id: str` | `Header("authorization")` → `verify_token` returns full JWT payload |
| **Config** | pydantic-settings, SiYuan-centric (SIYUAN_URL, SIYUAN_TOKEN, RESEND_API_KEY) | pydantic-settings, AI-provider-centric (google_api_key, openai_api_key, deepseek_api_key, ocr_provider, embed_provider) |
| **Active routers in main.py** | notes, transcribe, ocr, ai, email + SiYuan sync lifespan + Prometheus + slowapi | health, ocr, embed, detect_card (lean, production-focused) |
| **Real implementations** | All stubs | OCR (3 providers), embeddings (2 providers), card detection |
| **Extra features** | SiYuan sync service, Prometheus metrics, rate limiting infra | ai_providers.py multi-provider switching, embed endpoint, detect-card endpoint |

### Verdict

- **`flow-api/`** is the **canonical, production** backend — it's what runs in the `flow-api` Docker container.
- **`backend/`** is an **older scaffold** that was never executed (no `__pycache__`). It has useful designs (SiYuan sync, notes proxy, Prometheus, rate limiting) but all endpoint bodies are stubs.
- **Recommendation**: **Delete `backend/`**. Cherry-pick its useful patterns (SiYuan sync service, notes proxy, Prometheus instrumentation, rate limiting) into `flow-api/` when those features are needed. The two codebases have diverged enough in config shape and auth pattern that merging is cleaner than maintaining both.

---

## Endpoints — `flow-api/` (Production)

### Health (`flow-api/app/api/v1/health.py`)
- **Size**: ~20 lines
- **Registered in main.py**: Yes

| Method | Path | Purpose | Auth | Dependencies |
|--------|------|---------|------|-------------|
| GET | `/health` | Liveness check | No | None |
| GET | `/ready` | Readiness check (Supabase connectivity) | No | `supabase_admin`, `settings.ocr_provider`, `settings.embed_provider` |

### OCR (`flow-api/app/api/v1/ocr.py`)
- **Size**: ~90 lines
- **Registered in main.py**: Yes, prefix `/api/v1`

| Method | Path | Purpose | Auth | Dependencies |
|--------|------|---------|------|-------------|
| POST | `/api/v1/ocr` | Extract contact fields from business card image | JWT | `ai_providers.run_ocr`, `supabase_admin` (ai_correction_memory table), `settings.ocr_provider` |

- **Request**: `multipart/form-data` — `image: UploadFile`, `user_id: str (Form, optional)`
- **Response**: `{ name, full_name, title, department, company, industry, phone, other_phone, tel_phone, other_tel, fax, email, other_email, address, website, social_profiles, notes, meeting_context, reference, _provider }`
- **Self-learning**: Fetches last 5 corrections from `ai_correction_memory` table to improve prompts
- **Provider**: Switchable via `OCR_PROVIDER` env var (deepseek/gemini/openai)

### Detect Card (`flow-api/app/api/v1/detect_card.py`)
- **Size**: ~45 lines
- **Registered in main.py**: Yes, prefix `/api/v1`

| Method | Path | Purpose | Auth | Dependencies |
|--------|------|---------|------|-------------|
| POST | `/api/v1/detect-card` | Detect business card bounding box in image | JWT | `ai_providers.run_ocr` |

- **Request**: `multipart/form-data` — `image: UploadFile`
- **Response**: `{ x, y, width, height, confidence }` (percentages 0-100)
- **Fallback**: Returns full-image bounds `{0,0,100,100}` on any error

### Embed (`flow-api/app/api/v1/embed.py`)
- **Size**: ~45 lines
- **Registered in main.py**: Yes, prefix `/api/v1`

| Method | Path | Purpose | Auth | Dependencies |
|--------|------|---------|------|-------------|
| POST | `/api/v1/embed` | Generate embedding for contact and store in DB | JWT | `ai_providers.run_embed`, `supabase_admin` (contact_embeddings table), `settings.embed_provider` |

- **Request**: JSON `EmbedRequest` — `contact_id, name, full_name, title, department, company, industry, email, phone, address, website, notes, meeting_context`
- **Response**: `{ success, contact_id, provider }`
- **Storage**: Upserts into `contact_embeddings` table (on_conflict: contact_id)
- **Provider**: Switchable via `EMBED_PROVIDER` env var (openai/deepseek)

---

## Endpoints — `flow-api/` (Registered in `__init__.py` but NOT in `main.py`)

These routers are defined and exported from `app/api/v1/__init__.py` but **not included** in `main.py`. They exist as code but are **not active** in the running application.

### Notes (`flow-api/app/api/v1/notes.py`)
- **Size**: ~130 lines
- **Status**: NOT ACTIVE (not registered in main.py)

| Method | Path | Purpose | Auth | Dependencies |
|--------|------|---------|------|-------------|
| POST | `/api/v1/notes/create` | Create note in SiYuan + metadata in Supabase | JWT | `_siyuan_request`, `get_supabase_admin` |
| POST | `/api/v1/notes/update` | Update note content via SiYuan API | JWT | `_siyuan_request` |
| POST | `/api/v1/notes/search` | Full-text search on SiYuan blocks | JWT | `_siyuan_request` |
| GET | `/api/v1/notes/{block_id}` | Fetch kramdown content for a block | JWT | `_siyuan_request` |
| POST | `/api/v1/notes/export/{block_id}` | Export note as Markdown | JWT | `_siyuan_request` |

- **SiYuan helper**: `_siyuan_request(endpoint, payload)` — authenticated POST to SiYuan kernel API
- **Note**: SiYuan is being replaced by TipTap; these endpoints may become obsolete

### AI Chat (`flow-api/app/api/v1/ai.py`)
- **Size**: ~55 lines
- **Status**: NOT ACTIVE, STUB

| Method | Path | Purpose | Auth | Dependencies |
|--------|------|---------|------|-------------|
| POST | `/api/v1/ai/chat` | AI assistant chat (rate: 30/min) | JWT | slowapi Limiter |
| GET | `/api/v1/ai/memory` | Retrieve AI long-term memory | JWT | None |

- **All stub**: Returns `"[stub] AI chat not yet implemented"` / empty list

### Email (`flow-api/app/api/v1/email.py`)
- **Size**: ~40 lines
- **Status**: NOT ACTIVE, STUB

| Method | Path | Purpose | Auth | Dependencies |
|--------|------|---------|------|-------------|
| POST | `/api/v1/email/invite` | Send event invitation email | JWT | None |
| POST | `/api/v1/email/digest` | Send notification digest | JWT | None |

- **All stub**: Returns `{sent: false}`

### Transcribe (`flow-api/app/api/v1/transcribe.py`)
- **Size**: ~45 lines
- **Status**: NOT ACTIVE, STUB

| Method | Path | Purpose | Auth | Dependencies |
|--------|------|---------|------|-------------|
| POST | `/api/v1/transcribe` | Transcribe audio file (rate: 10/hr) | JWT | slowapi Limiter |

- **Stub**: Returns `"[stub] Transcription not yet implemented"`

---

## Services

### ai_providers (`flow-api/app/services/ai_providers.py`)
- **Size**: ~130 lines | **Status**: PRODUCTION
- **Purpose**: Multi-provider AI routing for OCR and embeddings
- **Functions**:
  - `run_ocr(image_bytes, prompt) → str` — routes to configured OCR provider
  - `run_embed(text) → list[float]` — routes to configured embedding provider
  - `ocr_with_deepseek(image_bytes, prompt)` — DeepSeek-V3 vision API (resizes to 1500x1500, JPEG 85%)
  - `ocr_with_gemini(image_bytes, prompt)` — Gemini 3.1 Flash-Lite via google-generativeai SDK
  - `ocr_with_openai(image_bytes, prompt)` — GPT-4o vision via openai SDK
  - `embed_with_openai(text)` — text-embedding-3-small via openai SDK
  - `embed_with_deepseek(text)` — DeepSeek embedding API
- **Provider pattern**: Yes — `settings.ocr_provider` / `settings.embed_provider` selects at runtime
- **External APIs**: DeepSeek API, Google Generative AI, OpenAI API
- **Packages**: httpx, Pillow, google-generativeai, openai

### email_service (`flow-api/app/services/email_service.py`)
- **Size**: ~25 lines | **Status**: STUB
- **Purpose**: Email sending (invitations, digests)
- **Functions**: `send_invite(to, event_id, sender_id) → bool`, `send_digest(user_id) → dict`
- **Note**: Not called by any active endpoint

### ocr_service (`flow-api/app/services/ocr_service.py`)
- **Size**: ~20 lines | **Status**: DEAD CODE
- **Purpose**: Original OCR stub — superseded by `ai_providers.run_ocr`
- **Functions**: `process_image(image_bytes) → dict`
- **Warning**: Not imported anywhere. Candidate for deletion.

### transcription_service (`flow-api/app/services/transcription_service.py`)
- **Size**: ~15 lines | **Status**: STUB
- **Purpose**: Audio transcription placeholder
- **Functions**: `transcribe(audio_bytes) → dict`
- **Note**: Not called by any active endpoint

### siyuan_sync_service (`flow-api/app/services/siyuan_sync_service.py`)
- **Size**: ~100 lines | **Status**: NOT ACTIVE (not started in flow-api main.py lifespan)
- **Purpose**: Background poller — syncs SiYuan notes to Supabase
- **Functions**:
  - `start()` / `stop()` — lifecycle (asyncio background task)
  - `sync_note(note_id)` — sync single note by Supabase ID
  - `_sync_modified_notes()` — bulk sync all notes with siyuan_block_id
  - `_run_loop()` — polling loop with exponential backoff (cap 300s)
- **Dependencies**: httpx (SiYuan API), `get_supabase_admin`, `settings.SIYUAN_URL`, `settings.SIYUAN_TOKEN`
- **Note**: References `settings.SIYUAN_URL` and `settings.SIYUAN_TOKEN` which don't exist in flow-api config. Would crash if activated. Was designed for `backend/` config shape.

---

## Core Modules

### config (`flow-api/app/core/config.py`)
- **Size**: ~25 lines
- **Purpose**: Centralized settings via pydantic-settings
- **Env vars read**:
  - `SUPABASE_URL` (required)
  - `SUPABASE_SERVICE_KEY` (required)
  - `JWT_SECRET` (default: "")
  - `GOOGLE_API_KEY` (default: "")
  - `OPENAI_API_KEY` (default: "")
  - `DEEPSEEK_API_KEY` (default: "")
  - `OCR_PROVIDER` (default: "deepseek", options: deepseek/gemini/openai)
  - `EMBED_PROVIDER` (default: "openai", options: openai/deepseek)
- **Pattern**: Singleton `settings = Settings()` at module level
- **Security**: Reads from `.env` file, case-insensitive

### security (`flow-api/app/core/security.py`)
- **Size**: ~25 lines
- **Purpose**: JWT verification dependency for FastAPI
- **Pattern**: `verify_token(authorization: str = Header(...))` — extracts Bearer token, decodes with HS256 + "authenticated" audience
- **Returns**: Full JWT payload dict (not just user_id — different from backend/)
- **Errors**: 500 if JWT_SECRET not configured, 401 on expired/invalid token
- **Library**: PyJWT

### supabase_admin (`flow-api/app/core/supabase_admin.py`)
- **Size**: ~5 lines
- **Purpose**: Admin Supabase client (bypasses RLS)
- **Pattern**: Module-level singleton `supabase_admin = create_client(...)`
- **Warning**: No `get_supabase_admin()` function — but notes.py and siyuan_sync_service.py import it. Those files reference the `backend/` version's API shape.

---

## Tests (`flow-api/tests/`)

| File | Tests | What It Covers |
|------|-------|----------------|
| `conftest.py` | 4 fixtures | `valid_token`, `expired_token`, `invalid_token`, `test_app` (AsyncClient + ASGITransport) |
| `test_auth.py` | 5 tests | JWT validation: valid passes, expired→401, missing→401/403, wrong-secret→401, garbage→401 |
| `test_notes.py` | 8 tests | Notes endpoints: 5 auth-required checks + 3 with-auth happy paths (search, get, export) — all mock `_siyuan_request` |
| `test_transcribe.py` | 3 tests | Transcribe: auth-required, stub response, rate limit behavior (documents but may not trigger in ASGI transport) |

**Total**: 16 tests across 3 test files + conftest

**Note**: Tests reference endpoints (notes, transcribe) that are NOT active in flow-api `main.py`. Tests would fail if run against the actual flow-api app since those routers aren't mounted. Tests were likely written for `backend/` and copied over.

---

## `backend/` — Differences Only (Candidate for Deletion)

Everything below exists ONLY in `backend/` and is NOT in `flow-api/`:

### Config differences (`backend/app/core/config.py`)
- Extra env vars: `SIYUAN_URL`, `SIYUAN_TOKEN`, `SIYUAN_SYNC_INTERVAL_SECONDS`, `FASTAPI_CORS_ORIGINS`, `RESEND_API_KEY`, `LOG_LEVEL`
- Has `cors_origins` property (parses comma-separated)
- Overrides `__repr__`/`__str__` to prevent secret leakage in logs (good pattern to port)

### Auth differences (`backend/app/core/security.py`)
- Uses `python-jose` instead of PyJWT
- Uses `HTTPBearer` scheme (extracts token automatically) vs manual Header parsing
- Returns `user_id: str` (sub claim) vs full payload dict

### Supabase admin differences (`backend/app/core/supabase_admin.py`)
- Has `get_supabase_admin()` function with lazy singleton pattern
- flow-api/ creates client eagerly at module level (crashes if env vars missing at import time)

### main.py differences
- Mounts ALL routers (notes, transcribe, ocr, ai, email)
- SiYuan sync service in lifespan (start/stop)
- Prometheus metrics via `prometheus-fastapi-instrumentator`
- Rate limiting via slowapi with custom exception handler
- CORS from settings.cors_origins (not wildcard)

### Unique patterns worth porting to flow-api
1. **Secret-safe repr** — `config.py` `__repr__` override prevents secret leakage
2. **Prometheus instrumentation** — one-line middleware for /metrics
3. **Lazy Supabase client** — `get_supabase_admin()` avoids import-time crashes
4. **CORS from config** — not hardcoded wildcard
5. **Rate limiting infra** — slowapi with user-keyed limiter

---

## Dead Code Candidates

| File | Reason |
|------|--------|
| `flow-api/app/services/ocr_service.py` | Superseded by `ai_providers.run_ocr`, not imported anywhere |
| `flow-api/app/services/siyuan_sync_service.py` | References non-existent config vars, not started in lifespan |
| `flow-api/app/api/v1/ai.py` | Stub, not mounted in main.py |
| `flow-api/app/api/v1/email.py` | Stub, not mounted in main.py |
| `flow-api/app/api/v1/transcribe.py` | Stub, not mounted in main.py |
| `flow-api/app/api/v1/notes.py` | SiYuan-dependent, not mounted in main.py, SiYuan being replaced |
| `backend/` (entire directory) | Older scaffold, never executed, superseded by flow-api/ |
