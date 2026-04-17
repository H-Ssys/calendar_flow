---
type: phase-status
phase: D0-pre
feature: namecard-ocr
date: 2026-04-17
author: Backend Engineer (role switch)
---

# Phase D — D0-pre Status

Pre-work gate before any Phase D frontend additions begin.
All items verified against live Supabase instance and git migration history.

## D0-pre Status

- **Legacy bucket (`contact-cards`, singular, public):** PENDING — 2 contacts
  (JAY KIM `919f87a3`, Lee Jae Hyun `9c81887e`) still reference images in the
  legacy bucket via `front_image_url` / `back_image_url`. Objects cannot be
  deleted until contact records are updated to point to the new
  `contacts-cards` (plural, private) bucket or re-uploaded. All other 21
  objects in the bucket are orphaned test files with no contact linkage.
  Bucket deletion blocked until D-phase re-upload flow is wired.

- **`alt_language` column type:** CONFIRMED text — `information_schema.columns`
  shows `alt_language text` on `public.contacts`. Migration 013b already applied
  this. No ALTER needed.

- **Schema drift:** GAPS FOUND — 2 tables present in DB with no corresponding
  `CREATE TABLE` in any migration file:
  - `daily_journals` (0 rows) — full journal schema with time_slots/urgent_tasks jsonb
  - `user_settings` (0 rows) — per-user preferences (language, timezone, theme, etc.)
  Both were created via Supabase Studio outside the migration workflow.
  **Fix:** Migration `014_schema_drift_capture.sql` written and committed —
  captures schema + enables RLS with `user_id = auth.uid()` policy on both tables.
  Migration is idempotent (`IF NOT EXISTS`); safe to apply to production.

- **Cleared for D0:** NO — legacy bucket blocking full cleanup. All other gates
  cleared. D-phase frontend work may begin; bucket deletion is a parallel D-phase
  task, not a hard blocker for feature development.

## What was checked

| Check | Command | Result |
|-------|---------|--------|
| Legacy bucket object count | `SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'contact-cards'` | 23 objects |
| Contacts referencing legacy bucket | `SELECT COUNT(*) FROM contacts WHERE front_image_url LIKE '%contact-cards%'` | 2 contacts |
| `alt_language` column type | `information_schema.columns WHERE table_name='contacts' AND column_name='alt_language'` | `text` ✓ |
| Tables in DB | `information_schema.tables WHERE table_schema='public'` | 35 tables |
| Tables in migrations | `grep -h "CREATE TABLE" supabase/migrations/*.sql` | 33 tables |
| Drift tables | diff DB vs migrations | `daily_journals`, `user_settings` |
| Row counts in drift tables | `SELECT COUNT(*)` | 0 + 0 (empty, safe) |

## Legacy Bucket — Contacts Needing Re-upload

| Contact ID | Name | Front URL | Back URL |
|------------|------|-----------|----------|
| `919f87a3-78c6-4f31-ac53-5ba115363c16` | JAY KIM | `contact-cards/ec78b292.../1775108024501_j2z0vo.jpg` | `contact-cards/ec78b292.../1775108025295_m8d3gw.jpg` |
| `9c81887e-4731-4e28-afea-fd1a6008fc9f` | Lee Jae Hyun | `contact-cards/ec78b292.../1775229321110_wj7jm0.jpg` | `contact-cards/ec78b292.../1775229321671_o8n362.jpg` |

Action required: either re-upload via new scan flow (which will write to `contacts-cards`
private bucket) or NULL out the legacy URLs for these two test contacts.

## Artifacts

- Drift migration: `supabase/migrations/014_schema_drift_capture.sql`
- Pre-migration audit: `docs/vault/07-security/audits/namecard-ocr-pre-migration.md`
  (bucket status note appended)
- Carry-forward source: `docs/vault/02-features/namecard-ocr/phase-c-integration-test.md`
