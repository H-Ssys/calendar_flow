---
type: registry
category: hooks
updated: 2026-04-09
scan_step: 3/8
scope: src/hooks/
total_files: 8
---

# Hooks Registry

Eight hooks. Half are thin context/media helpers; four encapsulate real logic (daily journal, focus timer, global search, calendar keyboard). Most wrap [[contexts]] to expose derived state for [[components]]; persistence helpers delegate to [[services]].

---

### useDailyJournal (`src/hooks/useDailyJournal.ts`)
- **Size**: 7.6 KB | **Lines**: 269
- **Signature**: `useDailyJournal({ date: Date, userId?: string = 'default-user', autosaveDelay?: number = 800, timeConfig: TimeConfig }) → { entry, isLoading, isSaving, lastSaved, updateEntry(patch), updateTimeSlot(...), updateGoals(...), updateReflections(...), updateUrgentTasks(...), copyYesterday(), … }`
- **Purpose**: Loads a day's PDAC journal entry and autosaves changes via debounced timer.
- **Dependencies**: `@/types/dailyJournal`, `@/services/dailyJournalService` (getJournalByDate, upsertJournal, copyPlanFromPreviousDay), `date-fns`, `CalendarContext` (TimeConfig type only).
- **Used by**: `DailyJournalView`
- **Patterns**: `useRef`-tracked debounce timer, optimistic local state, per-user localStorage via service.

### useFocusTimer (`src/hooks/useFocusTimer.ts`)
- **Size**: 4.1 KB | **Lines**: 123
- **Signature**: `useFocusTimer(workMinutes = 25, breakMinutes = 5) → { state: FocusTimerState, start(taskId?), pause(), resume(), reset(), setActiveTask(id) }` where `FocusTimerState = { isActive, isPaused, timeRemaining (s), currentPhase: 'work'|'break', sessionsCompleted, activeTaskId }`
- **Purpose**: Pomodoro timer with phase transitions and persistent state across reloads.
- **Dependencies**: react only.
- **Used by**: `FocusMode`
- **Persistence**: **localStorage key `focus-timer-state`** — the only hook that writes storage directly. Also cleared by `dataService.resetAllData()`.
- **Patterns**: `setInterval` ref + `useEffect` sync-to-storage on every state change.

### useGlobalSearch (`src/hooks/useGlobalSearch.ts`)
- **Size**: 2.1 KB | **Lines**: 55
- **Signature**: `useGlobalSearch(query: string) → { events: Event[], tasks: Task[], notes: Note[], total: number }`
- **Purpose**: Unified case-insensitive substring search across events (title/description/category), tasks (title/description/tags), notes (title/content/tags). Caps 10 per entity.
- **Dependencies**: `useCalendar`, `useTaskContext`, `useNoteContext`, `@/types/task`, `@/types/note`.
- **Used by**: `SearchCommand` (⌘K palette)
- **Patterns**: `useMemo` keyed on query + all three entity lists.

### useCalendarKeyboard (`src/hooks/useCalendarKeyboard.ts`)
- **Size**: 2.8 KB | **Lines**: 65
- **Signature**: `useCalendarKeyboard(onNewEvent?: () => void) → void`
- **Purpose**: Global keyboard shortcuts — ← / → step by current view, `t` jump to today, `1–4` switch view (daily/weekly/monthly/yearly), `n` create event. Skipped when focus is inside input/textarea/contenteditable.
- **Dependencies**: `useCalendar`, `date-fns` (addDays/addWeeks/addMonths/addYears + sub variants).
- **Used by**: (not currently called anywhere in the scanned business components — verify `pages/Index.tsx` in Step 4)
- **Patterns**: Window keydown listener with tag-based skip.
- **⚠ Issues**: If not wired into `Index.tsx`, shortcuts are dead code.

### useExpandedEvents (`src/hooks/useExpandedEvents.ts`)
- **Size**: 1.9 KB | **Lines**: 43
- **Signature**: `useExpandedEvents() → Event[]`
- **Purpose**: Returns base events plus generated recurrence instances for the current month ±7-day buffer, with search filter applied.
- **Dependencies**: `useCalendar` (events, currentDate, searchQuery), `@/services/recurrenceService` (parseRecurrence, generateOccurrences), `date-fns`.
- **Used by**: `MonthlyView`
- **Patterns**: `useMemo` over events/currentDate/searchQuery; per-event rule parse.

### useMediaQuery (`src/hooks/useMediaQuery.ts`)
- **Size**: 0.6 KB | **Lines**: 17
- **Signature**: `useMediaQuery(query: string) → boolean`; also exports `useIsMobile()` (`max-width: 768px`) and `useIsTablet()` (`max-width: 1024px`).
- **Purpose**: Subscribe to a CSS media query.
- **Dependencies**: react only.
- **Used by**: `CalendarSidebar` (via `useIsMobile`)
- **Patterns**: `MediaQueryList.addEventListener('change')`.

### use-mobile (`src/hooks/use-mobile.tsx`)
- **Size**: 0.6 KB | **Lines**: 19
- **Signature**: `useIsMobile() → boolean`
- **Purpose**: Shadcn-generated mobile breakpoint hook (`< 768px`).
- **Dependencies**: react only.
- **Used by**: `src/components/ui/sidebar.tsx` (shadcn primitive)
- **⚠ Issues**: **Duplicates `useMediaQuery.useIsMobile`.** Pick one and remove the other; shadcn expects `use-mobile` path.

### use-toast (`src/hooks/use-toast.ts`)
- **Size**: 3.9 KB | **Lines**: 186
- **Signature**: `useToast() → { toast(props), dismiss(id?), toasts: ToasterToast[] }` plus standalone `toast()` function.
- **Purpose**: Shadcn toast store (reducer-based). Re-exported from `src/components/ui/use-toast.ts`.
- **Dependencies**: `@/components/ui/toast` (types).
- **Used by**: `src/components/ui/toaster.tsx` (mount), settings stubs (`CalendarSettings`, `ConferencingSettings`, `RoomsSettings`) and any component using shadcn toast.
- **Patterns**: Module-level reducer + subscriber list; action types `ADD_TOAST | UPDATE_TOAST | DISMISS_TOAST | REMOVE_TOAST`.
- **⚠ Issues**: Most of the app uses `sonner` for toasts. Two competing toast systems (`sonner` + shadcn `use-toast`) — consolidate on sonner.

---

## Summary
- **8 hooks / 777 lines total**
- **Storage-writing hooks:** only `useFocusTimer` (`focus-timer-state`)
- **Dead code candidates:** `useCalendarKeyboard` (verify wiring), `use-mobile.tsx` (duplicates `useMediaQuery`), `use-toast.ts` + shadcn `Toaster` (superseded by sonner)
- **Cross-context coupling:** `useGlobalSearch` pulls all three business contexts — only place they converge outside pages.

---

## Related

- Consumers: [[components]]
- State sources: [[contexts]] · [[services]]
- Contracts: [[types]]
- Cross-cutting: [[patterns]] · [[dependency-map]]
