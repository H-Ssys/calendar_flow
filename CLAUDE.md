# Flow Platform

## Project Overview
- Flow (formerly Ofative/Calendar Flow) is a self-hosted productivity platform
- Combines: calendar, tasks, notes, contacts, daily journal, AI assistant
- This is the main project repo containing frontend + vault + agent system

## Directory Structure
```
/home/flow/calendar-main/
├── src/                          # Frontend (Vite + React 18 + TypeScript)
├── supabase/                     # Migrations + RLS policies
├── flow-api/                     # FastAPI sidecar (OCR, transcription, RAG)
├── flow-rag-mcp/                 # MCP server for RAG (future)
├── docs/vault/                   # Obsidian vault (synced via Git to locals)
├── .claude/
│   ├── agents/                   # 5 agent definitions (orchestrator + 4 subagents)
│   └── skills/
│       ├── roles/                # 13 role skill files for orchestrator
│       ├── superpowers-/         # Pinned: obra/superpowers (6 skills)
│       ├── vercel-react-/        # Pinned: vercel-labs/agent-skills
│       └── grill-me/             # Pinned: mattpocock/skills
├── CLAUDE.md                     # This file
├── AGENTS.md                     # Cross-tool rules
└── package.json
```

## Tech Stack
- Frontend: Vite + React 18 + TypeScript, shadcn/ui, Tailwind CSS, date-fns, Lucide React
- Backend: Self-hosted Supabase (PostgreSQL + Auth + Realtime + Storage), FastAPI, Celery + Redis
- Vector search: pgvector with HNSW indexing
- AI providers: DeepSeek-V3 (OCR), OpenAI (embeddings), Gemini, Deepgram (transcription)
- Editor: TipTap (MIT licensed) — replacing SiYuan
- Build: pnpm, Turborepo monorepo (planned)

## Infrastructure
- VPS: 187.77.154.212 (Ubuntu 24.04, 16 GB RAM)
- Coolify v4.0.0-beta.470 (container orchestration)
- App container: calendar_flow (nginx serving dist/)
- FastAPI container: flow-api (port 8001)
- Supabase: 15 containers, Studio at http://187.77.154.212:54322
- App URL: http://app.187.77.154.212.sslip.io
- Secrets: /home/flow/.flow.env (NEVER commit)

## Deploy Commands (VPS-first, no scp)
```bash
# Frontend
pnpm build
docker cp dist/. calendar_flow:/usr/share/nginx/html/
docker exec calendar_flow nginx -s reload

# FastAPI
cd flow-api && docker build -t flow-api:vN .
docker stop flow-api && docker rm flow-api
docker run -d --name flow-api -p 8001:8001 --env-file /home/flow/.flow.env --network flow-network flow-api:vN

# After deploy
git add -A && git commit -m "Deploy: description" && git push
```

## Agent System
- 17 agents total: 1 orchestrator + 13 role switches + 4 subagents (Backend/Frontend/Release/Refactor)
- Orchestrator coordinates via hybrid model: role switches for planning/review, subagents for code writing
- All vault operations use VAULT_ROOT = docs/vault/
- Workflow state tracked at docs/vault/10-sync/workflow-state.md
- Session resumes at docs/vault/12-session-resume/

## Security Rules (NON-NEGOTIABLE)
1. Never expose secrets via VITE_ prefixed env vars
2. All Supabase tables MUST have RLS policies filtering by auth.uid()
3. User isolation enforced at both PostgreSQL (RLS) and API (filter_user_id) layers
4. No AGPL/GPL code reuse — build owned implementations
5. Secrets only in /home/flow/.flow.env, never in code

## Current Phase Status
- Phase 3 complete: Core data types wired to Supabase with auth + RLS
- Phase 4 in progress: FastAPI sidecar (OCR pipeline)
- Agent system: Setting up (this is what we're building now)

## Vault Convention
- VAULT_ROOT = docs/vault/ (relative to project root)
- Agents read vault notes instead of raw source files (token efficiency)
- Code registry at docs/vault/03-architecture/code-registry/
- Templates at docs/vault/templates/
