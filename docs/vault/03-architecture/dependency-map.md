---
type: dependency-map
updated: 2026-04-11
scan: step-8
---

# Dependency Map

Cross-registry edges between [[components]], [[contexts]], [[hooks]], [[services]], and [[types]]. See also [[patterns]].

## Context Consumer Graph

### CalendarContext (45 consumers)

```
CalendarContext.tsx
 Pages: Index.tsx
 Calendar (14): DailyView, WeeklyView, MonthlyView, YearlyView,
   DailyJournalView, CalendarHeader, CalendarSidebar, MiniCalendar,
   SearchCommand, NotificationCenter, AddEventForm, EventCard,
   MonthlyEventBar, MultiDayEventBar
 DnD (3): DraggableEvent, DraggableDailyEvent, ResizableEvent
 Events (3): EventPage, EventCreateDialog, EventDetail
 Settings (12): General, Profile, Daily, Weekly, Monthly, Yearly,
   SmartColorCoding, Email, MenuBar,
   WorkingHours*, FlexibleEvents*, FocusGuard*, SchedulingLinks*
 Hooks (3): useCalendarKeyboard, useExpandedEvents, useGlobalSearch
 Services (3): recurrenceService, dataService, dailyJournalService
 Utils (1): layoutOverlappingEvents

 * = dead code (not imported in Settings.tsx)
```

### TaskContext (16 consumers)

```
TaskContext.tsx
 Pages: Tasks, EventTask
 Tasks (5): TaskBoard, TaskList, TaskHeader, TaskDetail, ActivityDashboard
 Calendar (5): DailyJournalView, CalendarSidebar, MonthlyView,
   EventCard, NotificationCenter, FocusMode
 Settings (1): GeneralSettings
 Hooks (1): useGlobalSearch
```

### NoteContext (7 consumers)

```
NoteContext.tsx
 Pages: Notes
 Notes (2): NoteList, NoteEditor
 Calendar (1): SearchCommand
 Settings (1): GeneralSettings
 Hooks (1): useGlobalSearch
```

---

## Service -> Context Imports

| Context | Imports From |
|---------|-------------|
| CalendarContext | None (inline localStorage) |
| TaskContext | `taskService`: loadTasks, saveTasks, getTasksByStatus, getTasksByDate, getOverdueTasks, generateTaskId, generateSubtaskId |
| NoteContext | `noteService`: loadNotes, saveNotes, searchNotes, generateNoteId, getWordCount, getExcerpt |

| Service | Consumed By |
|---------|------------|
| taskService | TaskContext |
| noteService | NoteContext |
| recurrenceService | useExpandedEvents |
| dailyJournalService | useDailyJournal, DailyJournalView |
| dataService | GeneralSettings (import/export) |

---

## External Library Usage

| Library | Import Count | Purpose |
|---------|-------------|---------|
| `lucide-react` | 65+ | Icons (largest by import count) |
| `@radix-ui/*` | 45+ | Accessible UI primitives (via shadcn) |
| `date-fns` | 30 | Date formatting and math |
| `@dnd-kit/*` | 15+ | Drag-and-drop |
| `react-router-dom` | 8 | Client-side routing |
| `i18next` / `react-i18next` | 3 | Internationalization |
| `sonner` | 2 | Toast notifications |
| `clsx` | 1 | Conditional CSS classes |
| `framer-motion` | 0 | NOT USED (in package.json but zero imports) |

---

## Cross-Context Hotspots

Components importing MULTIPLE contexts (re-render risk):

| Component | Calendar | Task | Note |
|-----------|:---:|:---:|:---:|
| GeneralSettings.tsx | X | X | X |
| useGlobalSearch.ts | X | X | X |
| DailyJournalView.tsx | X | X | |
| CalendarSidebar.tsx | X | X | |
| MonthlyView.tsx | X | X | |
| EventCard.tsx (calendar) | X | X | |
| NotificationCenter.tsx | X | X | |
| SearchCommand.tsx | X | | X |
| TaskDetail.tsx | X | X | |

---

## v2 Packages (not yet wired to src/)

```
packages/supabase-client
  depends on: @supabase/supabase-js, @tanstack/react-query
  depends on: packages/shared-types (workspace:*)
  imported by: NOTHING in src/

packages/shared-types
  depends on: typescript (dev)
  imported by: NOTHING in src/

packages/ui
  depends on: tailwindcss (peer)
  imported by: NOTHING in src/
```

All 3 packages ready but disconnected from the running application.

---

## Related

- Registries: [[components]] · [[contexts]] · [[hooks]] · [[services]] · [[types]] · [[shared-packages]]
- Overview: [[codebase-scan]] · [[patterns]]
- Cleanup: [[dead-code-candidates]] · [[oversized-files]]
