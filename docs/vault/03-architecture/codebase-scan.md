---
type: scan-summary
scan_type: full
created: 2026-04-09
scope: entire project (first scan)
---

# Codebase Scan — 2026-04-09 (FIRST SCAN)

## Summary
- **Files scanned**: 130 (vault + agent system)
- **Source files (src/)**: 0 — no frontend code yet
- **FastAPI files (flow-api/)**: 0 — not yet created
- **Supabase migrations**: 0 — not yet created
- **Components**: 0
- **Hooks**: 0
- **Services**: 0
- **Types**: 0
- **Agent definitions**: 5 (orchestrator + 4 subagents)
- **Role skills**: 13
- **External skills**: 8 (6 superpowers, 1 vercel-react, 1 grill-me)
- **Vault templates**: 14
- **Dead code candidates**: 0 (no source code)
- **Oversized files (>500 lines)**: 0
- **New patterns detected**: hybrid orchestrator (role-switch + subagent dispatch)

## Project State
This is the **first-ever scan** of the Flow VPS workspace. The project currently contains:
1. **Obsidian vault** (root-level numbered folders 00-12 + templates/)
2. **Agent system** (.claude/agents/, .claude/skills/)
3. **Cross-tool config** (CLAUDE.md, AGENTS.md, .claude/settings.json)

There is **no application source code yet** — no `src/`, no `package.json`, no `flow-api/`, no `supabase/migrations/`. The repo is currently in its bootstrap phase: vault + agent infrastructure only.

## ⚠ CRITICAL FINDING — Duplicate Vault Roots
There are **TWO parallel vault locations**:
- `/00-inbox/`, `/01-product/`, … `/12-session-resume/`, `/templates/` (project root — pre-existed, has .gitkeep stubs and 14 templates)
- `/docs/vault/00-inbox/`, …, `/docs/vault/12-session-resume/`, `/docs/vault/templates/` (declared in CLAUDE.md as VAULT_ROOT)

Both contain matching numbered subfolders. CLAUDE.md and AGENTS.md declare `docs/vault/` as the canonical VAULT_ROOT, but the seeded structure (templates, .gitkeep stubs, .obsidian/) lives at the project root.

**This must be resolved before Step 2.** Options:
- (a) Move root vault → `docs/vault/` and delete root copies
- (b) Update CLAUDE.md/AGENTS.md to declare root as VAULT_ROOT
- (c) Symlink

Recommendation: **(a)** — keep `docs/vault/` as the canonical location per CLAUDE.md, migrate templates and `.obsidian/` config into it.

## Other Findings
- `templates/` (root) contains 14 ready-to-use templates: feature-brief, feature-spec, adr, bug-report, sprint, registry-entry, scan-summary, security-audit, reuse-map, release-notes, session-resume, mini-spec, cost-entry, workflow-state. These need to be migrated to `docs/vault/templates/`.
- Root contains Windows artefacts: `setup-vault.bat`, `sync.bat`, `Welcome.md`. The VPS is Linux — these are leftovers from a Windows-side bootstrap. Safe to ignore but flag for cleanup.
- `.obsidian/` lives at root, not under `docs/vault/`. Obsidian opens whichever directory has it.

## Action Items
1. **BLOCKING** — resolve duplicate vault location (root vs `docs/vault/`).
2. Migrate 14 templates from `/templates/` → `/docs/vault/templates/`.
3. Decide on `.obsidian/` location.
4. Clean up `.bat` files (or move to `scripts/windows/`).
5. Begin Phase 4 scaffolding (`src/`, `flow-api/`, `supabase/`) before next FULL SCAN will yield meaningful registry data.
