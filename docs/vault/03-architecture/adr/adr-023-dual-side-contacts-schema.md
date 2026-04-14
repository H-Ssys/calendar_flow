---
type: adr
id: adr-023
title: Dual-side contacts schema (fts → search_text + reference_search_text)
status: accepted
date: 2026-04-14
feature: namecard-ocr
supersedes: []
---

# ADR-023 — Dual-side contacts schema

## Context

`public.contacts` already ships (001_core_tables.sql) with:
`id, user_id, team_id, name, email, phone, company, title, address, website,
industry, reference, notes, avatar_color, is_favorite, is_verified,
front_image_url, back_image_url, tel_phone, fax, other_phone, other_email,
tags[], fts (GENERATED), created_at, updated_at`. RLS is enabled.

Migration 013 must therefore ADD COLUMN IF NOT EXISTS for every new field
— never CREATE TABLE contacts.

`fts` is defined in 001 as:
```
fts tsvector GENERATED ALWAYS AS (
  to_tsvector('english',
    COALESCE(name,'') || ' ' ||
    COALESCE(company,'') || ' ' ||
    COALESCE(industry,'') || ' ' ||
    COALESCE(email,''))
) STORED
```
and indexed in 007_indexes.sql as `idx_contacts_fts GIN(fts)`.

The namecard-ocr feature needs a richer search column that includes OCR raw
text and bio, plus a second column covering names of referenced contacts
(stored in the new `contact_references` table).

## Decision — Option A: drop `fts`, create `search_text` (GENERATED) and `reference_search_text` (trigger-updated)

Rationale from grep results:

```
grep -rn "\.fts\|search_text\|textSearch.*fts" src/ --include="*.ts" --include="*.tsx"
→ zero matches
```

`fts` is never queried by name from frontend code. It exists only as an
internal PostgREST textSearch target that nothing currently uses. Replacing
it has no call-site fallout, so Option A is safe and cleanest. Options B/C
would keep the misleading name `fts` or leave dead columns behind — both add
long-term debt with no offsetting benefit.

## Schema changes in 013

All new columns use `ADD COLUMN IF NOT EXISTS` (defensive — the table exists).

### fts handling — REPLACE
```
DROP INDEX IF EXISTS public.idx_contacts_fts;
ALTER TABLE public.contacts DROP COLUMN IF EXISTS fts;
```
(DROP COLUMN on a GENERATED column also drops dependent indexes via CASCADE,
but we drop the index explicitly first to stay readable.)

### New columns on contacts
```
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS front_ocr          jsonb,
  ADD COLUMN IF NOT EXISTS back_ocr           jsonb,
  ADD COLUMN IF NOT EXISTS alt_language       text,
  ADD COLUMN IF NOT EXISTS socials            jsonb  DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS phones             jsonb  DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pipeline_stage     text   DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS bio                text,
  ADD COLUMN IF NOT EXISTS birthday           date,
  ADD COLUMN IF NOT EXISTS last_contacted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at         timestamptz,
  ADD COLUMN IF NOT EXISTS reference_search_text tsvector;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS search_text tsvector GENERATED ALWAYS AS (
    to_tsvector('simple',
      COALESCE(name,'')                                  || ' ' ||
      COALESCE(company,'')                               || ' ' ||
      COALESCE(title,'')                                 || ' ' ||
      COALESCE(email,'')                                 || ' ' ||
      COALESCE(bio,'')                                   || ' ' ||
      COALESCE(front_ocr->>'raw_text','')                || ' ' ||
      COALESCE(back_ocr->>'raw_text','')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_contacts_search_text
  ON public.contacts USING GIN(search_text);
CREATE INDEX IF NOT EXISTS idx_contacts_reference_search_text
  ON public.contacts USING GIN(reference_search_text);
```
`'simple'` config chosen over `'english'` because OCR output is multilingual
(see `alt_language`) — English stemming would mangle non-English tokens.

### contact_references table
```
CREATE TABLE IF NOT EXISTS public.contact_references (
  source_contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  target_contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  label             text,
  created_at        timestamptz DEFAULT now(),
  PRIMARY KEY (source_contact_id, target_contact_id),
  CHECK (source_contact_id < target_contact_id)
);
```
PK is already UNIQUE; CHECK enforces canonical ordering so the pair
(A,B) and (B,A) cannot both exist.

### contact_references RLS — EXISTS-based double-join
`contact_references` has no `user_id` column, so a plain
`user_id = auth.uid()` policy is impossible. Ownership is derived from
the underlying `contacts` rows instead:

```sql
ALTER TABLE public.contact_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own both sides of reference"
ON public.contact_references
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.contacts
    WHERE id = contact_references.source_contact_id
      AND user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.contacts
    WHERE id = contact_references.target_contact_id
      AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contacts
    WHERE id = contact_references.source_contact_id
      AND user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.contacts
    WHERE id = contact_references.target_contact_id
      AND user_id = auth.uid()
  )
);
```

Both `USING` and `WITH CHECK` are required: `USING` gates which rows are
visible on SELECT/UPDATE/DELETE; `WITH CHECK` gates INSERT/UPDATE writes.
`USING` alone would not stop a malicious INSERT.

Both EXISTS clauses are required (joined with `AND`): a single-side
check would let User A link their own contact to User B's contact by
supplying User B's UUID as the `target_contact_id`.

### active_contacts view
```
CREATE OR REPLACE VIEW public.active_contacts
  WITH (security_invoker = true) AS
SELECT * FROM public.contacts WHERE deleted_at IS NULL;
```
`security_invoker = true` is required on Supabase/PostgreSQL 15+ so the
underlying `contacts` RLS policies apply to the querying user. Without it,
the view would run as the view owner and bypass RLS.

### reference_search_text trigger
Trigger on `contact_references` (INSERT/UPDATE/DELETE) recomputes
`reference_search_text` for both the source and target contacts by
`to_tsvector('simple', string_agg(name, ' '))` over all referenced
contacts.

## Why jsonb for OCR fields

Schema-free. OCR result shape varies per card (some have WeChat IDs, some
have LinkedIn, etc.) and Gemini may extract new fields over time. jsonb
avoids a migration every time the OCR prompt evolves. Searchable parts are
projected into `search_text` via `->>` extraction.

## Why two tsvector columns (not one)

`GENERATED ALWAYS` columns compute from their own row only — they cannot
reference other tables. Reference contact names live in
`contact_references` + the referenced `contacts` rows, which is cross-row
and cross-table data. A plain `tsvector` column maintained by a trigger is
the only way to include that data in a searchable column on `contacts`.
Keeping the two concerns in separate columns (`search_text` vs
`reference_search_text`) means the GENERATED column stays pure and the
trigger stays scoped to reference changes.

## Consequences

- All contact queries must use the `active_contacts` view (soft delete).
- Application code MUST sort IDs before inserting into `contact_references`
  (CHECK constraint will reject otherwise).
- `fts` is gone — any future caller that attempts `textSearch('fts', ...)`
  will 400. Today: zero callers exist (grep verified).
- Search queries use `OR` across both columns:
  `search_text @@ q OR reference_search_text @@ q`.
- Cross-card OCR text now searchable, which was the whole point.

## Security correction (post-audit A4)

`contact_references` has no `user_id` column. An earlier draft suggested a
simple `user_id = auth.uid()` RLS policy, which is impossible on this
table shape. Replaced with the EXISTS-based double-join defined in the
"contact_references RLS" subsection above. Both `USING` and `WITH CHECK`
are required (USING alone does not block INSERTs), and both EXISTS
clauses are required (single-side check allows cross-user linkage).

Environment verification completed on the VPS Supabase instance
(`supabase-db-k14ezjygmt5klmcegmnex0h8`):
- `SELECT version();` → PostgreSQL 15.8 — `security_invoker` views supported.
- `SELECT storage.foldername('u/c/front.jpg');` → `{u,c}` — the folder-pinned
  bucket policy pattern is available for A6 (note: `foldername()` returns
  only directory segments, not the filename — `[1]` is still the user UUID).
