---
type: vault-health
updated: 2026-04-11
scan: step-8
---

# Vault Health Report

## Critical

- **Duplicate vault roots** — Root `/` and `/docs/vault/` both contain numbered folders (00-inbox through 12-session-resume). CLAUDE.md declares `docs/vault/` canonical. Root copies must be deleted. See [[dead-code-candidates]] Category 4.
- **Templates misplaced** — 14 real template files at root `/templates/`, but `docs/vault/templates/` only has `README.md`. Templates must be moved to `docs/vault/templates/`.

## Warnings

- **Root `.obsidian/`** — Obsidian config at project root instead of `docs/vault/.obsidian/`. Works but misleading.
- **Empty vault subfolders** — Most `docs/vault/` numbered subfolders (01-sprints through 09-security, 11-cost-tracking, 12-session-resume) have no content beyond stubs. Expected at this project phase.
- **Schema drift** — 2 tables in live Supabase DB (`daily_journals`, `user_settings`) not tracked in migration files. Need migration 009 or cleanup.

## Registry Completeness

All 11 registry files now populated:

| File | Status | Updated |
|------|--------|---------|
| [[components]] | Complete | 2026-04-10 |
| [[contexts]] | Complete | 2026-04-10 |
| [[hooks]] | Complete | 2026-04-10 |
| [[services]] | Complete | 2026-04-10 |
| [[types]] | Complete | 2026-04-10 |
| [[utilities]] | Complete | 2026-04-10 |
| [[config]] | Complete | 2026-04-10 |
| [[patterns]] | Complete | 2026-04-11 |
| [[api-endpoints]] | Complete | 2026-04-11 |
| [[shared-packages]] | Complete | 2026-04-11 |
| [[supabase-tables]] | Complete | 2026-04-11 |

## Architecture Docs

| File | Status |
|------|--------|
| [[codebase-scan]] | Complete (8/8 steps) |
| [[dependency-map]] | Complete |
| [[dead-code-candidates]] | Complete (25 items) |
| [[oversized-files]] | Complete (7 files) |
| `vault-health.md` | This file |

## Design Docs

| File | Status |
|------|--------|
| [[system]] | Complete (token reference) |

## OK

- All registry files have valid frontmatter (type, category, updated)
- No broken wikilinks detected
- No orphan notes in docs/vault/
- Workflow state file current and valid

---

## Related

- Registry: [[components]] · [[contexts]] · [[hooks]] · [[services]] · [[types]] · [[utilities]] · [[config]] · [[patterns]] · [[api-endpoints]] · [[shared-packages]] · [[supabase-tables]]
- Architecture: [[codebase-scan]] · [[dependency-map]] · [[dead-code-candidates]] · [[oversized-files]]
- Design: [[system]]
- Sync: [[workflow-state]]
