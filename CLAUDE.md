---
# CLAUDE.md — Ofative Calendar Platform v2.0

## What This Project Is
A productivity platform (calendar, tasks, notes, contacts, teams, AI)
built as a modular Turborepo monorepo with self-hosted Supabase.
Architecture score: 92/100. Plan version: v9. All R1–R4 audit fixes confirmed.

## BEFORE STARTING ANY TASK — Read These Files
1. C:\Users\quang\.gemini\antigravity\brain\c35d353b-f33d-44b7-824b-154018597138\MASTER.md
2. Same folder: AGENT_RULES.md
3. Same folder: state\phase-0.md (current phase progress)
4. Same folder: handoffs\ (what other agents have completed)

## Current Phase
Phase 0 — Schema & Migration Prep

## Architecture Rules (Non-Negotiable)
- Browser → Supabase SDK for all CRUD (JWT + RLS)
- Browser → FastAPI /api/v1/* for notes, AI, OCR, transcription
- FastAPI → SiYuan for note operations (SIYUAN_TOKEN server-side only — NEVER in browser)
- Realtime: useRealtimeQuery hook ONLY (packages/supabase-client)
- Channel names must be 'rt-{table}-{filter}' — prevents collision bugs

## File Ownership
- db-agent owns:        supabase/migrations/, supabase/functions/, supabase/tests/
- frontend-agent owns:  calendar-main/src/, packages/supabase-client/, packages/shared-types/
- ui-agent owns:        packages/ui/, locales/
- backend-agent owns:   backend/
- testing-agent owns:   e2e/, vitest.config.ts, playwright.config.ts, pytest.ini
- devops-agent owns:    docker-compose.yml, .github/workflows/, Caddyfile

## Source of Truth Files
Schema:       E:\Calendar Platform\master_doc\schema.md
Architecture: E:\Calendar Platform\master_doc\implementation_plan.md
API spec:     E:\Calendar Platform\master_doc\api_specification.md
Build guide:  E:\Calendar Platform\master_doc\ofative_v2_audit_r5_build_strategy.md

## Commands
pnpm turbo run build          → Build all packages
pnpm turbo run test           → Run affected tests only
supabase start                → Start local Supabase
supabase db push              → Apply pending migrations
supabase test                 → Run RLS policy SQL tests
docker-compose up -d          → Start full stack

## Hard Rules
- TypeScript strict mode — no any types — write the interface
- pnpm only — never npm or yarn
- Every service function → Vitest test in same session
- Migrations are append-only — never edit an applied file
- VITE_ prefix = bundled to client — only use for SUPABASE_URL + ANON_KEY
---
