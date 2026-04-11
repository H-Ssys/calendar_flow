---
type: vault-health
updated: 2026-04-11
scan: step-8
---

# Vault Health Report

## Critical

- **Duplicate vault roots** — Root `/` and `/docs/vault/` both contain numbered folders (00-inbox through 12-session-resume). CLAUDE.md declares `docs/vault/` canonical. Root copies must be deleted. See dead-code-candidates.md Category 4.
- **Templates misplaced** — 14 real template files at root `/templates/`, but `docs/vault/templates/` only has `README.md`. Templates must be moved to `docs/vault/templates/`.

## Warnings

- **Root `.obsidian/`** — Obsidian config at project root instead of `docs/vault/.obsidian/`. Works but misleading.
- **Empty vault subfolders** — Most `docs/vault/` numbered subfolders (01-sprints through 09-security, 11-cost-tracking, 12-session-resume) have no content beyond stubs. Expected at this project phase.
- **Schema drift** — 2 tables in live Supabase DB (`daily_journals`, `user_settings`) not tracked in migration files. Need migration 009 or cleanup.

## Registry Completeness

All 11 registry files now populated:

| File | Status | Updated |
|------|--------|---------|
| `code-registry/components.md` | Complete | 2026-04-10 |
| `code-registry/contexts.md` | Complete | 2026-04-10 |
| `code-registry/hooks.md` | Complete | 2026-04-10 |
| `code-registry/services.md` | Complete | 2026-04-10 |
| `code-registry/types.md` | Complete | 2026-04-10 |
| `code-registry/utilities.md` | Complete | 2026-04-10 |
| `code-registry/config.md` | Complete | 2026-04-10 |
| `code-registry/patterns.md` | Complete | 2026-04-11 |
| `code-registry/api-endpoints.md` | Complete | 2026-04-11 |
| `code-registry/shared-packages.md` | Complete | 2026-04-11 |
| `code-registry/supabase-tables.md` | Complete | 2026-04-11 |

## Architecture Docs

| File | Status |
|------|--------|
| `codebase-scan.md` | Complete (8/8 steps) |
| `dependency-map.md` | Complete |
| `dead-code-candidates.md` | Complete (25 items) |
| `oversized-files.md` | Complete (7 files) |
| `vault-health.md` | This file |

## Design Docs

| File | Status |
|------|--------|
| `06-design/system.md` | Complete (token reference) |

## OK

- All registry files have valid frontmatter (type, category, updated)
- No broken wikilinks detected
- No orphan notes in docs/vault/
- Workflow state file current and valid
