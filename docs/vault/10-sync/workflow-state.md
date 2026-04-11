---
type: workflow-state
current_workflow: m4-notes-migration
current_step: 1
feature_name: notes-migration
status: complete
last_updated: 2026-04-11T23:00:00Z
last_step_summary: "M4 Notes Migration complete. NoteContext dual-mode: VITE_USE_SUPABASE='true' → notes table + realtime, otherwise localStorage. Migration 011 adds notes.metadata JSONB for v1-only fields (category, isFavorite, linkedDate, linkedEventIds). Excerpt is recomputed on read (not stored in v2). All CRUD ops optimistic with rollback. Build verified ✓"
retry_count: 0
---

# Workflow State

## Current
- **Workflow**: m4-notes-migration
- **Step**: M4 — Complete
- **Feature**: NoteContext migration to Supabase
- **Status**: complete

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
