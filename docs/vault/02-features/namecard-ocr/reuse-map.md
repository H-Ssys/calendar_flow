---
type: reuse-map
feature: namecard-ocr
---

# Reuse Map — Namecard OCR

## Existing code to REUSE

| Need | Existing code | Location | Action |
|------|--------------|----------|--------|
| OCR form entry point | ScanCardForm.handleExtract (stubbed) | src/components/contacts/ScanCardForm.tsx:81-89 | Replace mock with useCardProcessor |
| Batch OCR entry point | BatchUploadForm.handleExtractAll (stubbed) | src/components/contacts/BatchUploadForm.tsx:80-95 | Replace mock with batch endpoint |
| OCR result hand-off | NewContactForm.prefill(Partial) | src/components/contacts/NewContactForm.tsx | Call with OCR result — seam already exists |
| UI: Dialog/Tabs/Popover | shadcn/ui | src/components/ui/ | Import directly |
| Global search hook | useGlobalSearch | src/hooks/useGlobalSearch.ts | Extend to include contacts FTS query |
| Type: Contact | Contact interface | src/types/contact.ts | Extend — add user_id, front_ocr, back_ocr, etc. |

## Existing DB columns to REUSE (verified from 001_core_tables.sql)

| Column | Type | Already in 001? | Action for 013 |
|--------|------|-----------------|----------------|
| user_id | UUID NOT NULL (FK auth.users) | YES | skip — do NOT re-add |
| front_image_url | TEXT | YES | skip |
| back_image_url | TEXT | YES | skip |
| tags | TEXT[] | YES | skip |
| reference | TEXT | YES | keep (legacy; new `contact_references` table supersedes) |
| tel_phone / fax / other_phone / other_email | TEXT | YES | keep (phones jsonb is additive) |
| fts | tsvector GENERATED | YES | keep — 013 adds a separate `search_text` column |
| RLS ENABLE | — | YES | skip — already enabled |

## Code to BUILD NEW

| Need | Why new | Estimated size |
|------|---------|----------------|
| useCardProcessor hook | No equivalent — new pipeline | ~150 lines |
| CardCropEditor component | No crop UI exists | ~120 lines (uses react-advanced-cropper) |
| ContactCardImages component | base64 approach replaced with Storage URLs | ~80 lines |
| SocialPlatforms component | No social field exists | ~100 lines |
| ContactReferences component | No contact-to-contact linking exists | ~120 lines |
| ContactFlow component | Replaces three separate sections | ~130 lines |
| contacts_ocr.py FastAPI router | New OCR endpoint | ~100 lines |
| contacts_cards.py FastAPI router | New Storage upload endpoint | ~60 lines |
| Migration 013 | All new columns, tables, triggers | ~120 lines SQL |

## ⚠ SPLIT BEFORE EXTENDING

ContactDetail.tsx is 435 lines. Adding ContactCardImages + SocialPlatforms +
ContactReferences + ContactFlow will push it well past 500 lines.
Refactor Specialist must split it BEFORE any Phase D component is wired in (Step D0).

## ⚠ REPLACE base64 image write path

ContactContext currently writes card images as base64 data URLs (bloat).
Phase C must route all image writes through Supabase Storage.
The old base64 fields in the Contact type should be deprecated once Storage URLs
are wired. Note: the DB columns `front_image_url` / `back_image_url` already
exist in 001 — they currently hold data URLs from the frontend; Phase C changes
the *writer*, not the column.

## ⚠ TS ↔ DB schema gap

`src/types/contact.ts` has no `user_id`, while `public.contacts.user_id` is
NOT NULL. Every insert path today would fail against the real table. Phase D4
extending the Contact type is therefore a blocking pre-condition for Phase D5
(replacing MOCK_CONTACTS with a real Supabase query).
