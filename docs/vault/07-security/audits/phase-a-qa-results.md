---
type: qa-gate
phase: A7
feature: namecard-ocr
date: 2026-04-14
auditor: QA Lead (role switch)
status: PASS (5/5) after 013b retry
---

# Phase A QA gate — namecard-ocr database

Ran against the live VPS Supabase instance via
`docker exec supabase-db-k14ezjygmt5klmcegmnex0h8 psql -U postgres -d postgres`.
Same database, same RLS, same triggers — only the transport differs from Studio.

## A7-retry results (after migration 013b)

CHECK 1 — column types:        **PASS** — all 9 columns match expected types and generation flag.
  ```
   alt_language          | text                     | NEVER
   back_ocr              | jsonb                    | NEVER
   company_id            | uuid                     | NEVER
   deleted_at            | timestamp with time zone | NEVER
   front_ocr             | jsonb                    | NEVER
   last_contacted_at     | timestamp with time zone | NEVER
   reference_search_text | tsvector                 | NEVER
   search_text           | tsvector                 | ALWAYS
   socials               | jsonb                    | NEVER
  ```

CHECK 2 — GIN indexes:         **PASS** — both indexes present and using gin.
  ```
   contacts_search_idx     | CREATE INDEX ... USING gin (search_text)
   contacts_ref_search_idx | CREATE INDEX ... USING gin (reference_search_text)
  ```

CHECK 3 — reference trigger:   **PASS** — trigger fires on INSERT and updates both endpoints.
  Test contacts:
  - Alpha `a3f6c669-...` → `reference_search_text = 'beta':3 'qa':1 'test':2`
  - Beta  `5bd181e9-...` → `reference_search_text = 'alpha':3 'qa':1 'test':2`

CHECK 4 — soft delete view:    **PASS** — `active_contacts` hides soft-deleted rows; base `contacts` retains them.
  ```
   active_contacts WHERE name = 'QA Test Alpha' → 0 rows
   contacts        WHERE name = 'QA Test Alpha' → 1 row, deleted_at = 2026-04-14 12:33:29.702435+00
  ```
  View definition is an explicit column list (49 columns from `contacts`,
  including the new `alt_language text` and the namecard-ocr search columns)
  — Postgres always serializes `SELECT *` to the resolved list at create
  time, which is what we want for stable behavior across schema changes.
  View options: `{security_invoker=true}` — RLS on underlying `contacts`
  applies to the caller, not the view owner.

CHECK 5 — canonical direction: **PASS** — INSERT in wrong direction rejected.
  ```
  ERROR:  new row for relation "contact_references" violates check constraint "canonical_direction"
  DETAIL: Failing row contains (849276ba-..., a3f6c669-... [larger], 5bd181e9-... [smaller], ...)
  ```

## Overall: PASS (5/5)

**Phase A is COMPLETE.** Phase B (FastAPI OCR endpoint) is cleared to start.

## Cleanup

```
DELETE FROM contacts WHERE name IN ('QA Test Alpha', 'QA Test Beta');
→ DELETE 2 (CASCADE cleared the canonical contact_references row too)
```

## Carry-forward items (non-blocking for Phase B)

- `contact_events` / `contact_notes` / `contact_tasks` have RLS enabled but
  zero policies → default-deny for authenticated clients. Suggested policy
  shape commented in `013b_schema_reconcile.sql` BLOCK 2. Add when the
  frontend starts wiring junction tables.
- Legacy public `contact-cards` (singular) bucket holds 23 objects with
  flat `{user_id}/{file}` paths. Re-pathing script needed before the
  bucket can be safely dropped. Tracked as Phase D follow-up; documented
  in `013b_schema_reconcile.sql` BLOCK 3.
- Re-audit `GEMINI_API_KEY` loading during B3 when `flow-api` actually
  reads it (carry-forward from A4).

## Initial A7 run (BLOCKED, retained for context)

Original CHECK 1 found `alt_language` as `jsonb` on the live DB (legacy
Gemini OCR-dump rows from a pre-013 experiment). Migration 013b
(commit `9658a84`) salvaged 2 of 3 legacy OCR payloads into `front_ocr`,
dropped the legacy column, and re-typed `alt_language` to `text`.
CHECKs 2–5 passed on the initial run too — only CHECK 1 was the blocker.
