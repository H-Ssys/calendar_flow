---
type: scan-summary
scan_type: full
created: 2026-04-09
---

# Codebase Scan — 2026-04-09

## Project Overview
Flow is a self-hosted productivity platform (calendar, tasks, notes, contacts, journal, AI assistant) built as a Vite + React 18 + TypeScript frontend on self-hosted Supabase, with a FastAPI sidecar for OCR/transcription/RAG. Currently in Phase 4 (FastAPI sidecar buildout); Phase 3 (core data types → Supabase with auth + RLS) is complete. The repo is a pnpm + Turborepo workspace with `src/` frontend, `packages/` shared libs, `flow-api/` Python sidecar, and `supabase/` migrations. An unused `backend/` directory shadows `flow-api/` and should be resolved.

## Directory Map

| Directory | Files | Purpose | Language |
|---|---|---|---|
| `src/` | 146 | Frontend app (Vite + React 18) | TypeScript / TSX |
| `backend/` | 25 | Legacy/duplicate Python backend (see overlap) | Python |
| `flow-api/` | 69 | Canonical FastAPI sidecar (OCR, transcription, RAG) | Python |
| `packages/` | 19 | Shared workspace libs: `shared-types`, `supabase-client`, `ui` | TypeScript |
| `supabase/` | 40 | DB migrations + RLS policies + tests | SQL |
| `e2e/` | 1 | Playwright end-to-end tests | TypeScript |
| `docs/` | 52 | Obsidian vault (`docs/vault/`) — agent intelligence | Markdown |
| `.claude/` | 123 | Agent defs + role skills + pinned skill packs | Markdown |
| `.github/` | 4 | CI / workflow config | YAML |

### `src/` subdirectories
`components/`, `context/`, `hooks/`, `i18n/`, `lib/`, `pages/`, `services/`, `test/`, `types/`, `utils/` + entry files (`App.tsx`, `main.tsx`).

### `packages/` subdirectories
`shared-types/`, `supabase-client/`, `ui/`.

### `supabase/` subdirectories
`migrations/`, `tests/`.

## Architecture Shape
**Hybrid monorepo.** pnpm workspace + Turborepo (`turbo.json`, `pnpm-workspace.yaml`) hosting a single React frontend (`src/`), shared TS packages (`packages/*`), and a Python FastAPI sidecar (`flow-api/`) deployed as an independent Docker container. Not microservices — a monolith frontend + single sidecar talking to self-hosted Supabase. Workspace scaffolding exists but the frontend still lives at root `src/` rather than under `packages/app/` (full Turborepo migration not yet done).

## Duplicate/Overlap Analysis
- **`backend/` vs `flow-api/`** — Both contain `app/`, `Dockerfile`, `requirements.txt`, `tests/`. Per `CLAUDE.md`, `flow-api/` is canonical (deployed as `flow-api` container on port 8001). `backend/` (25 files) appears to be an earlier scaffold that was superseded. **Recommendation:** confirm with git history, then archive or delete `backend/`. Not touched in this scan.
- **`*.frontend.*` config variants at root** (`index.frontend.html`, `vite.frontend.config.ts`, `tailwind.frontend.config.ts`) suggest an in-progress rename/split. Investigate in Step 8.

## Root Files

| File | Purpose | Keep/Remove |
|---|---|---|
| `CLAUDE.md` | Project instructions for Claude Code | Keep |
| `AGENTS.md` | Cross-tool agent rules | Keep |
| `README.md` | Project readme (19 bytes — stub) | Keep, expand |
| `TESTING.md` | Test strategy notes | Keep |
| `package.json` | Workspace root manifest | Keep |
| `pnpm-workspace.yaml` | pnpm workspace definition | Keep |
| `turbo.json` | Turborepo pipeline | Keep |
| `components.json` | shadcn/ui config | Keep |
| `index.frontend.html` | Vite entry (renamed variant) | Review |
| `vite.frontend.config.ts` | Vite config (renamed variant) | Review |
| `tailwind.frontend.config.ts` | Tailwind config (renamed variant) | Review |
| `vitest.config.ts` | Vitest unit-test config | Keep |
| `playwright.config.ts` | E2E test config | Keep |
| `supabase-schema-dump.sql` | 307 KB full schema dump | Keep (reference), exclude from scans |
| `.gitignore` | Git ignore rules | Keep |

## Key Findings
- Monorepo scaffolding is present (pnpm + Turborepo) but the frontend still sits at root `src/`, not inside `packages/`.
- `backend/` duplicates `flow-api/` — canonical is `flow-api/`; `backend/` needs a decision.
- `*.frontend.*` config/entry variants at root suggest an in-flight rename — investigate in Step 8.
- `supabase-schema-dump.sql` is a 307 KB reference artifact; scanners should skip it.
- `.claude/` holds 123 files (agent defs + pinned skill packs) — large but intentional.
- `e2e/` has only 1 file — Playwright setup is minimal and needs expansion.
- `packages/` (19 files across 3 libs) is lightly populated; most shared code still lives under `src/`.

## Scan Progress
- [x] Step 1: Project structure
- [ ] Step 2: Frontend components
- [ ] Step 3: Frontend state (contexts, hooks, services)
- [ ] Step 4: Frontend types + utilities
- [ ] Step 5: Backend (FastAPI endpoints + services)
- [ ] Step 6: Packages (shared-types, supabase-client, UI tokens)
- [ ] Step 7: Database (migrations, RLS, schema)
- [ ] Step 8: Patterns, dependencies, dead code, oversized files
