---
type: scan-summary
scan_type: full
created: 2026-04-09
updated: 2026-04-11
---

# Codebase Scan — Full (8/8 Steps Complete)

## Project Overview

Flow is a self-hosted productivity platform (calendar, tasks, notes, contacts, journal, AI assistant) built as a Vite + React 18 + TypeScript frontend on self-hosted Supabase, with a FastAPI sidecar for OCR/transcription/RAG. Currently in Phase 4 (FastAPI sidecar buildout); Phase 3 (core data types -> Supabase with auth + RLS) is complete.

## Totals

| Category | Count |
|----------|-------|
| Frontend components | 69 (.tsx in src/components/) |
| Pages | 7 (Index, Tasks, Notes, EventTask, Contacts, Auth, Settings) |
| Contexts | 3 (Calendar: 45 consumers, Task: 16, Note: 7) |
| Custom hooks | 9 |
| Services | 5 (task, note, recurrence, dailyJournal, data) |
| Type files | 3 (task.ts, note.ts, dailyJournal.ts) |
| Utility files | 2 (layoutOverlappingEvents, temp_event_helper) |
| v2 Packages | 3 (shared-types, supabase-client, ui) |
| v2 Types (shared-types) | 26 tables, 78 Row/Insert/Update interfaces, 15 union types |
| API endpoints (active) | 5 (health, ready, ocr, detect-card, embed) |
| API endpoints (stub/inactive) | 9 (notes x5, ai x2, email x2, transcribe x1) |
| Backend services | 5 (ai_providers, email, ocr, siyuan_sync, transcription) |
| Database tables | 26 (in migrations) + 2 drifted in live DB |
| RLS policies | 30+ policies, 178 test assertions, 100% coverage |
| Database functions | 5 custom + user_team_ids() helper |
| Database indexes | 37 |
| Architectural patterns | 10 identified |
| Dead code candidates | 25 items (~3,500 removable lines) |
| Oversized files | 7 (>500 lines) |
| localStorage keys | 21 (v1 persistence) |
| i18n locales | 2 (en, vi) |
| Design tokens | 7 color scales, 8 font sizes, 14 spacing values |

## Directory Map

| Directory | Files | Purpose |
|-----------|-------|---------|
| `src/` | 146 | Frontend app (Vite + React 18 + TypeScript) |
| `flow-api/` | 69 | Canonical FastAPI sidecar (OCR, embeddings, health) |
| `backend/` | 25 | DEAD — older scaffold, delete |
| `packages/` | 19 | shared-types, supabase-client, ui tokens |
| `supabase/` | 40 | 8 migrations + 30 RLS tests |
| `docs/vault/` | 33+ | Agent intelligence vault |
| `.claude/` | 123 | Agent defs + skills |

## Scan Progress

- [x] Step 1: Project structure map
- [x] Step 2: Frontend [[components]] registry
- [x] Step 3: [[contexts]], [[hooks]], [[services]] registry
- [x] Step 4: [[types]], [[utilities]], pages, [[config]] registry
- [x] Step 5: Backend registry (flow-api + backend overlap analysis)
- [x] Step 6: Shared packages + v1 vs v2 gap analysis
- [x] Step 7: Database registry (migrations, RLS, schema drift)
- [x] Step 8: Patterns, dependencies, dead code, oversized files

## Key Findings

### Architecture
1. **v1/v2 split**: Frontend runs entirely on localStorage (v1). Supabase schema + v2 packages ready but zero pages wired to them.
2. **CalendarContext is a god object**: 640 lines, 45 consumers, mixes events + settings + view state. Highest-priority refactor target.
3. **3 v2 packages built but disconnected**: shared-types, supabase-client, ui tokens — none imported by src/.
4. **`backend/` is dead**: Never executed, superseded by flow-api/. Safe to delete.

### Database
5. **Schema drift**: 2 tables in live DB (`daily_journals`, `user_settings`) not in migration files.
6. **100% RLS test coverage**: 30 test files, 178 assertions. Strong security posture.
7. **pgvector enabled**: HNSW index on contact_embeddings for vector search.

### Code Quality
8. **7 oversized files**: DailyJournalView (1,324 lines) and CalendarContext (640) are top split targets.
9. **25 dead code items**: ~3,500 removable lines across dead backend, unused configs, unimported settings.
10. **10 patterns identified**: Context+Provider, localStorage, Supabase client, switchable providers, PDCA, DnD, recurrence, cross-linking, keyboard shortcuts, i18n.

---

## Next Actions (Prioritized)

### P0 — Blockers (before any feature work)

1. **Delete `backend/`** — Confirmed dead, causes confusion with flow-api/
2. **Resolve duplicate vault roots** — Root numbered folders duplicate docs/vault/
3. **Fix schema drift** — Add migration 009 for `daily_journals` and `user_settings` or drop them

### P1 — High Impact Refactors

4. **Split CalendarContext** (640 lines, 45 consumers) into EventContext + CalendarSettingsContext + CalendarViewContext
5. **Split DailyJournalView** (1,324 lines) into 6 subcomponents + hook
6. **Wire v2 packages to src/** — Import @ofative/shared-types, connect useAuth, build first CRUD hook (useTasks recommended)

### P2 — Clean Code

7. **Delete dead code** — temp_event_helper, *.frontend.* configs, ocr_service.py, 4 unimported settings (~1,300 lines)
8. **Split AddEventForm** (652 lines) — Extract field groups and form hook
9. **Wire @ofative/ui tokens** — Import Tailwind preset, replace inline values

### P3 — Migration (multi-sprint)

10. **Build v2 CRUD hooks**: useTasks, useNotes, useEvents, useJournal, useContacts — each wrapping useRealtimeQuery
11. **Create v1->v2 adapter**: Status enum rename (in-progress->in_progress, urgent->critical), Date<->string, inline arrays -> junction tables
12. **Phase out localStorage contexts** — Wire pages to v2 hooks, use id_mapping table for migration
13. **SiYuan cleanup** — Remove references after TipTap editor ships

---

## Contacts Module

Pre-namecard-OCR scan (2026-04-14) of `src/context/ContactContext.tsx`, `src/types/contact.ts`, and `src/components/contacts/{ContactDetail,NewContactForm,ScanCardForm,BatchUploadForm}.tsx` (4 components, 995 lines total; ContactDetail at 435 is the largest and approaches the 500-line ceiling). The module has **no persistence layer at all** — `ContactContext` initialises from a hard-coded `MOCK_CONTACTS` array and stores everything in `useState`, so contacts vanish on reload (no Supabase wiring, no localStorage, no `user_id` on the `Contact` type even though `public.contacts` requires one). Both OCR-facing forms (`ScanCardForm.handleExtract`, `BatchUploadForm.handleExtractAll`) are stubbed with `setTimeout` + hard-coded payloads and need to be wired to `flow-api`'s `/detect-card` + `/ocr` endpoints; `NewContactForm.prefill: Partial<Contact>` is the existing hand-off seam. Card images are stored as base64 data URLs throughout — a bloat risk before any Supabase write. The two latest migrations (011_note_metadata, 012_journal_focus_metadata) do **not** touch contacts; the canonical `public.contacts` table lives in `001_core_tables.sql` and has no OCR-specific columns yet. Full per-file breakdown in [[contacts-module]].

## Related

- Registry: [[components]] · [[contexts]] · [[hooks]] · [[services]] · [[types]] · [[utilities]] · [[config]] · [[api-endpoints]] · [[supabase-tables]] · [[shared-packages]] · [[patterns]] · [[contacts-module]]
- Architecture: [[dependency-map]] · [[dead-code-candidates]] · [[oversized-files]] · [[vault-health]]
- ADR: [[adr-010-dual-mode-migration]]
- Sync: [[workflow-state]]
