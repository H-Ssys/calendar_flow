---
type: feature-spec
status: in_progress
---

# Namecard OCR — Task Spec

## Phase A: Database + Storage

| Task | Agent | Inputs | Outputs | Acceptance criteria |
|------|-------|--------|---------|---------------------|
| A1: Module scan | Codebase Scanner | src/contacts/, migrations/ | contacts-module.md | DONE (c9ba0c6) |
| A2: Vault artifacts | Feature Planner | scan + plan | brief/spec/reuse-map/contract | All 4 files exist, contract has multipart endpoint |
| A3: ADRs | System Architect | contract.md | adr-023, adr-024 | Two ADRs explain schema + crop library choices |
| A4: Security pre-audit | Security Officer | planned schema | audit report | Zero FAIL items |
| A5: Migration 013 | Backend Engineer | 001_core_tables.sql (existing) + audit | 013_namecard_dual_side.sql applied | 6 checkpoint items pass in Studio |
| A6: Storage buckets | Backend Engineer | .flow.env | contacts-cards + contact-avatars buckets | Cross-user 403 verified |
| A7: QA gate | QA Lead | Studio SQL | phase-a-qa-results.md | 5/5 checks PASS |

## Phase B: FastAPI OCR Endpoint

| Task | Agent | Key constraint |
|------|-------|---------------|
| B1: OCR router | Backend Engineer | multipart/form-data, gemini-3.1-flash-lite, response_mime_type JSON |
| B2: Batch endpoint | Backend Engineer | Semaphore(5), Celery job, status polling |
| B3: Security audit | Security Officer | JWT on all endpoints, no VITE_ secrets |
| B4: QA integration test | QA Lead | curl tests against local server |
| B5: Deploy to VPS | Release Engineer | docker rebuild flow-api, health check |

## Phase C: Frontend Pipeline

| Task | Agent | Key constraint |
|------|-------|---------------|
| C1: Install deps | MANUAL | react-advanced-cropper, heic2any, browser-image-compression |
| C2: CardCropEditor design | Antigravity | Uses react-advanced-cropper (NOT react-cropper) |
| C3: useCardProcessor hook | Frontend Engineer | HEIC convert → resize → mock mode → OCR state machine |
| C4: Wire cropper | Frontend Engineer | Replace any placeholder with Cropper from react-advanced-cropper |
| C5: Wire ScanCardForm.handleExtract | Frontend Engineer | Replace setTimeout mock with real useCardProcessor call |
| C6: Wire NewContactForm OCR consent | Frontend Engineer | Use existing prefill() seam for OCR auto-fill |
| C7: Wire BatchUploadForm.handleExtractAll | Frontend Engineer | Replace mock with batch endpoint + job polling |
| C8: Integration test (remove mock) | Full-Stack Integrator | VITE_OCR_MOCK removed, end-to-end verified |

## Phase D: Contact Detail Redesign

| Task | Agent | Key constraint |
|------|-------|---------------|
| D0-pre: Schema reconciliation | Backend Engineer | Write migration 013b_schema_reconcile.sql to bring git in sync with live DB (contact_embeddings, contact_events, contact_notes, contact_tasks, full_name, contacts_name_trgm_idx, pipeline_stage CHECK, pre-existing `contact-cards` singular public bucket + `auth_upload` policy). Run pg_dump --schema-only on live DB, compare against git migrations, write the delta as a migration file. Acceptance: `supabase db diff` returns empty after applying 013b. |
| D0: Refactor ContactDetail.tsx | Refactor Specialist | Currently 435 lines — split before Phase D additions push it over 500 |
| D1: ContactCardImages | Antigravity | Replace base64 URLs with Supabase Storage URLs |
| D2: SocialPlatforms | Antigravity | jsonb array stored in contacts.socials |
| D3: ContactReferences + ContactFlow | Antigravity | Two components, both use Supabase |
| D4: Wire all into ContactDetail | Frontend Engineer | Update Contact type to include user_id + new fields |
| D5: Update ContactContext | Frontend Engineer | Replace MOCK_CONTACTS with Supabase query; use active_contacts view |
| D6: Search integration | Full-Stack Integrator | Both tsvector columns OR'd in query |
| D7: QA regression (14 checks) | QA Lead | All existing + new functionality |
| D8: Deploy | Release Engineer | scp + docker cp + tag v2.5.0-smart-contacts |

## Pre-scan schema reference (embedded for agent reference)

From `grep -A 30 "CREATE TABLE.*contacts" supabase/migrations/001_core_tables.sql`:

Columns that ALREADY exist in `public.contacts` — migration 013 MUST NOT re-add:
`id, user_id, team_id, name, email, phone, company, title, address, website,
industry, reference, notes, avatar_color, is_favorite, is_verified,
front_image_url, back_image_url, tel_phone, fax, other_phone, other_email,
tags, fts, created_at, updated_at`.

Columns migration 013 MUST ADD COLUMN IF NOT EXISTS:
`front_ocr jsonb, back_ocr jsonb, alt_language text, socials jsonb,
phones jsonb, pipeline_stage text, bio text, birthday date,
last_contacted_at timestamptz, deleted_at timestamptz,
reference_search_text tsvector, search_text tsvector GENERATED`.

RLS is already enabled in 001. Migration 013 adds policies for the new
`contact_references` table only (the base `contacts` policies remain in 006).

## D7 — Post-launch fixes

Backlog of items surfaced by D6 QA (`phase-d-qa.md`) and the D6-fix follow-up. Each is a separate ticket; D7-1 was the only blocker on closing D6 originally and is now logged as DEFERRED.

### D7-1: Bidirectional contact ↔ event/task/note linking
**Status:** FAIL in D6 QA — stubs not wired.
**Root cause:** No `linked_contact_ids` column on `events`, `tasks`, or `notes`. `ContactDetail.handleAddEvent/Task/Note` are empty stubs (`/* wired in D5 */`). Repo-wide search confirms zero matches for `contactIds | contact_ids | linkedContactIds`.

**Required work:**

1. **Migration `015_contact_linking.sql`:**
   ```sql
   ALTER TABLE events ADD COLUMN linked_contact_ids uuid[] DEFAULT '{}';
   ALTER TABLE tasks  ADD COLUMN linked_contact_ids uuid[] DEFAULT '{}';
   ALTER TABLE notes  ADD COLUMN linked_contact_ids uuid[] DEFAULT '{}';
   CREATE INDEX ON events USING gin(linked_contact_ids);
   CREATE INDEX ON tasks  USING gin(linked_contact_ids);
   CREATE INDEX ON notes  USING gin(linked_contact_ids);
   ```

2. Update `CalendarContext`, `TaskContext`, `NoteContext` to accept and persist `linked_contact_ids` on their `addEvent` / `addTask` / `addNote` APIs. Pass `[contact.id]` when the create flow originates from a contact.

3. `ContactFlow` filter: replace the current `linkedEventIds.includes(e.id)` client filter with a Supabase query: `WHERE linked_contact_ids @> ARRAY[contact_id]`. (GIN index above makes this fast.)

4. `ContactDetail.tsx:225–227` — wire `handleAddEvent / handleAddTask / handleAddNote` to call the relevant context add-API with `linked_contact_ids: [contact.id]` (or open the existing add-dialog pre-linked).

### D7-2: Regenerate Supabase TypeScript types
```
npx supabase gen types typescript --project-id k14ezjygmt5klmcegmnex0h8
```
Regenerates `packages/shared-types/src/database.types.ts` to include `contact_references`, `contact_companies`, `contact_interactions`. Removes the `as never` casts currently used in `ContactContext.addContactReference / removeContactReference` and unblocks proper typing for the D6-fix `searchContacts` query.

### D7-3: ContactReferences read from `contact_reference_pairs` view
`ContactDetail.tsx:516` currently passes `references={[]}` — the add/remove handlers write to `contact_references` but the UI never round-trips. Wire a Supabase query against the bidirectional `contact_reference_pairs` view (migration 013 block 6, lines 163+) filtered by `contact_id = contact.id`. Map results to `ReferenceEntry[]` and pass to the component.

### D7-4: `toggleStar` error rollback
`ContactContext.toggleStar` (L100–111) flips local state optimistically and only logs on Supabase error — the UI is left lying. On error, revert `setContacts` to the previous value and (optionally) surface a toast. Same pattern is worth applying to `updateContact` and `deleteContact`.

### D7-5: Card image upload wiring
`ContactCardImages.onUploadFront / onUploadBack` callbacks are still stubs in `ContactDetail.tsx:331–332`. Wire to `flow-api`'s `POST /api/contacts/{id}/cards` endpoint (defined in `contact.md` contract §"API contracts"). Steps: open file picker → preprocess (HEIC → JPEG, resize) → POST multipart → on success update `front_image_url` / `back_image_url` via `updateContact`. Replaces the brittle `blob:` URLs the batch save flow currently persists.
