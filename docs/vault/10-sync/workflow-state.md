---
type: workflow-state
current_workflow: hotfix-supabase-url
current_step: shipped
feature_name: hotfix-supabase-url
status: complete
last_updated: 2026-04-11T14:03:00Z
last_step_summary: "Hotfix: VITE_SUPABASE_URL 54322→54321, rebuilt + redeployed calendar_flow."
retry_count: 0
---

# Workflow State

## Current
- **Workflow**: hotfix-supabase-url
- **Step**: Shipped (2026-04-11)
- **Feature**: Fix production CORS / auth refresh failures
- **Status**: complete

## HOTFIX: Supabase URL pointing at Studio not Kong (2026-04-11)
| Task | Status | Summary |
|------|--------|---------|
| Diagnose CORS error | done | Preflight to `187.77.154.212:54322/auth/v1/token` rejected. 54322 is Studio (`socat → 10.0.2.7:3000`), not the API. Correct gateway is Kong on 54321 (`socat → 10.0.2.13:8000`). |
| Kong CORS probe | done | `curl -X OPTIONS` to `54321/auth/v1/token` returns `Access-Control-Allow-Origin: *` — Kong is healthy. |
| `.env` fix | done | `VITE_SUPABASE_URL` 54322 → 54321. `.env.example` already correct. |
| Rebuild | done | `pnpm exec vite build` → new `input-DLQ5q6lq.js` bundle, bakes only 54321. |
| Deploy | done | Purged stale `/usr/share/nginx/html/assets` + `index.html` in `calendar_flow`, `docker cp dist/.`, `nginx -s reload`. Stale `input-wLQZn1Rj.js` (had 54322) removed. |
| Verify | done | Served bundle contains only `54321`; Kong preflight passes from `Origin: http://app.187.77.154.212.sslip.io`. |

### Root cause
Build-time env drift. `.env` at repo root pinned the v1/v2-era Studio URL (54322) instead of the Kong gateway (54321). `.env.example` documented the correct value but the live `.env` was never reconciled. Every subsequent build baked the wrong origin into the bundle.

### Follow-ups
- Add a build-time guard that rejects non-API Supabase URLs (e.g. if URL resolves to Studio port).
- Consider serving Kong behind the same Coolify hostname so the frontend uses a relative path and avoids cross-origin entirely.
- Add a smoke test: `curl -X OPTIONS http://app.187.77.154.212.sslip.io/__cors_check__` wired to Kong.

---

## M7 Cleanup + Ship v2.0 (2026-04-12)

## M7 Cleanup + Ship v2.0 (2026-04-12)
| Task | Status | Summary |
|------|--------|---------|
| Remove USE_SUPABASE flag | done | Stripped from CalendarContext, TaskContext, NoteContext, dailyJournalService, useFocusTimer, dataService |
| Remove localStorage from contexts | done | All `localStorage.getItem/setItem` calls deleted from contexts/services/hooks |
| Remove legacy sync dataService API | done | exportAllDataJSON, importAllData, resetAllData deleted; only async exportAllData/importData/resetAllDataForUser remain |
| Update GeneralSettings call sites | done | Now uses async dataService API + AuthContext userId |
| Strip taskService/noteService persistence | done | Only pure helpers remain (search, query, ID gen, derived fields) |
| Strip stub settings UIs | done | RoomsSettings, ConferencingSettings, CalendarSettings, BillingSettings — connection state now in-memory only |
| Strip i18n localStorage default | done | i18n now defaults to 'vi'; language preference persisted via profileConfig.language |
| Delete dataService.test.ts | done | Tested removed legacy sync functions; obsolete |
| Update .env.example | done | Removed VITE_USE_SUPABASE; only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY remain |
| Strip stale comments | done | DailyJournalView header, settingsSupabaseService docblock, useDailyJournal comment, en.json reset description |
| Build verified | done | npx vite build → ✓ built in 1.00s |
| **localStorage grep verification** | **done** | **0 results outside migrationService** ✓ |

### Files NOT touched (per spec)
- `src/services/migrationService.ts` — still reads all 12 legacy localStorage keys + writes `supabase-migrated-${userId}` flag
- `src/components/MigrationBanner.tsx` — UI for one-time migration

### Verification command result
```
grep -r "localStorage" src/ --include="*.ts" --include="*.tsx" | grep -v "migrationService\|node_modules\|supabase-migrated" | wc -l
0
```

### Known follow-ups (not blocking ship)
- Event audit logs are now in-memory only (P2). They were never user-facing and would grow unbounded — defer until needed.
- Stub settings (Rooms/Conferencing/CalendarConnections/Billing) lose connection state on reload. Acceptable for non-functional stubs; will be wired to real integrations or proper Supabase tables in future milestones.
- noteService.ts test fixture (`__tests__/dataService.test.ts`) was deleted; consider adding new tests against the async Supabase API once a mock layer exists.

## M6 Data Migration Script (2026-04-12)
| Task | Status | Summary |
|------|--------|---------|
| migrationService.ts | done | checkMigrationNeeded, migrateAllData (6 steps), markMigrated, clearMigratedFlag, MigrationProgress + ProgressCallback |
| Migration order | done | settings → events → tasks → notes → journal → focus (per-item try/catch, partial success allowed) |
| Migration flag | done | `supabase-migrated-${userId}` localStorage key prevents re-running |
| dataService.ts | done | New async dual-mode: exportAllData(userId), importData(userId, json), resetAllDataForUser(userId). Legacy sync functions preserved for tests + GeneralSettings |
| MigrationBanner.tsx | done | 3-state banner: idle invitation → running progress → done success/warnings. Uses Alert + Button + Progress shadcn primitives |
| App.tsx wiring | done | Mounted inside ProtectedLayout (above Outlet, after providers so AuthContext is available) |
| Build verified | done | npx vite build → ✓ built in 934ms |

### Migration Flow
1. User logs in → `ProtectedLayout` mounts → `MigrationBanner` calls `checkMigrationNeeded(userId)`
2. If localStorage has any of the 12 keys (or any `daily-journal-*` key) AND `supabase-migrated-${userId}` is unset → banner shows invitation
3. User clicks "Migrate Now" → `migrateAllData(userId, onProgress)` runs sequentially
4. Each step (settings/events/tasks/notes/journal/focus) wrapped in try/catch, errors collected to `progress.errors`
5. On completion: `markMigrated(userId)` writes flag → banner shows success or warnings
6. User clicks "Skip" → flag set immediately, no migration performed
7. Banner persists until dismissed; reappears next mount only if flag is cleared

### Stub keys NOT migrated
- `settings-calendar-connected`, `settings-conferencing-connected`, `settings-rooms-connected` — stubs from scan step 2
- `event-logs` — P2, deferred (not user-facing, grow unbounded)

### Async Dual-Mode dataService API (new)
| Function | localStorage mode | Supabase mode |
|----------|-------------------|---------------|
| `exportAllData(userId)` | Calls legacy `exportAllDataJSON()` | Parallel fetch from events/tasks/notes/journal + settings, mapped via v2→v1 mappers, JSON v2.0 |
| `importData(userId, json)` | Calls legacy `importAllData()` | Per-row create through Supabase services with try/catch (errors collected, partial success) |
| `resetAllDataForUser(userId)` | Calls legacy `resetAllData()` | DELETE WHERE user_id on events/tasks/notes/journal_entries/focus_sessions + clear settings JSONB |

Legacy sync functions (`exportAllDataJSON`, `importAllData`, `resetAllData`) untouched — existing tests + `GeneralSettings` continue to work.

## M5 Journal + Focus Timer Migration (2026-04-12)
| Task | Status | Summary |
|------|--------|---------|
| Migration 012 | done | ALTER journal_entries + focus_sessions ADD COLUMN metadata JSONB DEFAULT '{}' |
| journalSupabaseService.ts | done | fetchEntry, fetchAllEntries, fetchEntriesByRange, upsertEntry (ON CONFLICT user_id+date), updateEntry, deleteEntry, mapV1ToV2, mapV2ToV1 |
| focusSupabaseService.ts | done | fetchFocusState (latest row), saveFocusState (insert/update), fetchFocusHistory (completed=true), metadataToFocusState |
| dailyJournalService.ts | done | Sync API preserved via module-level cache. Supabase mode: lazy hydrate on first access, fire-and-forget upsert/delete, subscribers fire on cache updates |
| useDailyJournal.ts | done | Subscribes to journal cache; defers init-on-empty by 200ms so async hydration can fill the cache before clobbering with a new empty entry |
| useFocusTimer.ts | done | Loads latest focus session on mount, debounced 500ms saveFocusState upsert via supabaseRowIdRef cache |
| Sync API preserved | done | DailyJournalView untouched — no refactor of 1324-line component |
| Build verified | done | npx vite build → ✓ built in 1.27s |

### Type Mismatches (v1 DailyJournalEntry ↔ v2 journal_entries)
| v1 Field | v2 Column | Mapping |
|----------|-----------|---------|
| id: string `journal-{date}-{ts}` | id: UUID | Auto-generated by Supabase on upsert |
| userId | user_id | Direct |
| date: 'YYYY-MM-DD' | date: DATE | Direct |
| title | metadata.title | JSONB (v1-only) |
| timezone | metadata.timezone | JSONB (v1-only) |
| timeSlots: TimeSlot[] | slots: JSONB | Direct array |
| urgentTasks: UrgentTask[] | metadata.urgentTasks | JSONB (v1-only) |
| goals.yearlyGoalText | yearly_goal | Direct |
| goals.monthlyGoalText | monthly_goal | Direct |
| goals.dailyGoalText | daily_goal | Direct |
| goals.dailyGoalResult | daily_result | Direct |
| reflections (6 fields) | reflections: JSONB | Whole object |
| attachments | metadata.attachments | JSONB (v1-only) |
| createdAt: Date | created_at: string | ISO conversion |
| updatedAt: Date | updated_at: string | ISO conversion |
| **Uniqueness** | UNIQUE(user_id, date) | Upsert via onConflict |

### Type Mismatches (v1 FocusTimerState ↔ v2 focus_sessions)
| v1 Field | v2 Column | Mapping |
|----------|-----------|---------|
| isActive | metadata.isActive | JSONB (live state) |
| isPaused | metadata.isPaused | JSONB (live state) |
| timeRemaining | metadata.timeRemaining | JSONB (live state) |
| currentPhase: 'work'/'break' | session_type: 'focus'/'short_break' + metadata.currentPhase | Mapped + duplicated in metadata for round-trip |
| sessionsCompleted | metadata.sessionsCompleted | JSONB (live state) |
| activeTaskId: string | task_id (UUID) → null + metadata.activeTaskId | task_id requires UUID; v1 IDs aren't UUIDs (P1) |
| — | started_at | Set on insert only |
| — | ended_at, duration_minutes, completed | Reserved for future "session complete" writes |

## M4 Notes Migration (2026-04-11)
| Task | Status | Summary |
|------|--------|---------|
| Migration 011 | done | ALTER TABLE notes ADD COLUMN metadata JSONB DEFAULT '{}' |
| noteTypeMapper.ts | done | mapV1ToV2, mapV2ToV1, mapV1UpdateToV2 with metadata merge |
| noteSupabaseService.ts | done | fetchNotes, createNote, updateNote, deleteNote, subscribeToNotes |
| NoteContext.tsx | done | Dual-mode: addNote, updateNote, deleteNote, togglePin, toggleFavorite, setActiveNote (auto-clean draft) |
| Optimistic updates | done | All CRUD ops update local state immediately, rollback on error |
| Undo (deleteNote) | done | Local re-add + Supabase re-create on undo click |
| Auto-clean draft | done | Empty Untitled drafts deleted locally + remotely on setActiveNote |
| Build verified | done | npx vite build → ✓ built in 891ms |

### Type Mismatches (v1 Note ↔ v2 notes table)
| v1 Field | v2 Column | Mapping |
|----------|-----------|---------|
| id: string | id: UUID | Direct (v1 IDs are non-UUID — known issue across modules) |
| title | title | Direct |
| content | content | Direct |
| excerpt | — | **DERIVED** — recomputed via getExcerpt() on read |
| tags[] | tags[] | Direct |
| color | color | Direct |
| isPinned | is_pinned | Direct rename |
| wordCount | word_count | Direct rename |
| createdAt: Date | created_at: string | Date ↔ ISO string |
| updatedAt: Date | updated_at: string | Date ↔ ISO string |
| **v1-only fields → notes.metadata JSONB** | | |
| category | metadata.category | JSONB |
| isFavorite | metadata.isFavorite | JSONB |
| linkedDate?: Date | metadata.linkedDate (ISO) | JSONB (linking tables future work) |
| linkedEventIds | metadata.linkedEventIds | JSONB (event_notes table future work) |
| **v2-only fields (defaulted on write)** | | |
| — | vault_path | '/' |
| — | backlinks | [] |
| — | is_daily_note | false |
| — | visibility | 'private' |
| — | siyuan_* | null |

## M3 Tasks Migration (2026-04-11)
| Task | Status | Summary |
|------|--------|---------|
| Migration 010 | done | ALTER TABLE tasks ADD COLUMN metadata JSONB DEFAULT '{}' |
| taskTypeMapper.ts | done | mapV1ToV2, mapV2ToV1, mapV1UpdateToV2 + status/priority enum mapping |
| taskSupabaseService.ts | done | fetchTasks (joins subtasks), createTask, updateTask, deleteTask, createSubtask, updateSubtask, deleteSubtask, subscribeToTasks |
| TaskContext.tsx | done | Dual-mode: addTask, updateTask, deleteTask, moveTask, reorderTasks, addSubtask, toggleSubtask, deleteSubtask, addActivityLogEntry |
| Optimistic updates | done | All CRUD ops update local state immediately, rollback on error |
| Undo (deleteTask) | done | Local re-add + Supabase re-create on undo click |
| Build verified | done | npx vite build → ✓ built in 924ms |

### Type Mismatches (v1 Task ↔ v2 tasks table)
| v1 Field | v2 Column | Mapping |
|----------|-----------|---------|
| status: 'in-progress' | status: 'in_progress' | **HYPHEN ↔ UNDERSCORE** |
| priority: 'urgent' | priority: 'critical' | **RENAME** |
| dueDate: Date | due_date: string | Date ↔ ISO string |
| createdAt/updatedAt: Date | created_at/updated_at: string | Date ↔ ISO string |
| completedAt: Date | completed_at: string | Date ↔ ISO string |
| outcomeEmoji | outcome_emoji | Direct |
| outcomeRating | outcome_rating | Direct |
| timeSpent | time_spent | Direct |
| scheduledDate/scheduledSlotId | scheduled_date/scheduled_slot_id | Direct |
| tags[] | tags[] | Direct |
| **v1-only fields → tasks.metadata JSONB** | | |
| actualResult | metadata.actualResult | JSONB |
| lessonsLearned | metadata.lessonsLearned | JSONB |
| category | metadata.category | JSONB |
| color | metadata.color | JSONB |
| order | metadata.order | JSONB |
| linkedEventIds | metadata.linkedEventIds | JSONB (linking tables future work) |
| linkedTaskIds | metadata.linkedTaskIds | JSONB |
| activityLog[] | metadata.activityLog | JSONB (task_activity table future work) |
| **v1 cancelled** | v2 'cancelled' | v1 has no cancelled; v2 cancelled → falls back to 'todo' on read |
| **Subtasks** | | |
| subtasks[] inline | subtasks table | Separate table; FK ON DELETE CASCADE |
| Subtask.done | subtasks.is_completed | Field rename |

## M2b Settings Migration (2026-04-11)
| Task | Status | Summary |
|------|--------|---------|
| Migration 009 | done | ALTER TABLE profiles ADD COLUMN settings JSONB DEFAULT '{}' |
| settingsSupabaseService.ts | done | fetchSettings, updateSettings, updateProfileColumns |
| CalendarContext.tsx | done | Dual-mode settings: load from Supabase on mount, debounced 300ms save |
| Category CRUD | done | localStorage writes guarded with !USE_SUPABASE |
| Event-logs | skipped (P2) | Remain localStorage-only — not user-facing, grow unbounded |

### Settings Key Mapping
| localStorage Key | Supabase Location | Notes |
|-----------------|-------------------|-------|
| `settings-categories` | profiles.settings.categories | Category[] |
| `settings-daily-time-config` | profiles.settings.dailyTimeConfig | ViewTimeConfig |
| `settings-weekly-time-config` | profiles.settings.weeklyTimeConfig | ViewTimeConfig |
| `settings-monthly-view-config` | profiles.settings.monthlyViewConfig | MonthlyViewConfig |
| `settings-yearly-view-config` | profiles.settings.yearlyViewConfig | YearlyViewConfig |
| `settings-menu-bar` | profiles.settings.menuBar | MenuBarConfig |
| `settings-email-notifications` | profiles.settings.emailNotifications | EmailNotificationConfig |
| `settings-profile` | profiles.display_name + timezone + language | First-class columns, not JSONB |
| (theme state) | profiles.theme | First-class column |
| `event-logs` | **NOT MIGRATED** (P2) | Stays localStorage |

## M2a Events Migration (2026-04-11)
| Task | Status | Summary |
|------|--------|---------|
| eventTypeMapper.ts | done | v1 Event ↔ v2 EventRow mapping with mapV1ToV2, mapV2ToV1, mapV1UpdateToV2 |
| eventSupabaseService.ts | done | fetchEvents, createEvent, updateEvent, deleteEvent, subscribeToEvents |
| CalendarContext.tsx | done | Dual-mode: USE_SUPABASE flag gates localStorage vs Supabase path |
| .env.example | done | Added VITE_USE_SUPABASE=false |
| Optimistic updates | done | All CRUD ops update local state immediately, rollback on Supabase error |
| Realtime subscription | done | subscribeToEvents refetches on any postgres_changes event |
| Settings/categories/logs | done (M2b) | Migrated in M2b |

### Type Mismatches (v1 Event ↔ v2 events table)
| v1 Field | v2 Column | Status |
|----------|-----------|--------|
| emoji: string | — | DROPPED — no v2 column |
| category?: string | — | DROPPED — no v2 column |
| participants?: array | event_participants table | NOT MAPPED — separate table |
| videoCallLink?: string | — | DROPPED — no v2 column |

## M1 Auth Layer (2026-04-11)
| Task | Status | Summary |
|------|--------|---------|
| AuthContext.tsx | done | Wraps @ofative/supabase-client useAuth |
| Login.tsx | done | Email + password form |
| Signup.tsx | done | Email + password + confirm |
| App.tsx | done | AuthProvider + ProtectedLayout + PublicRoute |
| ADR-010 | done | Documents auth-first migration strategy |

## M0 Cleanup (2026-04-11)
| Task | Status | Summary |
|------|--------|---------|
| Fix storage-key drift | done | dataService.ts: tasks→ofative-tasks, notes→ofative-notes |
| Delete backend/ | done | ~700 lines removed |
| Delete dead files | done | temp_event_helper.ts, *.frontend.* configs |

## Step History (prior: standalone-scan)
| Step | Agent | Status | Summary |
|------|-------|--------|---------|
| 0–8 | Codebase Scanner | done | Full scan (299 files, 25 dead code items) |

## Next Recommended Actions
- **M5** — Wire ContactContext (or contacts feature) to Supabase
- **M6** — Update dataService.ts (export/import) to read from Supabase when in dual-mode
- **P1** — Fix non-UUID v1 IDs across modules (notes, tasks, events) for Supabase compatibility
- **P2** — Event audit logs: create event_audit_log table or skip entirely
- **P3** — Cross-module linking tables (event_notes, contact_notes, event_tasks) — currently JSONB metadata

---

## Related

- Scan: [[codebase-scan]] · [[vault-health]]
- ADR: [[adr-010-dual-mode-migration]]
- Cost: [[cost-log]]
- Registries: [[contexts]] · [[services]] · [[supabase-tables]]
