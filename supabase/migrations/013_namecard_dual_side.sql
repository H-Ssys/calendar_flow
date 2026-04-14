-- =============================================================================
-- Migration 013 — Namecard OCR: dual-side contacts schema
-- =============================================================================
-- Authoritative spec:
--   docs/vault/03-architecture/adr/adr-023-dual-side-contacts-schema.md
--   docs/vault/02-features/namecard-ocr/contract.md
-- Pre-audit: docs/vault/07-security/audits/namecard-ocr-pre-migration.md
--
-- The base `contacts` table ships in 001_core_tables.sql with RLS enabled
-- and base policies in 006_rls_policies.sql. This migration ADDs columns
-- and new sibling tables only — it never re-creates `contacts`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- BLOCK 1 — contact_companies
-- Must exist before BLOCK 2 because contacts.company_id FKs into it.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_companies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  domain     text,
  industry   text,
  logo_url   text,
  website    text,
  address    text,
  notes      text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.contact_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users own companies" ON public.contact_companies;
CREATE POLICY "users own companies" ON public.contact_companies
  FOR ALL
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- BLOCK 2 — ALTER TABLE contacts: add new columns
-- user_id, front_image_url, back_image_url already exist (001); skip those.
-- `back_image_url` listed below is defensive (IF NOT EXISTS is a no-op).
-- -----------------------------------------------------------------------------
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS back_image_url    text,
  ADD COLUMN IF NOT EXISTS front_ocr         jsonb,
  ADD COLUMN IF NOT EXISTS back_ocr          jsonb,
  ADD COLUMN IF NOT EXISTS alt_language      text,
  ADD COLUMN IF NOT EXISTS socials           jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS phones            jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS birthday          date,
  ADD COLUMN IF NOT EXISTS anniversary       date,
  ADD COLUMN IF NOT EXISTS bio               text,
  ADD COLUMN IF NOT EXISTS pipeline_stage    text DEFAULT 'contact',
  ADD COLUMN IF NOT EXISTS source            text,
  ADD COLUMN IF NOT EXISTS preferred_contact text,
  ADD COLUMN IF NOT EXISTS timezone          text,
  ADD COLUMN IF NOT EXISTS company_id        uuid REFERENCES public.contact_companies(id)
                                               ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at        timestamptz,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;

-- -----------------------------------------------------------------------------
-- BLOCK 3 — Drop the old fts column (Option A from ADR-023)
-- Zero frontend/backend callers reference `contacts.fts` today (grep verified).
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_contacts_fts;
ALTER TABLE public.contacts DROP COLUMN IF EXISTS fts;

-- -----------------------------------------------------------------------------
-- BLOCK 4 — New search columns
-- `search_text`: GENERATED — own row only, no cross-table data possible.
-- `reference_search_text`: plain tsvector, maintained by BLOCK 7 trigger.
-- `'simple'` config chosen over `'english'` because OCR is multilingual.
-- -----------------------------------------------------------------------------
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS search_text tsvector
    GENERATED ALWAYS AS (
      to_tsvector('simple',
        coalesce(name,                   '') || ' ' ||
        coalesce(company,                '') || ' ' ||
        coalesce(title,                  '') || ' ' ||
        coalesce(email,                  '') || ' ' ||
        coalesce(bio,                    '') || ' ' ||
        coalesce(front_ocr->>'raw_text', '') || ' ' ||
        coalesce(back_ocr->>'raw_text',  '')
      )
    ) STORED;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS reference_search_text tsvector;

CREATE INDEX IF NOT EXISTS contacts_search_idx
  ON public.contacts USING gin(search_text);

CREATE INDEX IF NOT EXISTS contacts_ref_search_idx
  ON public.contacts USING gin(reference_search_text);

-- -----------------------------------------------------------------------------
-- BLOCK 5 — active_contacts view
-- security_invoker = true verified on PG 15.8 (A4 audit).
-- Callers must use active_contacts instead of contacts to honor soft delete.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.active_contacts
  WITH (security_invoker = true) AS
  SELECT * FROM public.contacts WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- BLOCK 6 — contact_references
-- CHECK (source_contact_id < target_contact_id) keeps one canonical row per
-- pair so (A,B) and (B,A) cannot both exist. Application code MUST sort
-- IDs before INSERT.
--
-- RLS uses EXISTS-based double-join (no user_id column on this table).
-- Both sides required: single-side check would let User A link their own
-- contact to User B's. Both USING and WITH CHECK required: USING alone
-- does not block INSERT.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_references (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  target_contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  reference_label   text,
  created_at        timestamptz DEFAULT now(),
  CONSTRAINT canonical_direction
    CHECK (source_contact_id < target_contact_id),
  UNIQUE (source_contact_id, target_contact_id)
);

ALTER TABLE public.contact_references ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users own both sides of reference" ON public.contact_references;
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

-- Bidirectional view: one stored row, both contacts see the relationship.
CREATE OR REPLACE VIEW public.contact_reference_pairs AS
  SELECT source_contact_id AS contact_id,
         target_contact_id AS ref_id,
         reference_label
  FROM public.contact_references
  UNION ALL
  SELECT target_contact_id AS contact_id,
         source_contact_id AS ref_id,
         reference_label
  FROM public.contact_references;

-- -----------------------------------------------------------------------------
-- BLOCK 7 — Trigger: maintain reference_search_text
-- Recomputes for both endpoints on every INSERT/UPDATE/DELETE of a reference.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_reference_search_text()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  affected_ids uuid[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_ids := ARRAY[OLD.source_contact_id, OLD.target_contact_id];
  ELSE
    affected_ids := ARRAY[NEW.source_contact_id, NEW.target_contact_id];
  END IF;

  UPDATE public.contacts c
  SET reference_search_text = (
    SELECT to_tsvector('simple',
             string_agg(coalesce(rc.name, ''), ' '))
    FROM public.contact_reference_pairs crp
    JOIN public.contacts rc ON rc.id = crp.ref_id
    WHERE crp.contact_id = c.id
  )
  WHERE c.id = ANY(affected_ids);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_reference_search ON public.contact_references;
CREATE TRIGGER trg_reference_search
  AFTER INSERT OR UPDATE OR DELETE ON public.contact_references
  FOR EACH ROW EXECUTE FUNCTION public.update_reference_search_text();

-- -----------------------------------------------------------------------------
-- BLOCK 8 — contact_interactions + last_contacted_at trigger
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_interactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  contact_id  uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  type        text NOT NULL
                CHECK (type IN ('event','task','note','call','email','meeting')),
  ref_id      uuid,
  summary     text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.contact_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users own interactions" ON public.contact_interactions;
CREATE POLICY "users own interactions" ON public.contact_interactions
  FOR ALL
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS contact_interactions_contact_idx
  ON public.contact_interactions(contact_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.sync_last_contacted()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.contacts
  SET last_contacted_at = NEW.occurred_at
  WHERE id = NEW.contact_id
    AND (last_contacted_at IS NULL
         OR last_contacted_at < NEW.occurred_at);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_last_contacted ON public.contact_interactions;
CREATE TRIGGER trg_last_contacted
  AFTER INSERT ON public.contact_interactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_last_contacted();

-- =============================================================================
-- END 013_namecard_dual_side.sql
-- =============================================================================
