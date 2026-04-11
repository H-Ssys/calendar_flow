---
type: registry
category: services
updated: 2026-04-09
scan_step: 3/8
scope: src/services/
total_files: 5 (+ 2 tests)
---

# Services Registry

Five pure TS modules + 2 vitest test files. All persistence is **`localStorage`**; no HTTP/Supabase yet. Consumed by [[contexts]]; operates on shapes defined in [[types]]; targets [[supabase-tables]] during Phase 4 migration.

> **✅ Fixed (M0, 2026-04-11):** `dataService.ts` now uses `ofative-tasks` and `ofative-notes`, matching `taskService`/`noteService`. Export/import/reset work correctly.

---

## dailyJournalService (`src/services/dailyJournalService.ts`)
- **Size**: 7.2 KB | **Lines**: 199
- **Manages**: `DailyJournalEntry` (PDAC plan/do/act/check) per user per date.
- **Exports:**
  - `getJournalByDate(date, userId='default-user', timeConfig?) → DailyJournalEntry | null`
  - `upsertJournal(entry: Partial<DailyJournalEntry>, date, userId='default-user', timeConfig?) → DailyJournalEntry`
  - `copyPlanFromPreviousDay(currentDate, userId='default-user') → DailyJournalEntry | null`
  - `deleteJournal(date, userId='default-user') → void`
  - `getAllJournals(userId='default-user') → DailyJournalEntry[]`
- **localStorage keys:**
  - `daily-journal-${userId}` (default `daily-journal-default-user`) — object keyed by ISO date
  - Base const: `STORAGE_KEY = 'daily-journal'`; `getUserStorageKey(userId)` → `${STORAGE_KEY}-${userId}`
- **Side effects**: `localStorage.getItem` + `setItem` on the per-user key; no network.
- **Consumers**: `useDailyJournal` hook only.

## dataService (`src/services/dataService.ts`)
- **Size**: 4.4 KB | **Lines**: 118
- **Manages**: Bulk export, import, reset, and file download for all user data.
- **Exports:**
  - `downloadAsFile(content, filename, mimeType='application/json') → void` (triggers browser download)
  - `exportAllDataJSON() → string` (JSON with `version`, `exportedAt`, `events`, `tasks`, `notes`, `journal`)
  - `exportEventsCSV(events: Event[]) → string`
  - `exportTasksCSV(tasks: Task[]) → string`
  - `exportNotesCSV(notes: Note[]) → string`
  - `ImportResult` interface
  - `importAllData(jsonString) → ImportResult` (validates + writes to localStorage)
  - `resetAllData() → void`
- **localStorage keys read/written:**
  - `calendar-events` ✔ matches context
  - `tasks` ❌ **mismatch** — context uses `ofative-tasks`
  - `notes` ❌ **mismatch** — context uses `ofative-notes`
  - `daily-journal-default-user` ✔ matches service default
  - `focus-timer-state` (resetAllData only) ✔ matches hook
- **Side effects**: `localStorage` CRUD, `URL.createObjectURL` + anchor click for downloads.
- **Consumers**: `GeneralSettings` (only importer in the entire app)

## noteService (`src/services/noteService.ts`)
- **Size**: 7.9 KB | **Lines**: 175
- **Manages**: `Note[]` persistence + mock data seed + search/tag/date queries + ID/word-count/excerpt helpers.
- **Exports:**
  - `loadNotes() → Note[]` (returns mock notes if storage empty on first read)
  - `saveNotes(notes: Note[]) → void`
  - `searchNotes(notes, query) → Note[]`
  - `getNotesByTag(notes, tag) → Note[]`
  - `getNotesForDate(notes, date: Date) → Note[]`
  - `generateNoteId() → string`
  - `getWordCount(content: string) → number`
  - `getExcerpt(content: string, maxLength = 100) → string`
- **localStorage keys:**
  - `ofative-notes` (`STORAGE_KEY`) — `Note[]`
- **Side effects**: `localStorage` CRUD only.
- **Consumers**: `NoteContext`.

## recurrenceService (`src/services/recurrenceService.ts`)
- **Size**: 4.8 KB | **Lines**: 137
- **Manages**: Pure recurrence engine — **no storage, no side effects**.
- **Exports:**
  - `RecurrenceRule` interface — `{ frequency: 'daily'|'weekly'|'monthly'|'yearly', interval, daysOfWeek?, endDate?, count? }`
  - `parseRecurrence(rule: string) → RecurrenceRule | null` — accepts `'none'`, named presets, or JSON-encoded custom rule
  - `generateOccurrences(event: Event, rule: RecurrenceRule, rangeStart: Date, rangeEnd: Date) → Event[]` — virtual instances IDed as `${event.id}-rec-${i}`, treated as read-only
- **localStorage**: **none** (pure function module)
- **Consumers**: `useExpandedEvents` hook → `MonthlyView`; also used by `RecurrencePicker` (value string only).
- **Reuse notes**: Canonical recurrence logic. Extend here rather than adding ad-hoc rrule parsing.

## taskService (`src/services/taskService.ts`)
- **Size**: 10.9 KB | **Lines**: 289
- **Manages**: `Task[]` persistence with backward-compat defaults + mock data seed + derived queries + ID helpers.
- **Exports:**
  - `loadTasks() → Task[]` (seeds mock tasks when storage empty; migrates missing fields for backward compat — comment at line 211)
  - `saveTasks(tasks) → void`
  - `getTasksByStatus(tasks, status) → Task[]`
  - `getTasksByDate(tasks, date: Date) → Task[]`
  - `getOverdueTasks(tasks) → Task[]`
  - `getTasksLinkedToEvent(tasks, eventId) → Task[]`
  - `generateTaskId() → string`
  - `generateSubtaskId() → string`
- **localStorage keys:**
  - `ofative-tasks` (`STORAGE_KEY`) — `Task[]`
- **Side effects**: `localStorage` CRUD only.
- **Consumers**: `TaskContext`.

---

## Tests (`src/services/__tests__/`)

### dataService.test.ts
- **Size**: 5.4 KB | **Lines**: 168
- **Framework**: vitest with `vi.stubGlobal('localStorage', ...)` and an in-memory store.
- **Covers**: `exportAllDataJSON`, `exportEventsCSV`, `exportTasksCSV`, `exportNotesCSV`, `importAllData`, `resetAllData`.
- **⚠ Gap**: Tests use keys matching `dataService` (`tasks`/`notes`) so the prod bug (mismatch with `ofative-*`) is invisible in tests. Add integration test that seeds via `taskService.saveTasks`/`noteService.saveNotes` then runs `exportAllDataJSON`.

### taskService.test.ts
- **Size**: 3.3 KB | **Lines**: 103
- **Framework**: vitest.
- **Covers**: `getTasksByStatus`, `getOverdueTasks`, `generateTaskId`. Uses `makeTask` factory.
- **⚠ Gap**: No tests for `loadTasks`/`saveTasks` migration path or `getTasksByDate`/`getTasksLinkedToEvent`.

---

## Complete localStorage key inventory (services layer)

| Key | Owner | Shape | Shared with |
|---|---|---|---|
| `calendar-events` | CalendarContext (write), dataService (read/write) | `Event[]` | ✔ |
| `event-logs` | CalendarContext | `EventLog[]` | (dataService does NOT export) |
| `settings-categories` | CalendarContext | `Category[]` | — |
| `settings-daily-time-config` | CalendarContext | `ViewTimeConfig` | — |
| `settings-weekly-time-config` | CalendarContext | `ViewTimeConfig` | — |
| `settings-monthly-view-config` | CalendarContext | `MonthlyViewConfig` | — |
| `settings-yearly-view-config` | CalendarContext | `YearlyViewConfig` | — |
| `settings-menu-bar` | CalendarContext | `MenuBarConfig` | — |
| `settings-profile` | CalendarContext | `ProfileConfig` | — |
| `settings-email-notifications` | CalendarContext | `EmailNotificationConfig` | — |
| `ofative-tasks` | taskService (via TaskContext) | `Task[]` | ❌ **mismatch** with dataService `tasks` |
| `tasks` | dataService only | `Task[]` | ❌ nothing writes it → always `[]` |
| `ofative-notes` | noteService (via NoteContext) | `Note[]` | ❌ **mismatch** with dataService `notes` |
| `notes` | dataService only | `Note[]` | ❌ nothing writes it → always `[]` |
| `daily-journal-${userId}` | dailyJournalService (via useDailyJournal) | `Record<dateISO, DailyJournalEntry>` | ✔ (default-user path hardcoded in dataService) |
| `focus-timer-state` | useFocusTimer hook | `FocusTimerState` | ✔ (reset only) |
| `settings-calendar-connected` | CalendarSettings (component) | `string[]` | — |
| `settings-conferencing-connected` | ConferencingSettings (component) | `string[]` | — |
| `settings-rooms-connected` | RoomsSettings (component) | `string[]` | — |

**Total:** 18 distinct localStorage keys across the app (16 "real" + 2 "phantom" dataService keys that nothing writes).

## Phase 4 migration action items
1. **Fix dataService key mismatch** (`tasks` → `ofative-tasks`, `notes` → `ofative-notes`) OR rename context keys to plain `tasks`/`notes`. Pick one and add a migration on first load.
2. **Add `event-logs` to export/import** in dataService (currently dropped).
3. **Consolidate settings keys** under one `settings` object or migrate 1:1 to a `user_settings` Supabase table.
4. **Strip `userId='default-user'` defaults** from dailyJournalService once auth is wired.
5. **Add tests** for the context↔service key contract to prevent future drift.

---

## Related

- Callers: [[contexts]] · [[components]] · [[hooks]]
- Contracts: [[types]] · [[supabase-tables]]
- Backend: [[api-endpoints]] · [[shared-packages]]
- Migration: [[adr-010-dual-mode-migration]]
