---
type: module-scan
module: contacts
created: 2026-04-14
scan_purpose: pre-namecard-ocr baseline
---

# Contacts Module Scan

Pre-OCR baseline of the contacts module before wiring the FastAPI
namecard / OCR pipeline into `ScanCardForm` and `BatchUploadForm`.

## Files

### `src/types/contact.ts`
- **Size:** 1.2 KB · 48 lines
- **Purpose:** Defines `Contact` and `BatchCard` shapes plus helpers (`getInitials`, `CONTACT_COLORS`).
- **Exports:** `Contact` (interface), `BatchCard` (interface), `getInitials` (fn), `CONTACT_COLORS` (const array).
- **Imports:** none.
- **Patterns:** Pure TypeScript module, no runtime deps. Optional fields throughout (most non-id fields are `?`).
- **Issues:**
  - No `userId`/`user_id` field — model assumes single-user, will need extension once wired to Supabase `public.contacts` (which has `user_id UUID NOT NULL`).
  - `frontCardImage` / `backCardImage` typed as `string` (data-URL today, must become Storage URL after OCR wiring).
  - No discriminator for OCR-extracted vs hand-entered records — needed for confidence/audit trail in OCR pipeline.

### `src/context/ContactContext.tsx`
- **Size:** 2.9 KB · 102 lines
- **Purpose:** React Context provider holding contacts in component state with CRUD helpers.
- **Exports:** `useContactContext` (hook), `ContactProvider` (component).
- **Imports:** `react`, `@/types/contact`.
- **Patterns:** Context+Provider, `useState` for in-memory store, `crypto.randomUUID()` for IDs.
- **Issues:**
  - **In-memory only.** Hard-codes `MOCK_CONTACTS` (3 entries) as initial state — no Supabase wiring, no persistence at all.
  - No `localStorage` usage either, so contacts are lost on every reload (worse than the v1 task/note contexts).
  - No `loading` / `error` / `userId` state — provider has no concept of auth.
  - Will need full rewrite to a `useContacts` hook backed by `supabase-client` (mirrors P3 plan in [[codebase-scan]]).

### `src/components/contacts/ContactDetail.tsx`
- **Size:** 23.9 KB · 435 lines
- **Purpose:** Right-pane contact view with inline-editable fields, color picker, edit modal, delete dialog, tag editor, and linked events/tasks/notes panels.
- **Exports:** `ContactDetail`.
- **Imports:** `react`, `@/types/contact`, `@/context/ContactContext`, `@/components/ui/textarea`, `@/components/ui/badge`, `@/components/ui/alert-dialog`, `lucide-react`, `date-fns`, `@/lib/utils`.
- **Patterns:** Inline-editable `Field` subcomponent, modal portal via fixed-position div, `AlertDialog` for destructive action, optimistic updates straight to context.
- **Issues:**
  - **Largest file in the module (435 lines).** Under the 500-line threshold but close — three internal subcomponents (`Field`, `EditContactModal`, `ContactDetail`) could split into separate files.
  - Linked events/tasks/notes render raw IDs as text (placeholder UI) — no joins to other contexts.
  - Two parallel edit affordances (inline `Field` + `EditContactModal`) duplicate state-binding logic; OCR rewrite is a good time to consolidate.

### `src/components/contacts/NewContactForm.tsx`
- **Size:** 9.1 KB · 203 lines
- **Purpose:** Modal dialog to create a new contact manually, with optional front/back card images and a color picker.
- **Exports:** `NewContactForm`.
- **Imports:** `react`, `@/context/ContactContext`, `@/types/contact`, `@/components/ui/{input,textarea,button,dialog}`, `lucide-react`, `@/lib/utils`.
- **Patterns:** Controlled inputs with one `useState` per field (15 hooks), `FileReader` -> data URL for image upload, `prefill` prop for OCR hand-off.
- **Issues:**
  - 15 separate `useState` calls — should collapse into a single form-state object or `react-hook-form` before adding more fields.
  - Image upload stores base64 data URLs in component state (and ultimately in the contact record). Will not scale; needs Supabase Storage upload as part of OCR work.
  - `prefill` API exists but no caller passes it yet — this is the intended seam for OCR results.

### `src/components/contacts/ScanCardForm.tsx`
- **Size:** 5.7 KB · 162 lines
- **Purpose:** Single-card scan dialog. Uploads front + optional back, calls a stubbed extractor, then either hands data to `onExtracted` or directly creates a contact.
- **Exports:** `ScanCardForm`.
- **Imports:** `react`, `@/context/ContactContext`, `@/types/contact`, `@/components/ui/{button,textarea,dialog}`, `lucide-react`, `@/lib/utils`.
- **Patterns:** `CardSlot` reusable subcomponent, `FileReader` -> data URL, simulated async extraction (`setTimeout(1800)`).
- **Issues:**
  - **`handleExtract` is mocked** — returns hard-coded `mockExtracted` payload. This is the primary integration point for the namecard OCR pipeline (`flow-api` `/ocr` + `/detect-card`).
  - `as any` cast on `addContact({ ...mockExtracted as any, ... })` — type safety hole that should be removed when the real extractor lands.
  - No error handling for upload failures or OCR failures (no try/catch, no user-facing error state).

### `src/components/contacts/BatchUploadForm.tsx`
- **Size:** 8.0 KB · 195 lines
- **Purpose:** Multi-card (up to 20) batch upload dialog with progress bar; sequentially "extracts" each card and creates contacts.
- **Exports:** `BatchUploadForm`.
- **Imports:** `react`, `@/context/ContactContext`, `@/types/contact`, `@/components/ui/{button,textarea,badge,dialog}`, `lucide-react`, `@/lib/utils`.
- **Patterns:** `MiniDropZone` reusable subcomponent, simulated per-card extraction (`setTimeout(800)`), progress badge + bar.
- **Issues:**
  - **Extraction is fake** — creates contacts named `Contact 1`, `Contact 2`, … with no real OCR. Same primary integration point as ScanCardForm.
  - Sequential `await` loop blocks the dialog; a real OCR pipeline should batch-submit and stream results (Celery + Redis is already provisioned).
  - No retry / partial-failure UI (e.g., card 7 fails -> what happens?).

## Migrations (latest two)

### `supabase/migrations/011_note_metadata.sql`
- **Size:** 0.5 KB · 10 lines
- **Purpose:** Adds `metadata JSONB` to `public.notes` for v1-only fields (category, isFavorite, linkedDate, linked*Ids).
- **Touches contacts?** No — but the comment notes that cross-module links could later move into `contact_notes`.

### `supabase/migrations/012_journal_focus_metadata.sql`
- **Size:** 0.6 KB · 15 lines
- **Purpose:** Adds `metadata JSONB` to `public.journal_entries` and `public.focus_sessions`.
- **Touches contacts?** No.

> **Note:** Neither of the two latest migrations touches the contacts schema. The canonical `public.contacts` table is defined in `001_core_tables.sql` (lines 21-59) — RLS enabled there, indexed in `007_indexes.sql`, policy in `006_rls_policies.sql`. `004_ai_storage.sql` defines `contact_embeddings` (pgvector + HNSW). No migration yet adds OCR-specific columns (e.g., `ocr_confidence`, `ocr_source_asset_id`, `ocr_raw_text`) — that is a deliverable of the namecard-OCR work.

## Patterns Used (module-wide)

- Context+Provider for state (no persistence layer).
- `crypto.randomUUID()` for client-side IDs.
- `FileReader` -> base64 data URL for image previews.
- `lucide-react` icons + shadcn/ui dialog primitives.
- Inline Tailwind utility classes (no module CSS).
- `prefill: Partial<Contact>` as the OCR hand-off contract on `NewContactForm`.

## Issues Roll-up

| Severity | Item | File |
|----------|------|------|
| HIGH | Mock OCR extractor returns hard-coded fields | ScanCardForm.tsx:81-89 |
| HIGH | Mock batch extractor names contacts `Contact N` | BatchUploadForm.tsx:80-95 |
| HIGH | Context has no Supabase wiring; in-memory MOCK_CONTACTS | ContactContext.tsx:4-72 |
| HIGH | Contact images stored as base64 data URLs (will bloat Supabase rows) | NewContactForm/ScanCardForm/BatchUploadForm |
| MED  | `as any` cast bypasses Contact typing | ScanCardForm.tsx:96 |
| MED  | ContactDetail.tsx 435 lines (approaching 500-line threshold) | ContactDetail.tsx |
| MED  | No `user_id` on `Contact` type — schema mismatch with `public.contacts` | types/contact.ts |
| LOW  | NewContactForm has 15 separate `useState` hooks | NewContactForm.tsx:57-72 |
| LOW  | Linked events/tasks rendered as raw IDs (placeholder) | ContactDetail.tsx:312-342 |

No `localStorage` usage detected in any contacts file (the module skipped v1 persistence entirely — it has *no* persistence).

## Pre-OCR Recommendations

1. Wire `ContactContext` (or a new `useContacts` hook) to `supabase-client` before adding OCR — otherwise OCR results vanish on reload.
2. Add a contacts migration introducing `ocr_*` columns + a `contact_assets` link to `public.assets` for original card images.
3. Replace base64 data URLs with Supabase Storage uploads in all three card-handling forms.
4. Replace stubs in `ScanCardForm.handleExtract` and `BatchUploadForm.handleExtractAll` with calls to `flow-api` `/detect-card` + `/ocr`.
5. Drop the `as any` cast in ScanCardForm once the OCR response is properly typed.

## Related

- [[codebase-scan]] · [[components]] · [[contexts]] · [[types]] · [[supabase-tables]] · [[api-endpoints]]
