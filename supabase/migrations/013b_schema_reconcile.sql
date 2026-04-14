-- =============================================================================
-- Migration 013b — Schema reconciliation (post-013 drift fixes)
-- =============================================================================
-- Unblocks Phase A QA CHECK 1 (alt_language type) and reconciles the live
-- VPS DB with the git migrations directory. Every statement is idempotent;
-- re-applying this file on a clean DB is a no-op.
--
-- Inputs (see docs/vault/07-security/audits/phase-a-qa-results.md):
--   - alt_language is jsonb in live DB (legacy OCR dump), must be text.
--   - contact_embeddings / contact_events / contact_notes / contact_tasks
--     exist in live DB but were never captured as migrations.
--   - full_name text, contacts_name_trgm_idx, pipeline_stage CHECK likewise.
--
-- Scope EXCLUDES storage bucket deletion (documented only — see BLOCK 3).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- BLOCK 1 — Fix alt_language type (jsonb → text)
-- Strategy: CASE B. The live jsonb column held 3 rows of legacy Gemini OCR
-- result dumps (name/email/phone/... objects) — NOT quoted ISO strings. None
-- of the 3 rows contained a `language` key. Two rows had substantive OCR data
-- with front_ocr IS NULL, so we move the payload to front_ocr before dropping
-- the legacy column. alt_language ends up NULL on all 3 rows (correct — no
-- language code was ever recorded).
--
-- Wrapped in DO block so the migration is idempotent: a re-run on a DB
-- where alt_language is already text is a no-op.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'contacts'
      AND column_name  = 'alt_language'
      AND data_type    = 'jsonb'
  ) THEN
    ALTER TABLE public.contacts RENAME COLUMN alt_language TO alt_language_legacy;
    ALTER TABLE public.contacts ADD COLUMN alt_language text;

    -- Salvage legacy OCR payloads into front_ocr (only when front_ocr is
    -- empty AND the legacy object is non-empty). Empty `{}` contributes
    -- nothing and is skipped.
    UPDATE public.contacts
    SET front_ocr = alt_language_legacy
    WHERE alt_language_legacy IS NOT NULL
      AND alt_language_legacy <> '{}'::jsonb
      AND front_ocr IS NULL;

    -- active_contacts (from 013) used SELECT * and now depends on the
    -- renamed column. Drop and recreate so SELECT * re-binds to the new
    -- column list (with alt_language text instead of jsonb).
    DROP VIEW IF EXISTS public.active_contacts;
    ALTER TABLE public.contacts DROP COLUMN alt_language_legacy;
    CREATE VIEW public.active_contacts
      WITH (security_invoker = true) AS
      SELECT * FROM public.contacts WHERE deleted_at IS NULL;
  END IF;
END$$;

-- -----------------------------------------------------------------------------
-- BLOCK 2 — Document pre-existing live-DB objects (as-found, idempotent)
-- These CREATEs are no-ops on the live DB (the objects already exist). They
-- exist in this file so a fresh environment reproduces the live schema.
-- Structure mirrors what `pg_get_constraintdef` / information_schema reported
-- on 2026-04-14; do not alter without a separate migration.
-- -----------------------------------------------------------------------------

-- Extensions first — the indexes below depend on them.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- full_name: plain text column, not generated.
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS full_name text;

-- pipeline_stage CHECK: restricts to lead/contact/client.
-- Wrapped in DO so re-applying this file does not raise duplicate_object.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contacts_pipeline_stage_check'
      AND conrelid = 'public.contacts'::regclass
  ) THEN
    ALTER TABLE public.contacts
      ADD CONSTRAINT contacts_pipeline_stage_check
      CHECK (pipeline_stage = ANY (ARRAY['lead'::text, 'contact'::text, 'client'::text]));
  END IF;
END$$;

-- Trgm index on contacts.name for fuzzy search.
CREATE INDEX IF NOT EXISTS contacts_name_trgm_idx
  ON public.contacts USING gin (name gin_trgm_ops);

-- contact_embeddings: pgvector semantic search store, one row per contact.
CREATE TABLE IF NOT EXISTS public.contact_embeddings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL UNIQUE REFERENCES public.contacts(id) ON DELETE CASCADE,
  embedding  vector,
  metadata   jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_embeddings_vec
  ON public.contact_embeddings USING hnsw (embedding vector_cosine_ops);

-- Junction tables — all FKs CASCADE on both sides.
CREATE TABLE IF NOT EXISTS public.contact_events (
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  event_id   uuid NOT NULL REFERENCES public.events(id)   ON DELETE CASCADE,
  PRIMARY KEY (contact_id, event_id)
);

CREATE TABLE IF NOT EXISTS public.contact_notes (
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  note_id    uuid NOT NULL REFERENCES public.notes(id)    ON DELETE CASCADE,
  PRIMARY KEY (contact_id, note_id)
);

CREATE TABLE IF NOT EXISTS public.contact_tasks (
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  task_id    uuid NOT NULL REFERENCES public.tasks(id)    ON DELETE CASCADE,
  PRIMARY KEY (contact_id, task_id)
);

-- NOTE: RLS is ENABLED on contact_events / contact_notes / contact_tasks on
-- the live DB, but ZERO policies exist → default-deny for authenticated
-- clients (postgres / service_role still work via bypass). This is safe but
-- makes the tables unusable from the frontend. Adding appropriate ownership
-- policies is out of scope for 013b (structural reconcile only) and is
-- tracked as a follow-up. Suggested policy shape when added later:
--
--   CREATE POLICY "users own junction rows"
--   ON public.contact_events FOR ALL
--   USING (EXISTS (SELECT 1 FROM public.contacts
--                  WHERE id = contact_id AND user_id = auth.uid()))
--   WITH CHECK (EXISTS (SELECT 1 FROM public.contacts
--                       WHERE id = contact_id AND user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- BLOCK 3 — Follow-up: delete the legacy public `contact-cards` bucket
-- -----------------------------------------------------------------------------
-- NOT executed in this migration. The legacy bucket `contact-cards`
-- (singular, public=true) holds 23 objects with paths like
-- `{user_id}/{timestamp}_{hash}.jpg` — a flat one-level layout, NOT the new
-- two-level `{user_id}/{contact_id}/filename` layout that `contacts-cards`
-- (plural) expects.
--
-- A safe cleanup requires (in this order):
--   1. For each object in `contact-cards`, resolve which contact it belongs
--      to (the file path does not encode contact_id — likely needs a join
--      against contacts.avatar_url / front_image_url / back_image_url).
--   2. Copy the object bytes into `contacts-cards/{user_id}/{contact_id}/...`.
--   3. Update the contact rows to point at the new path.
--   4. DELETE FROM storage.objects WHERE bucket_id = 'contact-cards';
--   5. DELETE FROM storage.buckets WHERE id = 'contact-cards';
--   6. DROP POLICY "auth_upload" ON storage.objects;  -- permissive INSERT
-- This is a data migration, not a schema migration. Tracked as Phase D
-- follow-up; do NOT execute until the re-pathing script is written.

-- =============================================================================
-- END 013b_schema_reconcile.sql
-- =============================================================================
