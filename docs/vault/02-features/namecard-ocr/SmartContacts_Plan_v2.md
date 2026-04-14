# Smart Contacts — Full Implementation Plan v2.0
**Flow Platform · Updated post-audit · April 2026**

> This document supersedes v1.0. All 13 audit findings have been incorporated.  
> Two new sections added: **Contact Detail UX Recommendations** and **Supabase Schema — Future-Proofing**.

---

## Table of Contents

1. [Audit Fixes Summary](#1-audit-fixes-summary)
2. [Platform & Library Decisions](#2-platform--library-decisions)
3. [Database Schema — Migration 013](#3-database-schema--migration-013)
4. [FastAPI Backend](#4-fastapi-backend)
5. [Frontend Components](#5-frontend-components)
6. [Contact Detail Form Redesign](#6-contact-detail-form-redesign)
7. [Search Integration](#7-search-integration)
8. [Implementation Phases](#8-implementation-phases)
9. [New & Modified Files](#9-new--modified-files)
10. [Risks & Mitigations](#10-risks--mitigations)
11. [Environment Variables Checklist](#11-environment-variables-checklist)
12. [Agent Prompt Templates](#12-agent-prompt-templates)
13. [Contact Detail UX — Recommendations](#13-contact-detail-ux--recommendations)
14. [Supabase Schema — Future-Proofing Recommendations](#14-supabase-schema--future-proofing-recommendations)
15. [Vault Artifacts Checklist](#15-vault-artifacts-checklist)

---

## 1. Audit Fixes Summary

All 13 issues from the audit have been resolved in this document. The three critical ones must be verified before any agent begins coding.

| # | Severity | Issue | Resolution in this document |
|---|---|---|---|
| 1 | 🔴 Critical | `gemini-2.0-flash-lite` shuts down June 1, 2026 | Changed to `gemini-3.1-flash-lite` throughout. See §4.2 |
| 2 | 🔴 Critical | `GENERATED ALWAYS` tsvector cannot join other tables | Split into `search_text` (generated) + `reference_search_text` (trigger-updated). See §3.3 |
| 3 | 🔴 Critical | Batch OCR has no rate limiting | `asyncio.Semaphore(5)` added; batch connected to job status endpoint. See §4.3 |
| 4 | 🟠 High | `react-cropper` unmaintained (3 yrs) | Replaced with `react-advanced-cropper`. See §5.2 |
| 5 | 🟠 High | No image size cap or HEIC handling | Preprocessing step added: resize to 1920px max, HEIC conversion via `heic2any`. See §5.1 |
| 6 | 🟠 High | OCR failure UX undefined | Three explicit states defined: success / partial / failure. See §5.3 |
| 7 | 🟠 High | No pre-Phase D refactor of `SmartContactList.tsx` | Step D0 added: Refactor Specialist splits the file before any new components are wired. See §8 |
| 8 | 🟠 High | Phase C blocked if Phase B deployment delayed | `VITE_OCR_MOCK=true` mock mode added to `useCardProcessor`. See §5.1 |
| 9 | 🟡 Medium | `contact_references` allows `(A,B)` and `(B,A)` both | `CHECK (source_contact_id < target_contact_id)` constraint added. See §3.4 |
| 10 | 🟡 Medium | Base64 JSON payload wasteful | OCR endpoint changed to `multipart/form-data`. See §4.1 |
| 11 | 🟡 Medium | Vault spec/reuse-map artifacts not listed | Added to §15 as a checklist |
| 12 | 🟡 Medium | Prompt-based JSON fragile | Gemini `response_mime_type: application/json` + `response_schema` used. See §4.2 |
| 13 | 🟡 Medium | ISO code shown raw in language tab | `LANGUAGE_DISPLAY_NAMES` constant map added. See §6.5 |

---

## 2. Platform & Library Decisions

Every tool decision is made once here. Agents do not choose libraries — they follow this table.

| Layer | Platform / Library | Version / Notes |
|---|---|---|
| Frontend framework | React 18 + TypeScript | Existing codebase |
| Frontend build | Vite (existing) | No change |
| **Image crop (browser)** | **`react-advanced-cropper`** | **Replaces react-cropper. Actively maintained, TypeScript-native, mobile-ready.** |
| HEIC conversion | `heic2any` | Browser-side. Only loaded when `file.type === 'image/heic'`. |
| Image compression | `browser-image-compression` | Resize to 1920px max, output JPEG ≤ 500KB before upload |
| Card image upload | Supabase Storage — bucket `contacts-cards` | Private bucket. RLS by `user_id`. |
| **OCR provider** | **Google Gemini 3.1 Flash-Lite** | **Model string: `gemini-3.1-flash-lite`. User's original spec.** |
| OCR fallback | Switchable via `OCR_PROVIDER` env var | `gemini` (default) \| `deepseek` \| `openai` |
| OCR response format | Gemini structured output (`response_mime_type: application/json`) | Guaranteed valid JSON — no prompt-based JSON hacks |
| Backend API | FastAPI port 8001 (existing sidecar) | New routers added. No new container. |
| OCR payload format | `multipart/form-data` (not base64 JSON) | Avoids 33% base64 size inflation |
| Async OCR — single card | `asyncio.gather` inside FastAPI route | Front + back in parallel |
| Async OCR — batch | `asyncio.Semaphore(5)` + Celery job | Max 5 concurrent Gemini calls; batch status via job endpoint |
| Database | Supabase PostgreSQL (self-hosted) | Migrations 013+ |
| FTS — own card data | `tsvector GENERATED ALWAYS STORED` | Computed from the contact's own columns |
| FTS — reference names | `reference_search_text tsvector` plain column | Updated by trigger on `contact_references` INSERT/DELETE |
| Contact-to-contact refs | `contact_references` table + bidirectional view | One row per pair, enforced canonical direction |
| Social platforms | `socials jsonb[]` on `contacts` | Schema-free; no migration for new platforms |
| UI component library | shadcn/ui (existing) | Dialog, Tabs, Popover, Badge, Combobox, Input |
| Deployment — frontend | `scp + docker cp + nginx reload` | Existing release pattern |
| Deployment — backend | Docker rebuild `flow-api` on VPS | Existing FastAPI container pattern |

---

## 3. Database Schema — Migration 013

**File:** `supabase/migrations/013_namecard_dual_side.sql`

Apply via Supabase Studio at `http://187.77.154.212:54322` or `supabase db push`.

### 3.1 Columns added to `contacts` table

```sql
ALTER TABLE contacts
  ADD COLUMN front_image_url    text,
  ADD COLUMN back_image_url     text,
  ADD COLUMN front_ocr          jsonb,
  ADD COLUMN back_ocr           jsonb,
  ADD COLUMN alt_language       text,        -- ISO 639-1 code: 'ja', 'zh', 'ko', etc.
  ADD COLUMN socials            jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN phones             jsonb DEFAULT '[]'::jsonb,  -- [{type, value}]
  ADD COLUMN birthday           date,
  ADD COLUMN anniversary        date,
  ADD COLUMN bio                text,
  ADD COLUMN pipeline_stage     text DEFAULT 'contact',     -- see §14.2
  ADD COLUMN source             text,                       -- how you met
  ADD COLUMN preferred_contact  text,                       -- email|phone|wechat|etc.
  ADD COLUMN timezone           text,
  ADD COLUMN company_id         uuid REFERENCES contact_companies(id) ON DELETE SET NULL,
  ADD COLUMN deleted_at         timestamptz,               -- soft delete
  ADD COLUMN last_contacted_at  timestamptz;               -- auto-updated by trigger
```

### 3.2 OCR result JSON schema (both `front_ocr` and `back_ocr`)

```json
{
  "name":        "Tanaka Kenji",
  "title":       "Product Director",
  "company":     "Softbank Corp",
  "email":       "k.tanaka@softbank.co.jp",
  "phone":       "+81 90-1234-5678",
  "phone_alt":   null,
  "address":     "1-9-1 Higashi-Shimbashi, Tokyo",
  "website":     "softbank.co.jp",
  "language":    "en",
  "raw_text":    "Full card text as-is from OCR"
}
```

### 3.3 Full-text search — two-column design (audit fix #2)

> **Why two columns:** `GENERATED ALWAYS` columns are computed from the row's own data only. Reference contact names live in a separate table, so they cannot be included in a generated column. A plain `tsvector` column updated by a trigger solves this without any extra infrastructure.

```sql
-- Column 1: own OCR data — auto-computed by PostgreSQL
ALTER TABLE contacts ADD COLUMN search_text tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(name, '') || ' ' ||
      coalesce(front_ocr->>'name',    '') || ' ' ||
      coalesce(front_ocr->>'company', '') || ' ' ||
      coalesce(front_ocr->>'raw_text','') || ' ' ||
      coalesce(back_ocr->>'raw_text', '') || ' ' ||
      coalesce(bio, '')
    )
  ) STORED;

-- Column 2: reference names — updated by trigger
ALTER TABLE contacts ADD COLUMN reference_search_text tsvector;

-- Index both columns
CREATE INDEX contacts_search_idx     ON contacts USING gin(search_text);
CREATE INDEX contacts_ref_search_idx ON contacts USING gin(reference_search_text);

-- Trigger: update reference_search_text when references change
CREATE OR REPLACE FUNCTION update_reference_search_text()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Update the contact whose references changed
  UPDATE contacts c
  SET reference_search_text = (
    SELECT to_tsvector('simple', string_agg(coalesce(rc.name,''), ' '))
    FROM contact_reference_pairs crp
    JOIN contacts rc ON rc.id = crp.ref_id
    WHERE crp.contact_id = c.id
  )
  WHERE c.id IN (NEW.source_contact_id, NEW.target_contact_id,
                 OLD.source_contact_id, OLD.target_contact_id);
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_reference_search
AFTER INSERT OR UPDATE OR DELETE ON contact_references
FOR EACH ROW EXECUTE FUNCTION update_reference_search_text();
```

**Frontend search query** (both columns, OR logic):

```typescript
const { data } = await supabase
  .from('contacts')
  .select('*')
  .or(`search_text.fts.${query},reference_search_text.fts.${query}`)
  .is('deleted_at', null);  // exclude soft-deleted
```

### 3.4 `contact_references` table (audit fix #9)

```sql
CREATE TABLE contact_references (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_contact_id  uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  target_contact_id  uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  reference_label    text,
  created_at         timestamptz DEFAULT now(),

  -- Canonical direction: smaller UUID is always source
  -- Prevents both (A,B) and (B,A) being stored
  CONSTRAINT canonical_direction CHECK (source_contact_id < target_contact_id),
  UNIQUE(source_contact_id, target_contact_id)
);

ALTER TABLE contact_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own references" ON contact_references
  USING (user_id = auth.uid());

-- Bidirectional view — no duplicate rows, both contacts see the link
CREATE VIEW contact_reference_pairs AS
  SELECT source_contact_id AS contact_id, target_contact_id AS ref_id, reference_label
  FROM contact_references
  UNION ALL
  SELECT target_contact_id AS contact_id, source_contact_id AS ref_id, reference_label
  FROM contact_references;
```

**Application insert helper** — always sorts before insert:

```typescript
async function addReference(userID: string, idA: string, idB: string, label?: string) {
  const [src, tgt] = [idA, idB].sort(); // canonical: smaller UUID first
  return supabase.from('contact_references').insert({
    user_id: userID,
    source_contact_id: src,
    target_contact_id: tgt,
    reference_label: label ?? null
  });
}
```

### 3.5 `contact_companies` table (new — §14 recommendation, schema included here)

```sql
CREATE TABLE contact_companies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  domain      text,           -- softbank.co.jp
  industry    text,
  logo_url    text,
  website     text,
  address     text,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE contact_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own companies" ON contact_companies
  USING (user_id = auth.uid());
```

### 3.6 `contact_tags` tables

```sql
CREATE TABLE contact_tag_definitions (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name     text NOT NULL,
  color    text NOT NULL DEFAULT '#64748B',
  UNIQUE(user_id, name)
);

CREATE TABLE contact_tag_assignments (
  contact_id  uuid REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id      uuid REFERENCES contact_tag_definitions(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

ALTER TABLE contact_tag_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tag_assignments  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own tag defs" ON contact_tag_definitions USING (user_id = auth.uid());
CREATE POLICY "users own tag assignments" ON contact_tag_assignments
  USING (EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_id AND c.user_id = auth.uid()));
```

### 3.7 `contact_interactions` table (interaction log)

```sql
CREATE TABLE contact_interactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id   uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  type         text NOT NULL,  -- 'event' | 'task' | 'note' | 'call' | 'email' | 'meeting'
  ref_id       uuid,           -- optional: linked event_id, task_id, note_id
  summary      text,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE contact_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own interactions" ON contact_interactions
  USING (user_id = auth.uid());

CREATE INDEX contact_interactions_contact_idx ON contact_interactions(contact_id, occurred_at DESC);

-- Auto-update contacts.last_contacted_at when interaction logged
CREATE OR REPLACE FUNCTION sync_last_contacted()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE contacts SET last_contacted_at = NEW.occurred_at
  WHERE id = NEW.contact_id AND (last_contacted_at IS NULL OR last_contacted_at < NEW.occurred_at);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_last_contacted
AFTER INSERT ON contact_interactions
FOR EACH ROW EXECUTE FUNCTION sync_last_contacted();
```

### 3.8 Supabase Storage bucket

| Bucket | Public | Path pattern | RLS |
|---|---|---|---|
| `contacts-cards` | No (private) | `{user_id}/{contact_id}/front.jpg` | `storage.foldername(name)[1] = auth.uid()` |
| `contacts-cards` | No (private) | `{user_id}/{contact_id}/back.jpg` | Same |
| `contact-avatars` | No (private) | `{user_id}/{contact_id}/avatar.jpg` | Same |

### 3.9 RLS policy summary

| Table | Policy | Condition |
|---|---|---|
| `contacts` | ALL | `auth.uid() = user_id` |
| `contact_references` | ALL | `auth.uid() = user_id` |
| `contact_companies` | ALL | `auth.uid() = user_id` |
| `contact_tag_definitions` | ALL | `auth.uid() = user_id` |
| `contact_tag_assignments` | ALL | Via `contacts.user_id` |
| `contact_interactions` | ALL | `auth.uid() = user_id` |
| `contacts-cards` bucket | SELECT/INSERT/DELETE | Path prefix matches `auth.uid()` |

### 3.10 Soft delete pattern

```sql
-- All queries must filter deleted contacts
-- Contacts with deleted_at IS NOT NULL are hidden, not destroyed

-- View: active contacts only (use this in all app queries)
CREATE VIEW active_contacts AS
  SELECT * FROM contacts WHERE deleted_at IS NULL;

-- "Delete" from UI
UPDATE contacts SET deleted_at = now() WHERE id = $1 AND user_id = auth.uid();

-- Hard delete runs nightly (optional, GDPR purge after 30 days)
DELETE FROM contacts WHERE deleted_at < now() - interval '30 days';
```

---

## 4. FastAPI Backend

All new routes added to the existing FastAPI sidecar (`flow-api`, port 8001). No new container needed.

### 4.1 OCR endpoint — updated to `multipart/form-data` (audit fix #10)

```
POST /api/contacts/ocr
Content-Type: multipart/form-data

Fields:
  front_image  (file, required)  — preprocessed JPEG, ≤ 500KB
  back_image   (file, optional)  — preprocessed JPEG, ≤ 500KB
  user_id      (string, required)

Response:
  {
    "front": { ...OcrResult },
    "back":  { ...OcrResult } | null,
    "processing_ms": 1240
  }
```

FastAPI route signature:

```python
@router.post("/contacts/ocr")
async def ocr_card(
    front_image: UploadFile = File(...),
    back_image:  UploadFile = File(None),
    user_id: str = Form(...),
    current_user = Depends(verify_jwt),
):
    ...
```

### 4.2 Gemini 3.1 Flash-Lite — structured output (audit fixes #1, #12)

> **Critical:** Model `gemini-2.0-flash-lite` is shut down June 1, 2026. Use `gemini-3.1-flash-lite`.

```python
OCR_SCHEMA = {
  "type": "object",
  "properties": {
    "name":       {"type": "string"},
    "title":      {"type": "string"},
    "company":    {"type": "string"},
    "email":      {"type": "string"},
    "phone":      {"type": "string"},
    "phone_alt":  {"type": "string"},
    "address":    {"type": "string"},
    "website":    {"type": "string"},
    "language":   {"type": "string"},
    "raw_text":   {"type": "string"},
  },
  "required": ["raw_text"]  # only raw_text is always expected
}

async def call_gemini(image_bytes: bytes) -> OcrResult:
    model = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "contents": [{
            "parts": [
                {"text": "Extract contact information from this business card image."},
                {"inline_data": {"mime_type": "image/jpeg",
                                 "data": base64.b64encode(image_bytes).decode()}}
            ]
        }],
        "generationConfig": {
            "response_mime_type": "application/json",
            "response_schema": OCR_SCHEMA,   # guaranteed valid JSON
        }
    }
    async with httpx.AsyncClient() as client:
        r = await client.post(url, json=payload,
                              headers={"x-goog-api-key": os.getenv("GEMINI_API_KEY")},
                              timeout=30.0)
    r.raise_for_status()
    return r.json()["candidates"][0]["content"]["parts"][0]["text"]
```

### 4.3 Rate limiting for batch OCR (audit fix #3)

```python
# Single card: asyncio.gather — both sides in parallel, immediate response
async def ocr_single_card(front_bytes, back_bytes):
    sem = asyncio.Semaphore(2)  # front + back = max 2 concurrent per card
    async with sem:
        tasks = [call_gemini(front_bytes)]
        if back_bytes:
            tasks.append(call_gemini(back_bytes))
        return await asyncio.gather(*tasks)

# Batch: Celery task + job status endpoint
# POST /api/contacts/ocr/batch returns { job_id: "..." }
# GET  /api/contacts/ocr/status/{job_id} returns { status, results, progress }

BATCH_SEMAPHORE = asyncio.Semaphore(5)  # max 5 simultaneous Gemini calls across all batch jobs

@celery.task
def process_batch_ocr(card_list: list, user_id: str, job_id: str):
    async def run():
        async with BATCH_SEMAPHORE:
            results = []
            for card in card_list:
                r = await ocr_single_card(card["front"], card.get("back"))
                results.append(r)
                update_job_progress(job_id, len(results), len(card_list))
            return results
    asyncio.run(run())
```

### 4.4 Image upload endpoints

```
POST   /api/contacts/{id}/cards        — Upload front/back images, return signed URLs
DELETE /api/contacts/{id}/cards/{side} — Remove a card image (side = front | back)
POST   /api/contacts/{id}/avatar       — Upload profile photo (separate from card)
```

---

## 5. Frontend Components

### 5.1 `useCardProcessor` hook — with preprocessing and mock mode (audit fixes #5, #8)

**Install:**
```bash
npm install react-advanced-cropper heic2any browser-image-compression
```

**Full pipeline with all audit fixes applied:**

```typescript
// VITE_OCR_MOCK=true bypasses FastAPI entirely — for Phase C development
const OCR_MOCK_RESULT: OcrResult = {
  name: "Test Contact", title: "Director", company: "Acme Corp",
  email: "test@acme.com", phone: "+1 555-0100", language: "en",
  raw_text: "Test Contact · Director · Acme Corp · test@acme.com"
};

async function preprocessImage(file: File): Promise<Blob> {
  // Step 1: Convert HEIC if needed (iPhone photos)
  let processable: File | Blob = file;
  if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
    const heic2any = (await import('heic2any')).default;
    processable = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 }) as Blob;
  }

  // Step 2: Resize to max 1920px longest edge, compress to ≤ 500KB JPEG
  const compress = (await import('browser-image-compression')).default;
  return compress(processable as File, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
  });
}

async function runOCR(frontBlob: Blob, backBlob?: Blob): Promise<{ front: OcrResult; back?: OcrResult }> {
  if (import.meta.env.VITE_OCR_MOCK === 'true') {
    await new Promise(r => setTimeout(r, 800)); // simulate latency
    return { front: OCR_MOCK_RESULT, back: backBlob ? OCR_MOCK_RESULT : undefined };
  }

  const form = new FormData();
  form.append('front_image', frontBlob, 'front.jpg');
  if (backBlob) form.append('back_image', backBlob, 'back.jpg');
  form.append('user_id', getCurrentUserId());

  const res = await fetch('/api/contacts/ocr', { method: 'POST', body: form });
  if (!res.ok) throw new Error(`OCR failed: ${res.status}`);
  return res.json();
}
```

### 5.2 `CardCropEditor` component — `react-advanced-cropper` (audit fix #4)

> **Replaces `react-cropper`** which has not been published in 3 years.  
> `react-advanced-cropper` is TypeScript-native, actively maintained, and has full mobile touch support built in.

```tsx
import { Cropper, CropperRef } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';

interface CardCropEditorProps {
  imageSrc: string;
  onConfirm: (croppedBlob: Blob) => void;
  onRedo: () => void;
}

export function CardCropEditor({ imageSrc, onConfirm, onRedo }: CardCropEditorProps) {
  const cropperRef = useRef<CropperRef>(null);
  const [rotation, setRotation] = useState(0);

  const handleConfirm = () => {
    const canvas = cropperRef.current?.getCanvas();
    canvas?.toBlob(blob => blob && onConfirm(blob), 'image/jpeg', 0.90);
  };

  return (
    <div>
      <Cropper
        ref={cropperRef}
        src={imageSrc}
        defaultCoordinates={detectCardBounds(imageSrc)}  // edge-detect pre-position
        stencilProps={{ aspectRatio: { minimum: 1.4, maximum: 2.2 } }}
      />
      {/* Rotation slider */}
      <label>Rotation</label>
      <input type="range" min={-45} max={45} value={rotation}
        onChange={e => {
          const deg = Number(e.target.value);
          setRotation(deg);
          cropperRef.current?.rotateImage(deg - rotation);
        }} />
      <button onClick={() => { setRotation(0); cropperRef.current?.rotateImage(-rotation); }}>
        Level
      </button>
      <button onClick={onRedo}>← Redo</button>
      <button onClick={handleConfirm}>Use this crop →</button>
    </div>
  );
}
```

### 5.3 OCR state machine — three explicit states (audit fix #6)

```typescript
type OcrState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'success';  front: OcrResult; back?: OcrResult }
  | { status: 'partial';  front: OcrResult; back?: OcrResult; missingFields: string[] }
  | { status: 'failure';  error: string };

function classifyOcrResult(result: { front: OcrResult; back?: OcrResult }): OcrState {
  const required = ['name', 'email', 'phone', 'company'];
  const missing = required.filter(f => !result.front[f as keyof OcrResult]);

  if (missing.length === 0) return { status: 'success', ...result };
  if (missing.length <= 2)  return { status: 'partial', ...result, missingFields: missing };
  return { status: 'failure', error: 'Too many fields unreadable. Please enter manually.' };
}
```

**UX per state:**

| State | What the user sees |
|---|---|
| `success` | Form populated. Each OCR field has a `✦` sparkle badge. Green toast: "Card read successfully." |
| `partial` | Form partially populated. Amber warning: "Some fields couldn't be read — check the card image." Missing fields are highlighted. |
| `failure` | Form stays blank. Red toast: "Card couldn't be read." User is prompted to enter manually. The card thumbnail is shown as a reference. |

### 5.4 New Contact — OCR consent dialog

Shown after crop confirmation, before OCR fires. Stateless — not persisted.

```
┌──────────────────────────────────────────────────────────┐
│  Auto-fill from this card?                               │
│  Fields can be edited after.                             │
│                                                          │
│  [ Fill automatically ]       [ Enter manually ]         │
└──────────────────────────────────────────────────────────┘
```

- **Fill automatically** → OCR runs → result classified by state machine → form populated.
- **Enter manually** → form blank, card thumbnail pinned to corner for reference. Zero API cost.

### 5.5 Batch Upload entry point

- Multi-file `<input accept="image/*,.heic" multiple>`.
- Cards processed **sequentially** with `BATCH_SEMAPHORE(5)` on the backend.
- Progress list UI: `Card 3/12 — processing…`, `Card 2/12 — saved`, `Card 1/12 — review`.
- Each card shows a 5-second auto-save countdown with a **Cancel** option.
- Batch save: single Supabase transaction for all confirmed contacts.

---

## 6. Contact Detail Form Redesign

### 6.1 Card image display

```css
/* Two thumbnails, responsive, aspect-ratio enforced */
.card-images { display: flex; gap: 12px; }
.card-thumb  { flex: 1; aspect-ratio: 1.75 / 1; object-fit: cover;
               border-radius: 8px; border: 0.5px solid var(--color-border-tertiary);
               cursor: pointer; min-width: 0; }

/* Stack on narrow screens */
@media (max-width: 480px) {
  .card-images { flex-direction: column; }
}
```

- Clicking a thumbnail opens a full-viewport lightbox (`shadcn/ui Dialog`, `object-fit: contain`).
- Placeholder shown when no image: dashed border, upload icon, label "Add front side".

### 6.2 Social platforms field

Stored as `socials jsonb[]`:

```json
[
  { "platform": "linkedin", "value": "linkedin.com/in/kenji-tanaka", "label": "LinkedIn" },
  { "platform": "wechat",   "value": "kenji_sb",     "label": "WeChat"  },
  { "platform": "custom",   "value": "@kenji",        "label": "MySpace" }
]
```

**Pre-built platforms** (picker only shows un-added ones):

| Platform | Key | Region |
|---|---|---|
| LinkedIn | `linkedin` | Global |
| X / Twitter | `twitter` | Global |
| Instagram | `instagram` | Global |
| Facebook | `facebook` | Global |
| WhatsApp | `whatsapp` | Global |
| Telegram | `telegram` | Global |
| GitHub | `github` | Global / tech |
| YouTube | `youtube` | Global |
| TikTok | `tiktok` | Global |
| Discord | `discord` | Global / tech |
| Slack | `slack` | Work |
| WeChat | `wechat` | CN / Asia |
| Line | `line` | JP / TH / TW |
| Zalo | `zalo` | VN |
| KakaoTalk | `kakaotalk` | KR |
| Skype | `skype` | Legacy |

Custom platform: free-text input creates `{ platform: "custom", label: <user input> }`.

### 6.3 Reference field

- Chips display: avatar initials + name.
- `+ Add reference` opens a `shadcn/ui Popover` with two tabs: **Existing contacts** (searchable) / **New contact** (name + email inline form).
- Insert uses `addReference()` helper (see §3.4) to enforce canonical direction.
- Optional label per chip: `Referred by` / `Works with` / `Reports to` / `Introduced me to` / free text.
- Tapping a chip navigates to that contact's detail panel.

### 6.4 Flow section (unified Events / Tasks / Notes)

**Stats row** replaces the old three-column counter — takes ~60px vs ~160px previously.

**Tab structure:**

| Tab | Content | Sort |
|---|---|---|
| All | Events + Tasks + Notes unified | By date (event date, task due date, note updated_at) |
| Events | Linked events only | Event date |
| Tasks | Linked tasks only | Due date |
| Notes | Linked notes only | Updated at |

**Data fetching:** `ContactFlow` reads from `CalendarContext`, `TaskContext`, `NoteContext` — filtered by `linkedContactIds`/`linkedEventIds`/`linkedTaskIds` respectively. No new API call needed.

**Add button:** context-aware per tab. On "All", opens a quick-type picker (Event / Task / Note).

### 6.5 Language tab bar (audit fix #13)

```typescript
// src/constants/languageDisplayNames.ts
export const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  en: 'English',   ja: '日本語',  zh: '中文',
  ko: '한국어',     vi: 'Tiếng Việt', th: 'ภาษาไทย',
  fr: 'Français',  de: 'Deutsch', es: 'Español',
  pt: 'Português', ar: 'العربية', hi: 'हिन्दी',
};

// Usage in component
const tabLabel = LANGUAGE_DISPLAY_NAMES[contact.alt_language] ?? contact.alt_language.toUpperCase();
```

- Front OCR data = default contact view (primary tab).
- Back OCR data = alt language tab, labelled with native script name.
- Both tabs show the same email, phone, website (language-neutral fields).
- Only name, title, company, address swap between tabs.

---

## 7. Search Integration

### 7.1 How all data becomes searchable

| Data | Column | Mechanism |
|---|---|---|
| Front card name, company | `search_text` | `GENERATED ALWAYS STORED` |
| Front card full text (all fields) | `search_text` | `GENERATED ALWAYS STORED` |
| Back card full text (alt language) | `search_text` | `GENERATED ALWAYS STORED` |
| Contact bio | `search_text` | `GENERATED ALWAYS STORED` |
| Reference contact names | `reference_search_text` | Trigger on `contact_references` |
| Tags | Not yet — see §14.6 | Future: add to `search_text` via trigger |

### 7.2 Supabase query — both columns, active contacts only

```typescript
const results = await supabase
  .from('active_contacts')            // uses the soft-delete view
  .select('id, name, front_ocr, alt_language, company_id')
  .or(`search_text.fts(simple).${query},reference_search_text.fts(simple).${query}`)
  .limit(20);
```

### 7.3 Global search bar (`SearchCommand.tsx`) updates

- Add contacts to the search scope (if not already included).
- Result snippet shows: `name · company` (primary language) with `(+ 日本語)` indicator if `alt_language` is set.
- Clicking a result opens the contact detail panel.

---

## 8. Implementation Phases

All phases use the 12-step agent workflow. Dependencies between phases are explicit.

### Phase A — Database + Storage Foundation

**Prerequisite for all other phases. No frontend work.**

| Step | Agent | Task |
|---|---|---|
| A1 | Codebase Scanner | MODULE SCAN on contacts module — update registry before any code changes |
| A2 | Feature Planner | Write `spec.md`, `reuse-map.md`, `contract.md` to vault (see §15) |
| A3 | System Architect | Review migration 013 schema. Write ADR-023 (dual-side contacts schema). Write ADR-024 (`react-advanced-cropper` choice). |
| A4 | Security Officer | Pre-audit RLS design before applying migration |
| A5 | Backend Engineer | Write and apply migration 013 — all columns, tables, tsvector, triggers, view, indexes |
| A6 | Backend Engineer | Create `contacts-cards` + `contact-avatars` Storage buckets with RLS policies |
| A7 | QA Lead | Verify: two test users cannot read each other's Storage; tsvector updates on insert; reference trigger fires correctly |

**Checkpoint:** `active_contacts` view returns data. Trigger test: insert a contact reference → `reference_search_text` updates within 1 second.

---

### Phase B — FastAPI OCR Endpoint

**Prerequisite: Phase A complete.**

| Step | Agent | Task |
|---|---|---|
| B1 | Backend Engineer | Add `contacts_ocr.py` router. `multipart/form-data` endpoint. `asyncio.Semaphore(5)` for batch. |
| B2 | Backend Engineer | Implement Gemini 3.1 Flash-Lite caller with `response_mime_type: application/json` + `response_schema`. |
| B3 | Backend Engineer | Add batch job endpoint (`/ocr/batch`, `/ocr/status/{job_id}`) with Celery. |
| B4 | Backend Engineer | Add `/contacts/{id}/cards` upload/delete endpoints. Wire to Supabase Storage. |
| B5 | Security Officer | Audit: JWT on all endpoints, no `VITE_` secrets, user isolation on Storage paths |
| B6 | QA Lead | Integration test: upload two card images, call OCR, verify JSON shape, verify Storage URLs, test rate limiting with 6 simultaneous calls |
| B7 | Release Engineer | Rebuild `flow-api` Docker container on VPS. Health check `/api/contacts/ocr`. |

**Checkpoint:** `curl -X POST /api/contacts/ocr -F front_image=@test_card.jpg` returns a valid OcrResult JSON in < 3 seconds.

---

### Phase C — Frontend Pipeline + `CardCropEditor`

**Can be developed with `VITE_OCR_MOCK=true` even before Phase B is deployed.**

| Step | Agent | Task |
|---|---|---|
| C1 | Frontend Engineer | Install `react-advanced-cropper`, `heic2any`, `browser-image-compression`. |
| C2 | Frontend Engineer | Build `useCardProcessor` hook — preprocessing, mock mode, crop, compress, upload, OCR with state machine. |
| C3 | Frontend Engineer | Build `CardCropEditor.tsx` — react-advanced-cropper, rotation slider, Level button, Redo/Confirm. |
| C4 | Frontend Engineer | Wire Scan Card button. Camera on mobile, file input fallback on desktop. |
| C5 | Frontend Engineer | Wire New Contact upload. OCR consent dialog. Sparkle badges on AI-filled fields. |
| C6 | Frontend Engineer | Wire Batch Upload. Multi-file input, progress list, sequential processing, 5-second auto-save. |
| C7 | Full-Stack Integrator | Remove `VITE_OCR_MOCK`. End-to-end test: scan card → crop → confirm → OCR → form populated. |
| C8 | QA Lead | All 3 entry points. Edge cases: rotated photo, HEIC input, blurry card, skip back side, OCR partial failure. |

**Checkpoint:** All three entry points (New Contact, Scan Card, Batch Upload) complete the full pipeline from image capture to contact form population.

---

### Phase D — Contact Detail Form Redesign

**Step D0 must complete before any other Phase D work. This is mandatory per agent system rules.**

| Step | Agent | Task |
|---|---|---|
| **D0** | **Refactor Specialist** | **Split `SmartContactList.tsx` (34KB) into layout shell + sub-panels. File must be ≤ 500 lines before new components are added. Followed by QA Lead regression pass.** |
| D1 | Frontend Engineer | `ContactCardImages.tsx` — responsive thumbnails, lightbox, placeholder state. |
| D2 | Frontend Engineer | `SocialPlatforms.tsx` — chip list, platform picker popover, inline-editable values, custom platform. |
| D3 | Frontend Engineer | `ContactReferences.tsx` — chips, contact picker popover (Existing/New tabs), reference label dropdown. |
| D4 | Frontend Engineer | `ContactFlow.tsx` — stats row, All/Events/Tasks/Notes tabs, unified sorted list, context-aware Add button. |
| D5 | Frontend Engineer | Language tab bar. `LANGUAGE_DISPLAY_NAMES` map. Front = default, back = alt tab. |
| D6 | Full-Stack Integrator | Wire FTS: verify both `search_text` + `reference_search_text` queries work. Test ⌘K global search. |
| D7 | QA Lead | Regression: all existing contact CRUD works. New fields save/load. Both-language search. Soft delete. |
| D8 | Release Engineer | Build frontend, deploy via `scp + docker cp`. Tag release. Update CHANGELOG. |
| D9 | Documentation Engineer | Update `system_documentation.md` with new Contact data model, Flow section, social platforms, companies, tags. |

**Checkpoint:** End-to-end: scan a Japanese business card → front = English view → back = `日本語` tab → search "田中" finds the contact.

---

## 9. New & Modified Files

### New files

| File | Type | Description |
|---|---|---|
| `supabase/migrations/013_namecard_dual_side.sql` | SQL | All schema changes |
| `src/hooks/useCardProcessor.ts` | React hook | Shared pipeline: preprocess → crop → upload → OCR → classify |
| `src/components/contacts/CardCropEditor.tsx` | React component | react-advanced-cropper + rotation slider |
| `src/components/contacts/ContactCardImages.tsx` | React component | Responsive thumbnails + lightbox |
| `src/components/contacts/SocialPlatforms.tsx` | React component | Social field list + picker |
| `src/components/contacts/ContactReferences.tsx` | React component | Reference chips + contact picker |
| `src/components/contacts/ContactFlow.tsx` | React component | Unified Flow section |
| `src/constants/socialPlatforms.ts` | Constants | Pre-built platform list with colors |
| `src/constants/languageDisplayNames.ts` | Constants | ISO 639-1 → native script name map |
| `src/types/contact.ts` (updated) | TypeScript | Extended Contact interface |
| `flow-api/routers/contacts_ocr.py` | Python | OCR router (multipart, semaphore, batch) |
| `flow-api/routers/contacts_cards.py` | Python | Storage upload/delete router |

### Modified files

| File | Change |
|---|---|
| `SmartContactList.tsx` (split in D0) | Becomes layout shell. Imports 4 new sub-components. Language tab bar. |
| `src/context/ContactContext.tsx` | CRUD for `contact_references`. `socials` field in state. Soft delete. Update FTS query to use `active_contacts` view. |
| `SearchCommand.tsx` | Contacts added to search scope. Alt-language indicator in result snippet. |
| `flow-api/main.py` | Register `contacts_ocr` and `contacts_cards` routers. |

---

## 10. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Gemini API returns unexpected JSON even with structured output | Low | Medium | `response_schema` guarantees structure. Validate with Pydantic model; fall back to `{ raw_text: <response> }` |
| HEIC conversion (`heic2any`) fails on some browsers | Low | Low | Catch + show: "Please save your photo as JPEG before uploading." Only triggered for HEIC input. |
| `asyncio.Semaphore(5)` still exceeds Gemini rate limit on free tier | Medium | Medium | Check `X-RateLimit-*` response headers. Add exponential back-off retry: `tenacity.retry(wait=wait_exponential(min=1, max=10))` |
| `SmartContactList.tsx` D0 refactor breaks existing contact CRUD | Medium | High | D0 is followed immediately by QA Lead regression pass before any Phase D components are built. |
| `react-advanced-cropper` CSS conflicts with Tailwind | Low | Low | Scope the import: `import 'react-advanced-cropper/dist/style.css'` in the component file only. Test in isolation before wiring to `useCardProcessor`. |
| Soft delete view `active_contacts` missing from a query | Medium | Medium | Add a `beforeCreate` linter rule: any query to `contacts` that doesn't go through `active_contacts` fails CI. |
| `contact_references` canonical direction violated by old data | N/A (new table) | N/A | `CHECK` constraint rejects bad inserts at the DB level. Application `addReference()` sorts before insert. |

---

## 11. Environment Variables Checklist

Add to `/home/flow/.flow.env` on the VPS before starting Phase B.

```env
# OCR Provider
OCR_PROVIDER=gemini
GEMINI_API_KEY=your-key-here         # From Google AI Studio — never commit to git
GEMINI_MODEL=gemini-3.1-flash-lite   # Updated from audit finding #1

# Supabase Storage
SUPABASE_STORAGE_BUCKET_CARDS=contacts-cards
SUPABASE_STORAGE_BUCKET_AVATARS=contact-avatars

# Frontend (development only — remove before Phase D deploy)
VITE_OCR_MOCK=true   # Set to false or remove to use real OCR
```

---

## 12. Agent Prompt Templates

### Phase A kick-off

```
Act as Codebase Scanner. Run a MODULE SCAN on the contacts module.
Scan: src/context/ContactContext.tsx, src/components/contacts/,
src/types/contact.ts, supabase/migrations/.
Update the registry. Then hand off to Feature Planner to write
spec.md, reuse-map.md, and contract.md for the namecard-ocr feature.
```

### Phase B kick-off

```
Act as Backend Engineer. Implement the namecard OCR pipeline.
Spec: /docs/vault/02-features/namecard-ocr/spec.md
Contract: /docs/vault/02-features/namecard-ocr/contract.md

Rules:
- Use multipart/form-data (NOT base64 JSON)
- Model: gemini-3.1-flash-lite (NOT gemini-2.0-flash-lite — it shuts down June 1)
- Use response_mime_type: application/json with response_schema in Gemini API call
- asyncio.Semaphore(5) for batch OCR rate limiting
- GEMINI_API_KEY is in /home/flow/.flow.env — never hardcode it
- Apply migration 013 before writing any application code
```

### Phase C kick-off

```
Act as Frontend Engineer. Build the namecard upload pipeline.

Install first:
  npm install react-advanced-cropper heic2any browser-image-compression

Build in this order:
1. useCardProcessor.ts hook
   - Preprocessing: HEIC → JPEG, resize to 1920px max, compress to ≤ 500KB
   - Mock mode: if VITE_OCR_MOCK=true, return fixture data (do NOT call real API)
   - OCR state machine: success / partial / failure states
2. CardCropEditor.tsx using react-advanced-cropper (NOT react-cropper)
3. Wire Scan Card button
4. Wire New Contact upload with OCR consent dialog
5. Wire Batch Upload with progress list and Semaphore-throttled backend calls

The OCR endpoint accepts multipart/form-data, not JSON.
```

### Phase D kick-off

```
Act as Refactor Specialist. THIS IS STEP D0 — must complete before any
new components are added to SmartContactList.tsx.

Split SmartContactList.tsx (~34KB) into:
- SmartContactList.tsx (layout shell, ≤ 300 lines)
- ContactDetailPanel.tsx (detail view orchestrator)
- ContactInfoSection.tsx (fields: name, email, phone, address)
- ContactLinkedItems.tsx (existing events/tasks/notes, pre-Flow section)

After split, hand off to QA Lead for full regression.
Only after QA passes should Phase D frontend work begin.
```

---

## 13. Contact Detail UX — Recommendations

These are design and feature recommendations for the contact detail form that go beyond the current scope but should be planned into the schema and component architecture now to avoid breaking changes later.

### 13.1 Phone numbers — multiple with type labels

The current plan maps a single `phone` and `phone_alt` from OCR. In practice, contacts often have 3+ numbers. Store phones as a `jsonb` array (already added to migration 013 as `phones`):

```json
[
  { "type": "mobile",  "value": "+81 90-1234-5678", "isPrimary": true  },
  { "type": "work",    "value": "+81 3-1234-5678",  "isPrimary": false },
  { "type": "direct",  "value": "+81 3-9876-5432",  "isPrimary": false }
]
```

**Type options:** `mobile`, `work`, `home`, `direct`, `fax`, `other`.

The OCR result's `phone` maps to `{ type: "mobile", isPrimary: true }` and `phone_alt` maps to `{ type: "work" }` automatically. The UI renders the primary phone prominently and collapses secondary numbers under a "Show more" toggle.

### 13.2 Birthday + anniversary with calendar integration

`birthday` and `anniversary` are `date` columns (already in migration 013). The recommended UI pattern:

- Show as "Born: April 22" (year optional, privacy-sensitive).
- Auto-create a recurring calendar event: "🎂 Tanaka Kenji's birthday" with a yearly recurrence — user is asked if they want this when saving the date.
- Show a "Birthday in 12 days" badge on the contact list card in the days before the date.

### 13.3 Profile photo — separate from card images

The plan currently only stores card images. A separate `avatar.jpg` in the `contact-avatars` bucket allows users to upload a profile photo that appears in the contact list and linked items across the platform. The avatar takes priority over the OCR name initials fallback.

### 13.4 CRM pipeline stage

`pipeline_stage` text column (migration 013). Recommended values as an enum-in-code (not a DB enum, for flexibility):

```typescript
export const PIPELINE_STAGES = [
  { key: 'lead',     label: 'Lead',     color: '#64748B' },
  { key: 'prospect', label: 'Prospect', color: '#3B82F6' },
  { key: 'contact',  label: 'Contact',  color: '#10B981' }, // default
  { key: 'client',   label: 'Client',   color: '#8B5CF6' },
  { key: 'partner',  label: 'Partner',  color: '#F59E0B' },
  { key: 'inactive', label: 'Inactive', color: '#94A3B8' },
] as const;
```

Shown as a colored pill in the contact list row and as a select in the detail form. The contact list gains a filter bar: filter by stage.

### 13.5 Contact source

`source` text column (migration 013). Free text or a pick from common values: `Business card`, `Conference`, `LinkedIn`, `Referral from…`, `Cold outreach`, `Client intro`. This feeds future analytics: "where do most of my clients come from?"

### 13.6 Preferred contact method

`preferred_contact` text column (migration 013). Maps to one of the user's added social platforms or `email`/`phone`. When set, the preferred channel is highlighted in the social platforms list with a "★ Preferred" badge.

### 13.7 Last contacted date and interaction log

`last_contacted_at` is auto-updated by the trigger in §3.7 whenever a `contact_interaction` row is inserted. This means:

- Creating an event linked to a contact → logs an interaction → updates `last_contacted_at`.
- Creating a task linked to a contact → same.
- A manual "Log a call/meeting/email" action is also available in the contact detail — this writes directly to `contact_interactions` without creating a full calendar event.

**Contact list enhancement:** show "Last contacted 3 days ago" or "Not contacted in 6 months" (warning color) on each list item. This is a CRM staple and requires zero extra backend work given the schema already handles it.

### 13.8 Company linking

`company_id` foreign key (migration 013) links a contact to a row in `contact_companies`. Recommended UI:

- Company name shown as a tappable link in the contact detail — opens a company detail panel.
- Company detail panel shows all contacts at that company.
- Creating a contact from OCR: if the extracted `company` name fuzzy-matches an existing company, suggest linking. Otherwise offer "Create as new company."

### 13.9 Time zone awareness

`timezone` text column (migration 013). Stores an IANA timezone string (e.g., `Asia/Tokyo`). When scheduling a meeting with this contact, the calendar event creation form pre-populates their timezone for easy time comparison.

### 13.10 Bio / notes field

`bio` text column (migration 013). A free-text field on the contact for notes that don't belong in linked Notes objects — e.g., "Met at Tokyo Summit 2025. Interested in AI integration for logistics."

The search_text tsvector already includes `bio` (see §3.3), so this is searchable out of the box.

---

## 14. Supabase Schema — Future-Proofing Recommendations

These recommendations are not required for the current implementation phase but should be designed into the schema and migration numbering now to avoid disruptive changes later.

### 14.1 Soft delete everywhere (already in migration 013)

All entity tables should have `deleted_at timestamptz`. Create `active_{table}` views for all app queries. Bulk hard-delete via a nightly cron after 30 days. This covers GDPR right-to-erasure without data loss for accidental deletes.

### 14.2 Pipeline stage as a lookup table (migration 014)

Currently `pipeline_stage` is a free-text column. For future CRM features (Kanban board by pipeline stage, analytics by stage), promote to a proper lookup table:

```sql
-- migration 014 (future)
CREATE TABLE pipeline_stages (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key      text NOT NULL,
  label    text NOT NULL,
  color    text NOT NULL,
  position int  NOT NULL DEFAULT 0,
  UNIQUE(user_id, key)
);

ALTER TABLE contacts ADD COLUMN pipeline_stage_id uuid REFERENCES pipeline_stages(id);
```

Seed the five default stages for each new user via a Supabase Edge Function triggered on user creation.

### 14.3 Custom fields — EAV pattern (migration 015)

Different users have radically different contact fields. Rather than adding columns for every possible use case (industry, budget range, NDA status, preferred language, etc.), use an EAV (Entity-Attribute-Value) table:

```sql
-- migration 015 (future)
CREATE TABLE contact_field_definitions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  field_type   text NOT NULL CHECK (field_type IN ('text','number','date','boolean','select')),
  options      jsonb,            -- for 'select' type: ["Option A", "Option B"]
  is_required  boolean DEFAULT false,
  position     int NOT NULL DEFAULT 0,
  UNIQUE(user_id, name)
);

CREATE TABLE contact_field_values (
  contact_id   uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  field_id     uuid NOT NULL REFERENCES contact_field_definitions(id) ON DELETE CASCADE,
  value        text,
  PRIMARY KEY (contact_id, field_id)
);
```

This allows each user to define their own contact schema without any code or schema migration. Values are included in the search index via a trigger that regenerates `search_text` when `contact_field_values` changes.

### 14.4 pgvector semantic search on contacts (migration 016)

When the RAG MCP server is live (Phase 6), contacts should be embedded and indexed alongside notes, events, and tasks. The existing `embeddings` table (from the RAG phase) accepts `source_type = 'contact'`. No new table needed — just ensure the Celery ingestion worker also processes `contacts`.

This enables queries like: "Find contacts who work in logistics in Tokyo" — semantic search beyond keyword matching.

### 14.5 Contact duplication detection

Add a `duplicate_of_contact_id` column (nullable FK to `contacts`). When OCR extracts a name + email that closely matches an existing contact, run a fuzzy match query and flag the pair:

```sql
ALTER TABLE contacts ADD COLUMN duplicate_of_contact_id uuid REFERENCES contacts(id);
```

The UI shows a "Possible duplicate — merge?" banner on the contact detail. Merging copies all linked items (events, tasks, notes, references) to the primary contact and soft-deletes the duplicate.

Detection query uses PostgreSQL `similarity()` (from the `pg_trgm` extension) on the `name` and `email` columns.

### 14.6 Tags in full-text search

Currently `contact_tag_assignments` is not included in `search_text`. To make tags searchable (e.g., searching "VIP" finds all contacts with the VIP tag):

```sql
-- Add to trigger update function
|| ' ' || (
  SELECT string_agg(ctd.name, ' ')
  FROM contact_tag_assignments cta
  JOIN contact_tag_definitions ctd ON ctd.id = cta.tag_id
  WHERE cta.contact_id = contacts.id
)
```

This needs its own trigger on `contact_tag_assignments` INSERT/DELETE, updating the parent contact's `search_text`.

### 14.7 Audit log for compliance (migration 017)

For teams and enterprise use, all contact changes should be logged:

```sql
CREATE TABLE contact_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  contact_id   uuid NOT NULL,
  action       text NOT NULL CHECK (action IN ('create','update','delete','merge','export')),
  changed_fields jsonb,          -- { "name": ["old", "new"], "email": ["old", "new"] }
  ip_address   inet,
  created_at   timestamptz DEFAULT now()
);

-- Trigger on contacts UPDATE
CREATE OR REPLACE FUNCTION log_contact_changes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO contact_audit_log(user_id, contact_id, action, changed_fields)
  VALUES (NEW.user_id, NEW.id, 'update',
          jsonb_diff_val(to_jsonb(OLD), to_jsonb(NEW)));  -- custom diff function
  RETURN NEW;
END;
$$;
```

### 14.8 GDPR data export

Add a `GET /api/contacts/export` endpoint that returns all of a user's contact data as a JSON or CSV archive. This should include:

- All contact rows
- All `contact_references`
- All `contact_interactions`
- All `contact_tag_assignments`
- All `contact_field_values`
- Supabase Storage signed URLs for card images and avatars

The export is triggered by the user in Settings and delivered as a downloadable file. Required for GDPR Article 20 (right to data portability).

### 14.9 Realtime subscriptions for team features

When Teams are active (Phase 5 of the platform roadmap), contacts can be shared across team members. Supabase Realtime will push contact updates to all team members automatically — no extra architecture needed if the `contacts` table has a `team_id` column and the RLS policy is updated to `auth.uid() = user_id OR team_id IN (user's teams)`.

Design the RLS policy to support this now:

```sql
-- Current (single user)
CREATE POLICY "users own contacts" ON contacts USING (user_id = auth.uid());

-- Future-ready (comment out the team clause until Teams phase ships)
-- CREATE POLICY "users own or team contacts" ON contacts
--   USING (user_id = auth.uid()
--     OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
```

### 14.10 Migration numbering plan

| Migration | Content | Phase |
|---|---|---|
| 013 | Namecard OCR, dual-side, references, companies, tags, interactions, soft delete | This phase |
| 014 | Pipeline stage lookup table | CRM phase |
| 015 | Custom fields EAV | CRM phase |
| 016 | pgvector contact embeddings | RAG integration |
| 017 | Audit log | Enterprise / Teams phase |
| 018 | Team sharing RLS update | Teams phase |

---

## 15. Vault Artifacts Checklist

The 12-step workflow requires these files before any agent starts coding. Create them in Phase A step A2.

```
docs/vault/02-features/namecard-ocr/
├── brief.md         ← Product Strategist: problem, 10-star version, scope IN/OUT
├── spec.md          ← Feature Planner: task breakdown per agent
├── reuse-map.md     ← Feature Planner: existing code to reuse vs build new
└── contract.md      ← System Architect: API shapes, component interfaces, DB contracts

docs/vault/03-architecture/adr/
├── adr-023-dual-side-contacts-schema.md   ← System Architect: why this schema design
└── adr-024-react-advanced-cropper.md      ← System Architect: crop library choice
```

**`contract.md` minimum contents:**

```markdown
## API contract

POST /api/contacts/ocr
  Content-Type: multipart/form-data
  Fields: front_image (file), back_image (file, optional), user_id (string)
  Response: { front: OcrResult, back: OcrResult | null, processing_ms: number }

## Component interfaces

useCardProcessor(options: { onResult, onError, mode: 'scan' | 'new' | 'batch' })
  → { processFile, processBatch, state: CardProcessorState }

CardCropEditor(props: { imageSrc, onConfirm, onRedo })
  → JSX.Element

ContactFlow(props: { contactId })
  → JSX.Element   (reads from CalendarContext, TaskContext, NoteContext)

## DB constraints
- contact_references: source_contact_id < target_contact_id (canonical direction)
- contacts.deleted_at: all queries use active_contacts view
- contacts.search_text: GENERATED — do not update manually
- contacts.reference_search_text: plain column, updated by trigger only
```

---

*End of document — Smart Contacts Feature Plan v2.0 · Flow Platform · April 2026*
