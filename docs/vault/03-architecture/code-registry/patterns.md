---
type: registry
category: patterns
updated: 2026-04-09
---

# Architectural Patterns Registry

## Hybrid Orchestrator (in use)
- **Where**: `.claude/agents/orchestrator.md`
- **What**: Single orchestrator coordinates a 12-step workflow using two execution modes — in-session role switches (planning/review) and worktree-isolated subagent dispatches (code writing).
- **Why**: Avoids dispatch overhead for non-code steps while still isolating code-writing operations.

## Vault-as-Source-of-Truth (planned)
- **What**: Agents read compact vault summaries instead of raw source files. Codebase Scanner runs FIRST in every workflow and populates the registry.
- **Why**: ~60–70% token savings per workflow vs each agent re-reading source.

## Switchable Provider Pattern (planned, declared in CLAUDE.md)
- Env-var-controlled: `OCR_PROVIDER`, `EMBEDDING_PROVIDER`, `LLM_PROVIDER`
- Not yet implemented — `flow-api/` does not exist.

## Contract-First (planned)
- System Architect locks TS interfaces at Step 4; Backend and Frontend implement against them.
- Not yet exercised.
