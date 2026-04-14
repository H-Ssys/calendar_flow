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

[1a] contact_references INSERT RLS (cross-user linkage blocked): **FAIL** — ADR-023's `contact_references` has NO `user_id` column, only `(source_contact_id, target_contact_id, label, created_at)`. The `user_id = auth.uid()` pattern in the prompt cannot be applied literally. Migration 013 MUST use an EXISTS-based policy on both contact IDs instead (see Blockers §1).
[1b] contact_references SELECT RLS (cross-user read blocked): **FAIL** — same root cause; USING policy must EXISTS-join through `contacts.user_id` for both source and target.
[1c] contact_references WITH CHECK on user_id: **N/A** — no user_id column to check; replaced by EXISTS requirement in §1 Blocker.

[2] contact_companies RLS: **N/A** — table is not part of migration 013. Not in ADR-023, not in contract.md. Out of scope for this audit; re-audit if added later.

[3a] contact_tag_definitions RLS: **N/A** — table not in 013 plan.
[3b] contact_tag_assignments RLS: **N/A** — table not in 013 plan.

[4a] contact_interactions RLS: **N/A** — table not in 013 plan. `last_contacted_at` on `contacts` is present but is a plain timestamptz column, not populated by a trigger in the current 013 plan.
[4b] last_contacted_at trigger ownership: **N/A** — no trigger planned. If added later: prefer SECURITY INVOKER so RLS on `contacts` applies; SECURITY DEFINER would let a shared trigger function write any user's row if a path to it existed.

[5a] active_contacts view WITH (security_invoker = true): **PASS** — ADR-023 specifies it; RLS on underlying `contacts` will apply to the caller, not the view owner.
[5b] PostgreSQL >= 15 on VPS: **WARN** — must be verified in Studio. Run `SELECT version();` at http://187.77.154.212:54322 before A5. Self-hosted Supabase images have shipped pg15 since late 2023; likely PASS but not confirmed from this context. If pg14, `security_invoker` syntax fails and the view must be rewritten as a `SECURITY INVOKER` function or the RLS duplicated.

[6a] search_text direct writes from frontend/backend: **PASS** — `grep -rn "search_text" src/ flow-api/ backend/` returned zero matches. PostgreSQL will also reject any UPDATE attempt on a GENERATED ALWAYS column at the engine level as a secondary guard.
[6b] GENERATED ALWAYS engine-level protection: **PASS** — documented PostgreSQL behavior; no RLS policy needed for this column.

[7a] CHECK (source_contact_id < target_contact_id): **PASS** — ADR-023 includes it; application-side sort requirement is stated in contract.md §"DB constraints" item 3.
[7b] Cross-user UUID-guessing attack on contact_references: **CONDITIONAL PASS** — only safe IF the EXISTS-based RLS from §1 is implemented. The CHECK constraint alone does not block cross-user links. Marked PASS once Blocker §1 is resolved.

[8a] contacts-cards bucket RLS uses `(storage.foldername(name))[1] = auth.uid()::text`: **WARN** — pattern is correct but the bucket does not exist yet (A6). No existing storage migrations in `supabase/migrations/` reference `storage.foldername` — this is the first use in the project. `storage.foldername()` ships with Supabase Storage by default; verify in Studio before A6 with `SELECT storage.foldername('x/y/z.jpg');`.
[8b] Path traversal / cross-user upload: **PASS (by design)** — policy hard-pins `foldername[1]` to `auth.uid()::text`, so a user cannot upload to another user's folder regardless of client-supplied path. Must be applied to INSERT, UPDATE, SELECT, and DELETE policies.

[9] GEMINI_API_KEY exposure: **PASS** — `grep -rn "GEMINI_API_KEY\|gemini.*api.*key" src/ flow-api/ backend/` returned zero matches. No code references the key yet (Phase B hasn't started). Re-audit in B3 when `flow-api` actually loads the key; confirm it is read via `os.getenv("GEMINI_API_KEY")` only and never prefixed with `VITE_`.

## Blockers (FAIL items — must fix before A5)

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

- [5b] Confirm `SELECT version();` returns pg15+ in Studio before running 013.
  If pg14, rewrite the `active_contacts` view or upgrade.
- [8a] Confirm `storage.foldername()` works in Studio before A6
  (`SELECT storage.foldername('u/c/front.jpg');` should return `{u,c}`).
- [7b] Conditional PASS — becomes unconditional PASS once Blocker §1 lands.
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

## Decision

**Do NOT proceed to A5 yet.** One FAIL item (Blocker §1) must land in
migration 013's SQL draft. Once that EXISTS-based policy set is written
and the two WARNs (pg version, storage.foldername availability) are
verified in Studio, A5 is clear.
