---
type: security-audit
phase: A4 pre-migration
feature: namecard-ocr
migration: 013_namecard_dual_side.sql
date: 2026-04-14
auditor: Security Officer (role switch)
---

# Namecard OCR — pre-migration security audit

Scope: verify the schema planned in ADR-023 + contract.md before
migration 013 is written. Zero FAIL items required to proceed to A5.

## Findings

[FIXED §1] contact_references RLS: **FIXED** — ADR-023 now specifies an EXISTS-based double-join policy with both `USING` and `WITH CHECK` clauses. User A cannot link to User B's contact: both `source_contact_id` AND `target_contact_id` must belong to `auth.uid()` via `contacts.user_id`, otherwise the INSERT is rejected.
[1a] contact_references INSERT RLS (cross-user linkage blocked): **PASS** — double EXISTS in `WITH CHECK` blocks cross-user INSERT.
[1b] contact_references SELECT RLS (cross-user read blocked): **PASS** — double EXISTS in `USING` blocks cross-user SELECT/UPDATE/DELETE.
[1c] contact_references WITH CHECK coverage: **PASS** — `WITH CHECK` mirrors `USING`; USING alone would not block INSERTs.

[2] contact_companies RLS: **N/A** — table is not part of migration 013. Not in ADR-023, not in contract.md. Out of scope for this audit; re-audit if added later.

[3a] contact_tag_definitions RLS: **N/A** — table not in 013 plan.
[3b] contact_tag_assignments RLS: **N/A** — table not in 013 plan.

[4a] contact_interactions RLS: **N/A** — table not in 013 plan. `last_contacted_at` on `contacts` is present but is a plain timestamptz column, not populated by a trigger in the current 013 plan.
[4b] last_contacted_at trigger ownership: **N/A** — no trigger planned. If added later: prefer SECURITY INVOKER so RLS on `contacts` applies; SECURITY DEFINER would let a shared trigger function write any user's row if a path to it existed.

[5a] active_contacts view WITH (security_invoker = true): **PASS** — ADR-023 specifies it; RLS on underlying `contacts` will apply to the caller, not the view owner.
[5b] PostgreSQL >= 15 on VPS: **PASS** — verified via `docker exec supabase-db-k14ezjygmt5klmcegmnex0h8 psql -U postgres -c "SELECT version();"` → `PostgreSQL 15.8 on x86_64-pc-linux-gnu`. `security_invoker` view syntax is supported.
[WARN §5b RESULT]: PostgreSQL 15.8 — security_invoker: YES.

[6a] search_text direct writes from frontend/backend: **PASS** — `grep -rn "search_text" src/ flow-api/ backend/` returned zero matches. PostgreSQL will also reject any UPDATE attempt on a GENERATED ALWAYS column at the engine level as a secondary guard.
[6b] GENERATED ALWAYS engine-level protection: **PASS** — documented PostgreSQL behavior; no RLS policy needed for this column.

[7a] CHECK (source_contact_id < target_contact_id): **PASS** — ADR-023 includes it; application-side sort requirement is stated in contract.md §"DB constraints" item 3.
[7b] Cross-user UUID-guessing attack on contact_references: **CONDITIONAL PASS** — only safe IF the EXISTS-based RLS from §1 is implemented. The CHECK constraint alone does not block cross-user links. Marked PASS once Blocker §1 is resolved.

[8a] contacts-cards bucket RLS uses `(storage.foldername(name))[1] = auth.uid()::text`: **PASS** — verified via `docker exec supabase-db-... psql -c "SELECT storage.foldername('user-uuid/contact-uuid/front.jpg');"` → `{user-uuid, contact-uuid}`. Function is available; `[1]` (1-based) returns the user UUID segment.
[WARN §8a RESULT]: foldername() available: YES. Returns only directory segments (not the filename), so `{user-uuid, contact-uuid}`. No fallback needed; `split_part(name, '/', 1)` alternative is documented here in case a future Supabase Storage upgrade changes the function shape.
[8b] Path traversal / cross-user upload: **PASS (by design)** — policy hard-pins `foldername[1]` to `auth.uid()::text`, so a user cannot upload to another user's folder regardless of client-supplied path. Must be applied to INSERT, UPDATE, SELECT, and DELETE policies.

[9] GEMINI_API_KEY exposure: **PASS** — `grep -rn "GEMINI_API_KEY\|gemini.*api.*key" src/ flow-api/ backend/` returned zero matches. No code references the key yet (Phase B hasn't started). Re-audit in B3 when `flow-api` actually loads the key; confirm it is read via `os.getenv("GEMINI_API_KEY")` only and never prefixed with `VITE_`.

## Blockers (FAIL items — must fix before A5)

**None remaining.** The single original FAIL has been fixed in ADR-023
(see "contact_references RLS" subsection and "Security correction
(post-audit A4)" section). Original blocker retained below for historical
context.

### [RESOLVED] Original Blocker §1
1. **`contact_references` RLS must be redesigned around EXISTS, not `user_id = auth.uid()`.**
   The table has no user_id column. Migration 013 must ship these policies (or equivalent):
   ```sql
   ALTER TABLE public.contact_references ENABLE ROW LEVEL SECURITY;

   CREATE POLICY contact_references_select ON public.contact_references
     FOR SELECT USING (
       EXISTS (SELECT 1 FROM public.contacts c
               WHERE c.id = source_contact_id AND c.user_id = auth.uid())
       AND
       EXISTS (SELECT 1 FROM public.contacts c
               WHERE c.id = target_contact_id AND c.user_id = auth.uid())
     );

   CREATE POLICY contact_references_insert ON public.contact_references
     FOR INSERT WITH CHECK (
       EXISTS (SELECT 1 FROM public.contacts c
               WHERE c.id = source_contact_id AND c.user_id = auth.uid())
       AND
       EXISTS (SELECT 1 FROM public.contacts c
               WHERE c.id = target_contact_id AND c.user_id = auth.uid())
     );

   CREATE POLICY contact_references_delete ON public.contact_references
     FOR DELETE USING (
       EXISTS (SELECT 1 FROM public.contacts c
               WHERE c.id = source_contact_id AND c.user_id = auth.uid())
     );
   ```
   Both source AND target must belong to the caller. Dropping either EXISTS
   would let User A link their own contact to User B's contact.

## Warnings (WARN items — address in A5 SQL or note for later)

- [5b] **RESOLVED** — PostgreSQL 15.8 confirmed on VPS; `security_invoker` supported.
- [8a] **RESOLVED** — `storage.foldername()` confirmed working on VPS.
- [7b] **RESOLVED** — Blocker §1 landed; now unconditional PASS.
- [4b] If A5 or a future migration adds a `last_contacted_at` trigger, default
  to SECURITY INVOKER. Do not use SECURITY DEFINER without a matching RLS review.
- [9] Re-audit GEMINI_API_KEY usage during Phase B3 when flow-api loads it.

## Confirmed safe (PASS items)

- [5a] active_contacts view uses `security_invoker = true`.
- [6a] No frontend/backend code writes `search_text`.
- [6b] GENERATED ALWAYS columns cannot be manually UPDATEd at engine level.
- [7a] CHECK (source_contact_id < target_contact_id) present + sort rule in contract.
- [8b] Bucket policy pins folder[1] to auth.uid() — path traversal not possible.
- [9] No hardcoded Gemini API key anywhere in the repo today.

## D0-pre Addendum — 2026-04-17

**Legacy `contact-cards` bucket (singular, public):** PENDING DELETION

Checked during D0-pre gate:
- 23 objects remain in `storage.objects WHERE bucket_id = 'contact-cards'`
- 2 contacts (JAY KIM `919f87a3`, Lee Jae Hyun `9c81887e`) have `front_image_url`
  and `back_image_url` pointing to this bucket — cannot delete until URLs are
  migrated or NULLed
- Remaining 21 objects are orphaned test files with no contact linkage
- Bucket deletion deferred to D-phase; not a hard blocker for feature development

**Schema drift capture:** Migration `014_schema_drift_capture.sql` added —
`daily_journals` and `user_settings` tables existed in DB without migration
coverage. Both now documented with RLS. Applied 2026-04-17.

---

## Decision

**A5 is CLEAR to proceed.** The single FAIL has been fixed in ADR-023
(EXISTS-based double-join RLS on `contact_references`, both USING and
WITH CHECK). The two WARNs have been verified on the VPS Supabase
instance (PG 15.8, `storage.foldername()` available). No remaining
blockers. Only follow-up items are forward-looking: re-audit Gemini key
loading in B3, and prefer SECURITY INVOKER for any future trigger
functions on `contacts`.
