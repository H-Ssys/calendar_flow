# Flow Platform — Cross-Tool Agent Rules

This file is read by Claude Code AND Antigravity. Keep it concise.

## Project Structure
- Source code: src/
- Obsidian vault: docs/vault/
- Agent definitions: .claude/agents/ (5 files)
- Role skills: .claude/skills/roles/ (13 files)
- External skills: .claude/skills/{name}/ (8 directories)
- VAULT_ROOT = docs/vault/

## Code Registry (CHECK BEFORE CODING)
Before building anything new, check:
- docs/vault/03-architecture/code-registry/components.md
- docs/vault/03-architecture/code-registry/hooks.md
- docs/vault/03-architecture/code-registry/services.md
- docs/vault/03-architecture/code-registry/patterns.md
- docs/vault/03-architecture/code-registry/utilities.md

Duplicating existing code is a failure.

## Design System
Read from: docs/vault/06-design/system.md
- shadcn/ui (Radix primitives) — don't reinvent
- Tailwind CSS utility classes
- 8px spacing grid
- Mobile: 375px, 768px, 1024px breakpoints

## UI Rules
1. Components < 500 lines — split if larger
2. Handle three states: loading, error, empty
3. TypeScript strict mode, no any
4. All user inputs validated before API calls

## Security Rules
1. No VITE_ secrets — ever
2. RLS on every table — no exceptions
3. All API endpoints validate JWT
4. Switchable provider pattern via env vars (OCR_PROVIDER, EMBEDDING_PROVIDER, LLM_PROVIDER)

## Agent Workflows
- 12-step feature: Scanner → Strategist → Planner → Architect → Manager → Designer → Backend → Frontend → Integrator → QA+Security → Release → Docs
- 5-step shortcut (<200 lines, ≤2 modules): Scanner → Plan → Implement → QA → Ship
- 5-step bugfix: Scanner → Debug → Fix → QA → Ship
- 4-step phase complete: Full Scan → Refactor → QA → Docs

## File Ownership
| Location | Writes to vault |
|----------|----------------|
| Claude Code agents | 02-features/, 03-architecture/, 04-engineering/, 05-bugs/, 07-security/, 08-releases/, 10-sync/, 11-cost-tracking/, 12-session-resume/ |
| Human (Obsidian) | 00-inbox/, 01-product/, 06-design/, 09-decisions/, templates/ |
