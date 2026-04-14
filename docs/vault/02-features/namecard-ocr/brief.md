---
type: feature-spec
status: in_progress
phase: namecard-ocr
created: 2026-04-14
---

# Namecard OCR — Feature Brief

## Problem
Smart Contacts has no persistence (MOCK_CONTACTS), no user isolation (no user_id),
and stubbed OCR that returns mock payloads. Card images are stored as bloated
base64 data URLs. Users lose all contacts on page reload.

## Who benefits
Any user who receives business cards and wants them in Flow without manual entry.

## 10-star version
Scan a card → auto-crop → OCR reads both sides → contact created with front/back
language tabs, searchable in both languages, linked to calendar events and tasks.
The contact persists across devices via Supabase.

## Scope IN
- Migration 013: add user_id + OCR columns to contacts table
- Supabase persistence for contacts (replaces MOCK_CONTACTS)
- Dual-side card images via Supabase Storage (replaces base64 data URLs)
- Gemini 3.1 Flash-Lite OCR via FastAPI
- CardCropEditor: manual crop + rotation + zoom
- OCR consent dialog in NewContactForm (uses existing prefill() seam)
- Wire ScanCardForm.handleExtract to real /api/contacts/ocr
- Wire BatchUploadForm.handleExtractAll to real batch endpoint
- Social platforms expandable field (jsonb)
- Reference field (bidirectional contact linking)
- Flow section (unified Events/Tasks/Notes)
- Full-text search: both card sides + reference names

## Scope OUT
- Mobile apps, team sharing, pgvector semantic search
- Replacing ContactContext with Supabase Realtime (that is a separate phase)

## Critical pre-conditions
- Migration 001 base contacts table must be read before writing 013
  to ensure ADD COLUMN matches existing schema with no conflicts
- user_id must be added to the Contact TypeScript type
- ContactContext MOCK_CONTACTS must be replaced with Supabase SELECT

## Pre-scan: existing contacts schema (from 001_core_tables.sql)

Verified via `grep -A 30 "CREATE TABLE.*contacts" supabase/migrations/001_core_tables.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  title TEXT,
  address TEXT,
  website TEXT,
  industry TEXT,
  reference TEXT,
  notes TEXT,
  avatar_color TEXT DEFAULT '#8b5cf6',
  is_favorite BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  front_image_url TEXT,
  back_image_url TEXT,
  tel_phone TEXT,
  fax TEXT,
  other_phone TEXT,
  other_email TEXT,
  tags TEXT[] DEFAULT '{}',
  fts tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      COALESCE(name,'') || ' ' ||
      COALESCE(company,'') || ' ' ||
      COALESCE(industry,'') || ' ' ||
      COALESCE(email,''))
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
```

### ⚠ Columns already present — Migration 013 MUST NOT re-add

- `user_id UUID NOT NULL` (already FK'd with ON DELETE CASCADE)
- `front_image_url TEXT`, `back_image_url TEXT`
- `fts tsvector GENERATED ALWAYS AS (...) STORED`
- `tags TEXT[]`, `reference TEXT`, `avatar_color`, `is_favorite`, `is_verified`
- `tel_phone`, `fax`, `other_phone`, `other_email`
- `created_at`, `updated_at`

### Columns Migration 013 MUST add (none conflict)

- `front_ocr jsonb`, `back_ocr jsonb`
- `alt_language text`
- `socials jsonb DEFAULT '[]'::jsonb`
- `phones jsonb DEFAULT '[]'::jsonb`
- `pipeline_stage text`
- `bio text`, `birthday date`
- `last_contacted_at timestamptz`
- `deleted_at timestamptz` (soft-delete)
- `reference_search_text tsvector` (plain, trigger-maintained)
- `search_text tsvector GENERATED ALWAYS AS (...)` — new dual-side FTS column,
  distinct from the existing `fts` column (both may coexist, or old `fts` can
  be dropped by 013 if the architect confirms)

### Schema-mismatch note (TypeScript)
`src/types/contact.ts` has **no** `user_id` field — this is a TS-side gap, not a
DB gap. Phase D4 must update the `Contact` interface to include `user_id`.
