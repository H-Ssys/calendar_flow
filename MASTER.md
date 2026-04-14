# Flow Platform — Master Status

Top-level rollup of phase completion across all features.
Detailed status, plans, and audits live under `docs/vault/`.

## namecard-ocr feature

### Phase A — namecard-ocr database — COMPLETE 2026-04-14
All migrations applied, storage buckets created and isolated,
5/5 QA checks passed. Phase B cleared to start.

Artifacts:
- ADR-023 (dual-side contacts schema): `docs/vault/03-architecture/adr/adr-023-dual-side-contacts-schema.md`
- ADR-024 (react-advanced-cropper): `docs/vault/03-architecture/adr/adr-024-react-advanced-cropper.md`
- Pre-migration audit: `docs/vault/07-security/audits/namecard-ocr-pre-migration.md`
- Migration 013 (dual-side schema): `supabase/migrations/013_namecard_dual_side.sql`
- Migration 013b (drift reconcile + alt_language fix): `supabase/migrations/013b_schema_reconcile.sql`
- A7 QA gate (PASS 5/5): `docs/vault/07-security/audits/phase-a-qa-results.md`

Storage:
- `contacts-cards` (private, 2MB, image/jpeg|png|webp) + folder-pinned RLS
- `contact-avatars` (private, 1MB, image/jpeg|png|webp) + folder-pinned RLS
- Cross-user isolation verified (5/5 RLS sims pass)

Carry-forward (non-blocking):
- contact_events/notes/tasks RLS policies (junction tables have RLS enabled,
  zero policies — default-deny; safe but unusable from clients)
- Legacy public `contact-cards` (singular) bucket cleanup — 23 objects need
  re-pathing before bucket drop
- Re-audit `GEMINI_API_KEY` loading during B3
