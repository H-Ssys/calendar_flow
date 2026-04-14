---
type: qa-gate
phase: A7
feature: namecard-ocr
date: 2026-04-14
auditor: QA Lead (role switch)
---

# Phase A QA gate — namecard-ocr database

Ran against the live VPS Supabase instance via
`docker exec supabase-db-k14ezjygmt5klmcegmnex0h8 psql -U postgres -d postgres`.
Same database, same RLS, same triggers — only the transport differs from Studio.

## Results

CHECK 1 — column types:        **FAIL** — 8/9 columns match, but `alt_language` is `jsonb`, expected `text`. Pre-existing drift: the live DB already contained an `alt_language jsonb` column holding legacy OCR dump objects (Gemini result payloads), so my `ADD COLUMN IF NOT EXISTS alt_language text` in migration 013 was a silent no-op. 3 existing rows have jsonb OCR-dump data in this column. This conflicts with `contract.md` line 91: `alt_language: string | null`.
  ```
   front_ocr              | jsonb    | NEVER
   back_ocr               | jsonb    | NEVER
   socials                | jsonb    | NEVER
   search_text            | tsvector | ALWAYS  ✓ matches expected generation_expression
   reference_search_text  | tsvector | NEVER
   deleted_at             | timestamptz | NEVER
   last_contacted_at      | timestamptz | NEVER
   company_id             | uuid     | NEVER
   alt_language           | jsonb    | NEVER   ← expected text   ← FAIL
  ```

CHECK 2 — GIN indexes:         **PASS** — both indexes present and using gin.
  ```
   contacts_search_idx     | CREATE INDEX ... USING gin (search_text)
   contacts_ref_search_idx | CREATE INDEX ... USING gin (reference_search_text)
  ```

CHECK 3 — reference trigger:   **PASS** — trigger fires on INSERT and updates both endpoints.
  Test contacts:
  - Alpha `977b5516-...` → `reference_search_text = 'beta':3 'qa':1 'test':2`
  - Beta  `dff12ed0-...` → `reference_search_text = 'alpha':3 'qa':1 'test':2`
  Each contact's tsvector contains the other contact's name tokens, as expected.

CHECK 4 — soft delete view:    **PASS** — `active_contacts` hides soft-deleted rows; base `contacts` retains them.
  ```
   active_contacts WHERE name = 'QA Test Alpha' → 0 rows
   contacts        WHERE name = 'QA Test Alpha' → 1 row with deleted_at = 2026-04-14 12:22:25.026513+00
  ```

CHECK 5 — canonical direction: **PASS** — INSERT with wrong direction rejected with the exact expected error.
  ```
  ERROR:  new row for relation "contact_references" violates check constraint "canonical_direction"
  DETAIL: Failing row contains (cb0d59f5-..., dff12ed0-... [larger], 977b5516-... [smaller], ...)
  ```

## Overall: BLOCKED (1/5 failure)

CHECK 1 alt_language type mismatch must be resolved before Phase B can safely
rely on `alt_language` as a language-code string (contract.md §TS types).

## Remediation — folds into existing D0-pre drift task

The fix is already scoped in the D0-pre schema-reconciliation task logged in
`spec.md` by the A6 commit (4c2bccd). Adding this as an explicit sub-item:

1. Inspect what the 3 existing `alt_language jsonb` rows actually hold. They
   appear to be full OCR result dumps (name, email, phone, company, …) that
   semantically belong in `front_ocr` — these rows never went through the new
   two-side pipeline.
2. Migrate data: `UPDATE contacts SET front_ocr = alt_language WHERE front_ocr IS NULL AND alt_language IS NOT NULL;`
   (Scope-gated to only the 3 rows; confirm counts first.)
3. `ALTER TABLE public.contacts DROP COLUMN alt_language;`
4. `ALTER TABLE public.contacts ADD COLUMN alt_language text;`
5. Re-run CHECK 1 — expect all 9 rows match.

This must ship as part of `013b_schema_reconcile.sql` (the D0-pre migration)
BEFORE Phase B backend code starts writing `alt_language` as a string.

## Cleanup

Test data removed:
```
DELETE FROM contacts WHERE name IN ('QA Test Alpha', 'QA Test Beta');
→ DELETE 2 (CASCADE cleared the canonical contact_references row too)
```

## Decision

**Phase B is NOT cleared to start.** Migration 013b (D0-pre) must land first —
at minimum the `alt_language` type fix. Other drift items from D0-pre
(`contact_embeddings`, `contact_events`, `contact_notes`, `contact_tasks`,
`full_name`, `pipeline_stage CHECK`, `contacts_name_trgm_idx`, the pre-existing
public `contact-cards` bucket) are non-blocking for Phase B OCR work but
should all be cleaned up before Phase D frontend wires up.
