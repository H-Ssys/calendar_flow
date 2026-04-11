---
type: registry
category: contexts
updated: 2026-04-09
scan_step: 3/8
scope: src/context/
total_files: 3
---

# Contexts Registry

Three React contexts own **all v1 state** for Flow. Every business component routes through these rather than hitting storage/services directly. All persistence is `localStorage` — each key below is a migration target for Phase 4+ Supabase tables.

> **⚠ Storage key drift:** `NoteContext`/`noteService` persist to `ofative-notes` and `TaskContext`/`taskService` persist to `ofative-tasks`, but `dataService.ts` reads/writes `notes` and `tasks`. **Export/import and reset currently miss notes and tasks entirely.** Flag for Phase 4 fix.

---

## CalendarContext (`src/context/CalendarContext.tsx`)
- **Size**: 23.0 KB | **Lines**: 640 | **Exports**: `Event`, `EventLog`, `EventLogAction`, `EventLogSource`, `Category`, `Theme`, `TimeFormat`, `WeekStart`, `ViewType`, `DailyViewVariant`, `TimeConfig`, `ViewTimeConfig`, `MonthlyViewConfig`, `YearlyViewConfig`, `MenuBarConfig`, `ProfileConfig`, `EmailNotificationConfig`, `PASTEL_COLORS`, `DEFAULT_CATEGORY_COLOR`, `isMultiDayEvent`, `getEventDurationDays`, `useCalendar`, `CalendarProvider`.
- **Purpose**: Root state for events, categories, view config, theme, settings. The most-consumed context in the app.

### State shape
```
events: Event[]                       // id, title, startTime, endTime, isAllDay,
                                      // emoji, color, category, participants?,
                                      // description?, recurrence?, location?
currentView: ViewType                 // daily | weekly | monthly | yearly
dailyViewVariant: DailyViewVariant    // timeline | journal (PDAC)
currentDate: Date
searchQuery: string
activeCategories: string[]            // category-name filter

categories: Category[]

// Appearance + locale
theme: Theme
timeFormat: TimeFormat
weekStart: WeekStart
showDeclinedEvents: boolean

// Per-view time grids
timeConfig: TimeConfig                // legacy alias → weeklyTimeConfig
dailyTimeConfig: ViewTimeConfig       // { startHour, endHour, hourInterval }
weeklyTimeConfig: ViewTimeConfig
monthlyViewConfig: MonthlyViewConfig  // row highlight color, etc.
yearlyViewConfig: YearlyViewConfig

// Phase 2 settings
menuBarConfig: MenuBarConfig
profileConfig: ProfileConfig
emailNotificationConfig: EmailNotificationConfig

eventLogs: EventLog[]                 // audit trail
```

### Actions / methods
- **Events:** `addEvent(Omit<Event,'id'>, source?) → Event`, `updateEvent(id, Partial<Event>, source?)`, `deleteEvent(id, source?)`
- **Navigation:** `setView(view)`, `setDailyViewVariant(variant)`, `setDate(date)`, `setSearchQuery(q)`, `toggleCategory(name)`
- **Categories:** `addCategory(cat)`, `updateCategory(name, Partial<Category>)`, `deleteCategory(name)`
- **Settings setters:** `setTheme`, `setTimeFormat`, `setWeekStart`, `setShowDeclinedEvents`, `setTimeConfig`, `setDailyTimeConfig`, `setWeeklyTimeConfig`, `setMonthlyViewConfig`, `setYearlyViewConfig`, `setMenuBarConfig`, `setProfileConfig`, `setEmailNotificationConfig`
- **Color resolution:** `getCategoryColor(categoryName?, fallbackColor?) → string`
- **Logs:** `getEventLogs(eventId) → EventLog[]`, `clearEventLogs()`

### localStorage keys (9)
| Key | Written from | Shape |
|---|---|---|
| `calendar-events` | events state | `Event[]` |
| `event-logs` (`EVENT_LOGS_KEY`) | eventLogs state | `EventLog[]` |
| `settings-categories` | addCategory/updateCategory/deleteCategory | `Category[]` |
| `settings-daily-time-config` | dailyTimeConfig effect | `ViewTimeConfig` |
| `settings-weekly-time-config` | weeklyTimeConfig effect | `ViewTimeConfig` |
| `settings-monthly-view-config` | monthlyViewConfig effect | `MonthlyViewConfig` |
| `settings-yearly-view-config` | yearlyViewConfig effect | `YearlyViewConfig` |
| `settings-menu-bar` | menuBarConfig effect | `MenuBarConfig` |
| `settings-profile` | profileConfig effect | `ProfileConfig` |
| `settings-email-notifications` | emailNotificationConfig effect | `EmailNotificationConfig` |

### Consumers (26 components + 4 hooks)
- **Calendar views:** `CalendarHeader`, `CalendarSidebar`, `DailyView`, `WeeklyView`, `MonthlyView`, `YearlyView`, `DailyJournalView`, `MiniCalendar`, `EventCard` (calendar), `MonthlyEventBar`, `MultiDayEventBar`, `NotificationCenter`, `SearchCommand`, `DraggableDailyEvent`, `DraggableEvent`, `ResizableEvent` (via Event type), `AddEventForm`
- **Events page:** `EventPage`, `EventDetail`, `EventCreateDialog`
- **Tasks:** `TaskDetail` (for linked-event lookup)
- **Settings:** `DailySettings`, `WeeklySettings`, `MonthlySettings`, `YearlySettings`, `WorkingHoursSettings`, `FlexibleEventsSettings`, `FocusGuardSettings`, `SchedulingLinksSettings`, `MenuBarSettings`, `ProfileSettings`, `EmailSettings`, `SmartColorCodingSettings`, `GeneralSettings`
- **Hooks:** `useExpandedEvents`, `useGlobalSearch`, `useCalendarKeyboard` (+ indirect via others)

### Patterns
- Lazy `useState(() => JSON.parse(localStorage...))` initializers, per-slice `useEffect` persistence.
- INITIAL_EVENTS mock data seeded when no storage is present (~500 lines of lines 215–349).
- `PASTEL_COLORS` (9 entries) is the canonical category color palette.

### Supabase Dual-Mode (M2a + M2b, 2026-04-11)
- **Feature flag**: `VITE_USE_SUPABASE === 'true'` → Supabase mode, otherwise localStorage (default)
- **Events service**: `src/services/supabase/eventSupabaseService.ts` — fetchEvents, createEvent, updateEvent, deleteEvent, subscribeToEvents
- **Settings service**: `src/services/supabase/settingsSupabaseService.ts` — fetchSettings, updateSettings, updateProfileColumns
- **Type mapper**: `src/utils/eventTypeMapper.ts` — mapV1ToV2, mapV2ToV1, mapV1UpdateToV2
- **Migration**: `supabase/migrations/009_profile_settings.sql` — adds `settings JSONB DEFAULT '{}'` to profiles
- **Events CRUD**: Optimistic local update → async Supabase call → rollback on error
- **Settings persistence**: 7 config keys → `profiles.settings` JSONB, profile → `profiles` columns (display_name, timezone, language, theme)
- **Debounce**: 300ms debounce on all Supabase settings writes to prevent rapid saves
- **Realtime**: subscribeToEvents refetches full event list on any postgres_changes event
- **Event-logs**: Remain localStorage-only (P2 — not user-facing, grow unbounded)
- **Type gaps**: emoji, category, participants, videoCallLink have no v2 column — dropped on Supabase write, defaulted on read

### ⚠ Issues
- **~809 lines** — past refactor threshold. Split: types file, provider file, persistence hook, mock data.
- Mixed concerns: events CRUD, categories CRUD, settings slices, event logs all in one file.
- `timeConfig` is a legacy alias kept for backward compat — remove after consumers migrate to `weeklyTimeConfig`.
- Event-logs not migrated to Supabase (P2).

---

## NoteContext (`src/context/NoteContext.tsx`)
- **Size**: 7.1 KB | **Lines**: 208 | **Exports**: `NoteProvider`, `useNoteContext`

### State shape
```
notes: Note[]                    // from @/types/note
activeNoteId: string | null
activeNote: Note | null          // derived
searchQuery: string
sortBy: 'updated' | 'created' | 'title'
filterTag: string | null
pinnedNotes: Note[]              // derived
recentNotes: Note[]              // derived
allTags: string[]                // derived
searchResults: Note[]            // derived via noteService.searchNotes
```

### Actions / methods
- `addNote(partial?: Partial<Note>) → Note`
- `updateNote(id, Partial<Note>)`
- `deleteNote(id)`
- `setActiveNote(id | null)`
- `togglePin(id)`, `toggleFavorite(id)`
- `notesByTag(tag) → Note[]`
- `setSearchQuery`, `setSortBy`, `setFilterTag`

### localStorage keys (via `noteService`)
| Key | Written from | Shape |
|---|---|---|
| `ofative-notes` | `saveNotes()` called on every `notes` change | `Note[]` |

### Consumers
- `NoteList`, `NoteEditor`, `SearchCommand` (indirect via `useGlobalSearch`), `GeneralSettings` (export/reset)

### Patterns
- Delegates all persistence to `noteService` (`loadNotes`, `saveNotes`, `searchNotes`, `generateNoteId`, `getWordCount`, `getExcerpt`).
- Derived lists memoized.
- Uses `sonner` for toasts on note actions.

### ⚠ Issues
- Storage key `ofative-notes` does NOT match `dataService.ts` (which reads `notes`). Export/import/reset are broken for notes.

---

## TaskContext (`src/context/TaskContext.tsx`)
- **Size**: 9.0 KB | **Lines**: 258 | **Exports**: `TaskProvider`, `useTaskContext`

### State shape
```
tasks: Task[]                    // from @/types/task (status, priority,
                                 // subtasks, linkedEventIds, activityLog,
                                 // pdcaStage, outcome emoji, order)
filterStatus: TaskStatus | 'all'
filterPriority: TaskPriority | 'all'
searchQuery: string
viewMode: 'board' | 'list'
overdueTasks: Task[]             // derived
todayTasks: Task[]               // derived
```

### Actions / methods
- **CRUD:** `addTask(Omit<Task,'id'|'createdAt'|'updatedAt'|'order'>) → Task`, `updateTask(id, Partial<Task>)`, `deleteTask(id)`
- **Kanban:** `moveTask(taskId, newStatus)`, `reorderTasks(status, taskIds[])`
- **Subtasks:** `addSubtask(taskId, title)`, `toggleSubtask(taskId, subtaskId)`, `deleteSubtask(taskId, subtaskId)`
- **Activity log:** `addActivityLogEntry(taskId, text, source: ActivitySource)`
- **Queries:** `tasksByStatus(status)`, `tasksByDate(date)`
- **Filters:** `setFilterStatus`, `setFilterPriority`, `setSearchQuery`, `setViewMode`

### localStorage keys (via `taskService`)
| Key | Written from | Shape |
|---|---|---|
| `ofative-tasks` | `saveTasks()` called on every `tasks` change | `Task[]` |

### Consumers
- `TaskBoard`, `TaskColumnComponent`, `TaskList`, `TaskCard`, `TaskDetail`, `TaskHeader`, `ActivityDashboard`
- `CalendarSidebar` (task stats), `NotificationCenter` (overdue), `MonthlyView` (overdue rail), `DailyJournalView`, `EventCard` (calendar, for linked tasks), `FocusMode`
- `useGlobalSearch`, `GeneralSettings` (export/reset)

### Patterns
- Delegates persistence to `taskService` (`loadTasks`, `saveTasks`, `getTasksByStatus`, `getTasksByDate`, `getOverdueTasks`, `generateTaskId`, `generateSubtaskId`).
- Sonner toasts on CRUD + move.

### Supabase Dual-Mode (M3, 2026-04-11)
- **Feature flag**: `VITE_USE_SUPABASE === 'true'` → Supabase mode, otherwise localStorage
- **Service**: `src/services/supabase/taskSupabaseService.ts` — fetchTasks (joins subtasks), createTask, updateTask, deleteTask, createSubtask, updateSubtask, deleteSubtask, subscribeToTasks
- **Type mapper**: `src/utils/taskTypeMapper.ts` — handles status `in-progress`↔`in_progress` and priority `urgent`↔`critical` enum mapping
- **Migration**: `supabase/migrations/010_task_metadata.sql` — adds `metadata JSONB DEFAULT '{}'` to tasks for v1-only fields
- **CRUD pattern**: Optimistic local update → async Supabase call → rollback on error
- **Subtasks**: Real `subtasks` table (FK CASCADE)
- **Cross-module links**: `linkedEventIds`/`linkedTaskIds` stored in `tasks.metadata` JSONB (linking tables for future)
- **Activity log**: Stored in `tasks.metadata.activityLog` (task_activity table for future)
- **Realtime**: subscribeToTasks listens on tasks + subtasks tables, refetches on any change
- **Undo delete**: Local re-add + Supabase re-create
- **Metadata cache**: `metadataByTaskId` ref tracks v2 metadata blob per task ID for correct merge on partial updates

### ⚠ Issues
- Storage key `ofative-tasks` does NOT match `dataService.ts` (which reads `tasks`). Export/import/reset are broken for tasks — **same bug as notes**. (Fixed in M0 — dataService now reads `ofative-tasks`.)

---

## Summary
- **Contexts:** 3 (Calendar, Note, Task) — 1,106 lines total
- **Total localStorage keys owned by contexts + services:** **13**
  - Calendar: `calendar-events`, `event-logs`, `settings-categories`, `settings-daily-time-config`, `settings-weekly-time-config`, `settings-monthly-view-config`, `settings-yearly-view-config`, `settings-menu-bar`, `settings-profile`, `settings-email-notifications`
  - Note: `ofative-notes`
  - Task: `ofative-tasks`
  - Focus timer (hook): `focus-timer-state`
  - Daily journal (service): `daily-journal-${userId}` (family)
- **Plus settings-stub keys** (from scan step 2): `settings-calendar-connected`, `settings-conferencing-connected`, `settings-rooms-connected`
- **Migration blocker:** Key-naming drift between contexts (`ofative-*`) and `dataService` (`tasks`/`notes`). Fix before Phase 4 Supabase migration to avoid silent data loss in export/import.
- **Refactor candidate:** `CalendarContext.tsx` (640 lines) — split into provider / types / persistence / mocks.
