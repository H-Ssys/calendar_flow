---
type: dead-code
updated: 2026-04-09
---

# Dead Code Candidates

## Confirmed (cleanup recommended)
- `setup-vault.bat` — Windows bootstrap script, VPS is Linux. Move to `scripts/windows/` or delete.
- `sync.bat` — Windows sync script, same.
- `Welcome.md` (root) — Obsidian default welcome note, not used.

## Suspected duplicates (BLOCKING — see codebase-scan.md)
- Root-level numbered vault folders (`00-inbox/` … `12-session-resume/`) duplicate `docs/vault/` declared in CLAUDE.md. One set must go.
- Root `templates/` duplicates `docs/vault/templates/`.

## Source code dead code
None — there is no source code yet.
