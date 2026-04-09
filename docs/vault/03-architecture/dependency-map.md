---
type: dependency-map
updated: 2026-04-09
---

# Dependency Map

**Status**: EMPTY — no application code yet.

## Agent System Dependencies (current)
- `orchestrator.md` reads → `.claude/skills/roles/*.md` (13 files)
- `orchestrator.md` dispatches → 4 subagents in `.claude/agents/`
- All agents read → `docs/vault/` (vault is single source of truth)
- `.claude/settings.json` SessionStart hook → `git pull` + load latest session resume
- `.claude/settings.json` Stop hook → write session resume + cost log
