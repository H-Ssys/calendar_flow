---
type: dead-code
updated: 2026-04-11
scan: step-8
---

# Dead Code Candidates

25 items across 5 categories. Estimated removable: ~3,500 lines.

---

## Category 1: Confirmed Dead (safe to delete now)

| # | File/Directory | Lines | Reason |
|---|---------------|-------|--------|
| 1 | `backend/` (entire directory) | ~700 | Older scaffold, never executed. flow-api/ is canonical. Confirmed Step 5. |
| 2 | `src/temp_event_helper.ts` | 89 | Dev-only mock date generator with console.log. Not imported anywhere. |
| 3 | `vite.frontend.config.ts` | 20 | Alternate Vite config, not in any build script. |
| 4 | `tailwind.frontend.config.ts` | 91 | Alternate Tailwind config, not consumed. |
| 5 | `index.frontend.html` | 26 | Alternate HTML entry, only used by #3 (also dead). |
| 6 | `flow-api/app/services/ocr_service.py` | 20 | Stub superseded by `ai_providers.run_ocr`. Zero imports. |

**Subtotal**: ~946 lines

---

## Category 2: Unimported Settings Components

Present in src/ but NOT imported by Settings.tsx router. Implement features that don't exist.

| # | File | ~Lines | Feature |
|---|------|--------|---------|
| 7 | `src/components/settings/SchedulingLinksSettings.tsx` | 80 | Scheduling links |
| 8 | `src/components/settings/FlexibleEventsSettings.tsx` | 70 | Flexible events |
| 9 | `src/components/settings/WorkingHoursSettings.tsx` | 90 | Working hours |
| 10 | `src/components/settings/FocusGuardSettings.tsx` | 80 | Focus guard |

**Note**: ConferencingSettings, BillingSettings, RoomsSettings ARE imported by Settings.tsx (render stub UIs). Low priority.

**Subtotal**: ~320 lines

---

## Category 3: SiYuan References (becoming dead)

SiYuan being replaced by TipTap. Defer cleanup until TipTap ships.

| # | File | Status | Action |
|---|------|--------|--------|
| 11 | `flow-api/app/services/siyuan_sync_service.py` | NOT ACTIVE (not started, references nonexistent config) | Delete with TipTap migration |
| 12 | `flow-api/app/api/v1/notes.py` | NOT ACTIVE (not registered in main.py) | Rewrite for TipTap or delete |
| 13 | `packages/supabase-client/src/globalSearch.ts` | SiYuan fetch branch (graceful fallback) | Remove branch when TipTap ships |

Database columns (keep, removal needs migration):
- `notes.siyuan_block_id`, `notes.siyuan_notebook_id`, `notes.siyuan_synced_at`
- `idx_notes_siyuan` index

---

## Category 4: Duplicate Vault Roots

Root `/` has numbered folders and templates duplicating `docs/vault/`.

| # | Path | Action |
|---|------|--------|
| 14 | Root `00-inbox/` through `12-session-resume/` | Delete (docs/vault/ is canonical) |
| 15 | Root `templates/` (14 files) | Move to `docs/vault/templates/` or delete |
| 16 | Root `.obsidian/` | Move to `docs/vault/.obsidian/` |
| 17 | `setup-vault.bat`, `sync.bat` | Delete (Windows, VPS is Linux) |
| 18 | `Welcome.md` | Delete (Obsidian default) |

---

## Category 5: localStorage Keys for Unbuilt Features

| # | Key | Component |
|---|-----|-----------|
| 19 | `settings-rooms-connected` | RoomsSettings |
| 20 | `settings-conferencing-connected` | ConferencingSettings |
| 21 | `settings-calendar-connected` | CalendarSettings |
| 22 | `settings-billing-plan` | BillingSettings |
| 23 | `settings-billing-cycle` | BillingSettings |

---

## Cleanup Priority

1. **Delete `backend/`** — 700 lines, zero risk, confirmed duplicate
2. **Delete `*.frontend.*` configs** — 137 lines, unused
3. **Delete `temp_event_helper.ts`** — 89 lines, dev artifact
4. **Delete `ocr_service.py`** — 20 lines, superseded stub
5. **Delete 4 unimported settings components** — 320 lines
6. **Clean up duplicate vault roots** — structural
7. **SiYuan cleanup** — defer until TipTap migration
