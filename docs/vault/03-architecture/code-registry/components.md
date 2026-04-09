---
type: registry
category: components
updated: 2026-04-09
scan_step: 2/8
scope: src/components/
total_files: 107
business_files: 58
ui_primitives: 49
---

# Frontend Components Registry

**Scope:** `src/components/`
**Business components:** 58 files / ~11,353 lines
**State layer:** All business components consume React contexts (`CalendarContext`, `TaskContext`, `NoteContext`) — none hit Supabase directly except `GeneralSettings` (via `dataService`). This is a **v1 (context + localStorage)** architecture; migration to Supabase is a Phase 4+ concern.
**Oversized (>500 lines):** `DailyJournalView` (1324), `AddEventForm` (652), `EventPage` (558), `TaskDetail` (502).
**Direct `localStorage` touches:** `CalendarSettings`, `ConferencingSettings`, `RoomsSettings`, `BillingSettings`, `GeneralSettings`, `DailyJournalView` (rest persist via contexts which themselves write localStorage).

---

## Root (`src/components/`)

### NavLink (`src/components/NavLink.tsx`)
- **Size**: 0.7 KB | **Lines**: 28 | **Exports**: `NavLink`
- **Purpose**: Compat wrapper around `react-router-dom` NavLink that accepts `activeClassName` / `pendingClassName` like v5.
- **Interface**: `NavLinkCompatProps extends Omit<NavLinkProps, "className"> { className?, activeClassName?, pendingClassName? }`
- **Dependencies**: react-router-dom, `@/lib/utils` (cn)
- **Patterns**: forwardRef, render-prop className
- **Reuse notes**: Use everywhere sidebar/nav links need active styling — do not recreate.

---

## Calendar (`src/components/calendar/`)

### AddEventForm (`src/components/calendar/AddEventForm.tsx`)
- **Size**: 34 KB | **Lines**: 652 | **Exports**: default + named `AddEventForm`
- **Purpose**: Full event create/edit form with title, time range, recurrence, participants, color, category.
- **Interface**: `{ onClose?, onSave?(data), onDelete?, onReschedule?, initialEvent?: Event | null }`
- **Dependencies**: CalendarContext (`useCalendar`, `Event`, `PASTEL_COLORS`), `RecurrencePicker`, `AddParticipantCard`, shadcn (Input/Button/Textarea/Select/Popover/Badge/Calendar), date-fns, lucide.
- **Used by**: `DailyView`, `WeeklyView`, `MonthlyView`, `CalendarHeader` (quick-add flows)
- **Patterns**: Context consumer, controlled form, dual create/edit mode.
- **Reuse notes**: Single source of truth for event create/edit. Do NOT build a new event form.
- **⚠ Issues**: 652 lines — split into sections (TimeSection, RecurrenceSection, ParticipantsSection) before adding new features.

### AddParticipantCard (`src/components/calendar/AddParticipantCard.tsx`)
- **Size**: 6.7 KB | **Lines**: 140 | **Exports**: default
- **Purpose**: List + form card to pick/invite a participant by name+email.
- **Interface**: `{ onAdd?(name,email), className? }`
- **Dependencies**: shadcn Card/Input/Button/Avatar
- **Patterns**: 2-view state machine (`'list' | 'form'`), **MOCK_USERS hardcoded**.
- **⚠ Issues**: MOCK_USERS — needs contacts table wiring when Phase 4 contacts land.

### CalendarHeader (`src/components/calendar/CalendarHeader.tsx`)
- **Size**: 11.9 KB | **Lines**: 252 | **Exports**: `CalendarHeader`
- **Purpose**: Top bar — date navigation, view switcher (daily/weekly/monthly/yearly/journal), search, add, notifications, user menu.
- **Interface**: `{ onAddEvent?() }`
- **Dependencies**: CalendarContext (`ViewType`, `DailyViewVariant`), `SearchCommand`, `NotificationCenter`, react-i18next, react-router, date-fns, shadcn Popover/Dropdown.
- **Used by**: `Index.tsx` page
- **Patterns**: Context consumer, i18n.

### CalendarSidebar (`src/components/calendar/CalendarSidebar.tsx`)
- **Size**: 12.7 KB | **Lines**: 262 | **Exports**: `CalendarSidebar`
- **Purpose**: Left-rail nav — mini calendar, section links (Calendar/Tasks/Notes), category filters, task stats. Mobile: opens in Sheet.
- **Interface**: no props
- **Dependencies**: CalendarContext, TaskContext, `MiniCalendar`, `UserProfile`, `useIsMobile` hook, shadcn Sheet/Popover.
- **Patterns**: Context consumer, responsive (mobile Sheet).

### DailyJournalView (`src/components/calendar/DailyJournalView.tsx`)
- **Size**: 58.5 KB | **Lines**: 1324 | **Exports**: `DailyJournalView`
- **Purpose**: PDAC (Plan-Do-Act-Check) daily journal — time-planning grid 05:00–23:00, goal hierarchy, reflection, event/task integration, autosave.
- **Interface**: `{ onEventClick? }`
- **Dependencies**: CalendarContext, TaskContext, `useDailyJournal` hook, `TaskDetail`, shadcn Card/Input.
- **Patterns**: **localStorage persistence** (`daily-journal-${userId}`), autosave with debounce, computed goal tree.
- **Reuse notes**: Linked types at `src/types/dailyJournal.ts`, service at `src/services/dailyJournalService.ts`. Do not inline logic — extend the service.
- **⚠ Issues**: **1324 LINES — CRITICAL.** Must split (TimeGrid, GoalHierarchy, ReflectionSections, CopyYesterdayDialog) before any further edits. Still v1 (localStorage) — Phase 4 migration candidate.

### DailyView (`src/components/calendar/DailyView.tsx`)
- **Size**: 19.2 KB | **Lines**: 388 | **Exports**: `DailyView`
- **Purpose**: Single-day agenda with hour grid + overlapping-event column layout + drag/drop/resize.
- **Interface**: `{ onEventClick?(event) }`
- **Dependencies**: CalendarContext, `EventCard`, `DroppableTimeSlot`, `DraggableDailyEvent`, dnd-kit, date-fns.
- **Patterns**: Greedy column layout for overlaps, dnd-kit DndContext, memoized event filtering.

### DraggableDailyEvent (`.../DraggableDailyEvent.tsx`)
- **Size**: 1.1 KB | **Lines**: 37 | **Exports**: `DraggableDailyEvent`
- **Purpose**: dnd-kit draggable wrapper for daily-view events.
- **Interface**: `{ event, children, style? }` — children-based (wraps EventCard externally).
- **Dependencies**: `@dnd-kit/core`, CalendarContext `Event` type.
- **Patterns**: Render-prop drag wrapper.

### DraggableEvent (`.../DraggableEvent.tsx`)
- **Size**: 1.1 KB | **Lines**: 38 | **Exports**: `DraggableEvent`
- **Purpose**: dnd-kit draggable that renders an `EventCard` directly (weekly/monthly use).
- **Interface**: `{ event, style?, onClick? }`
- **Dependencies**: dnd-kit, `EventCard`.

### DroppableCell (`.../DroppableCell.tsx`)
- **Size**: 0.7 KB | **Lines**: 27 | **Exports**: `DroppableCell`
- **Purpose**: dnd-kit drop target for calendar grid cells with hover highlight.
- **Interface**: `{ id, children?, className?, style?, onClick? }`
- **Dependencies**: dnd-kit.

### DroppableTimeSlot (`.../DroppableTimeSlot.tsx`)
- **Size**: 0.6 KB | **Lines**: 21 | **Exports**: `DroppableTimeSlot`
- **Purpose**: dnd-kit drop target for daily-view time slots.
- **Interface**: `{ id, children?, className? }`
- **Dependencies**: dnd-kit.

### EventCard (`src/components/calendar/EventCard.tsx`)
- **Size**: 25.4 KB | **Lines**: 427 | **Exports**: `EventCard`
- **Purpose**: Calendar grid event chip with quick-edit + reschedule popover (duplicate, delete, move, time edit).
- **Interface**: `{ event, onClick?, description? }`
- **Dependencies**: CalendarContext, TaskContext (linked tasks), shadcn Popover/Button/Input/Calendar, sonner, date-fns.
- **Used by**: `DailyView`, `WeeklyView`, `MonthlyView`, `ResizableEvent`, `DraggableEvent`
- **Patterns**: Popover quick-edit, inline reschedule state machine (`menu | on | time`).
- **⚠ Issues**: 427 lines — approaching threshold; quick-edit logic should extract.

### FloatingNotification (`.../FloatingNotification.tsx`)
- **Size**: 2.0 KB | **Lines**: 51 | **Exports**: `FloatingNotification`
- **Purpose**: Fixed bottom-right upcoming-event toast (static demo content).
- **Interface**: no props
- **⚠ Issues**: Hardcoded "AW / Weekly Meeting" demo data — either wire to real data or mark `@deprecated`.

### FocusMode (`src/components/calendar/FocusMode.tsx`)
- **Size**: 9.6 KB | **Lines**: 217 | **Exports**: `FocusMode`
- **Purpose**: Pomodoro overlay tied to current in-progress task — start/pause/reset, phase transitions, expand/collapse.
- **Interface**: no props
- **Dependencies**: `useFocusTimer` hook, TaskContext
- **Patterns**: Hook-driven timer state, selects "active task" from in-progress list.

### MiniCalendar (`.../MiniCalendar.tsx`)
- **Size**: 1.2 KB | **Lines**: 27 | **Exports**: `MiniCalendar`
- **Purpose**: Sidebar month picker that drives `currentDate` in CalendarContext.
- **Interface**: no props
- **Dependencies**: shadcn `Calendar`, CalendarContext.

### MonthlyEventBar (`.../MonthlyEventBar.tsx`)
- **Size**: 5.1 KB | **Lines**: 124 | **Exports**: `MonthlyEventBar`
- **Purpose**: Multi-day event bar positioned across a week row in the monthly grid.
- **Interface**: `{ event, weekDays: Date[], rowIndex, onClick?, inline? }`
- **Dependencies**: CalendarContext, date-fns.
- **Patterns**: Absolute-positioned span calculation; `inline` mode for use inside a draggable wrapper.

### MonthlyView (`src/components/calendar/MonthlyView.tsx`)
- **Size**: 16.7 KB | **Lines**: 367 | **Exports**: `MonthlyView`
- **Purpose**: 6-week month grid with multi-day bars, expand-more button, overdue-task rail, drag-drop reschedule.
- **Interface**: `{ onEventClick? }`
- **Dependencies**: CalendarContext, TaskContext, `useExpandedEvents`, `MonthlyEventBar`, dnd-kit (pointerWithin), sonner, date-fns.
- **Patterns**: dnd-kit with custom PointerSensor, memoized week rows.

### MultiDayEventBar (`.../MultiDayEventBar.tsx`)
- **Size**: 3.1 KB | **Lines**: 80 | **Exports**: `MultiDayEventBar`
- **Purpose**: Multi-day event spanning bar for weekly view header.
- **Interface**: `{ event, startDayIndex, visibleDays, onClick? }`
- **Dependencies**: CalendarContext, date-fns.

### NotificationCenter (`.../NotificationCenter.tsx`)
- **Size**: 7.2 KB | **Lines**: 144 | **Exports**: `NotificationCenter`
- **Purpose**: Popover bell — lists next-30-min events and overdue tasks; respects `emailNotificationConfig.eventUpdates` flag.
- **Interface**: no props
- **Dependencies**: CalendarContext, TaskContext, shadcn Popover, react-router, date-fns.
- **Patterns**: Memoized derived lists.

### RecurrencePicker (`.../RecurrencePicker.tsx`)
- **Size**: 12.7 KB | **Lines**: 261 | **Exports**: default `RecurrencePicker`
- **Purpose**: RRULE picker — presets + custom (freq/interval/days/ends mode/end-date/count).
- **Interface**: `{ value: string (RRULE), onChange(v), date: Date, className? }`
- **Dependencies**: shadcn Popover/Select/RadioGroup/Input/Label, date-fns.
- **Patterns**: Two-view (`main | custom`) controlled picker, emits RRULE string.
- **Reuse notes**: Used by `AddEventForm`. Canonical recurrence UI — do not duplicate.

### ResizableEvent (`.../ResizableEvent.tsx`)
- **Size**: 5.0 KB | **Lines**: 130 | **Exports**: `ResizableEvent`
- **Purpose**: Wraps `EventCard` with top/bottom drag handles for duration resize.
- **Interface**: `{ event, style?, onClick?, onResize?(id,newDuration), hourInterval, rowHeightRem, contentPaddingRight? }`
- **Dependencies**: `EventCard`, raw mouse events (no dnd-kit for resize).
- **Patterns**: useRef-tracked start Y/height, ghost preview during drag.

### SearchCommand (`.../SearchCommand.tsx`)
- **Size**: 8.6 KB | **Lines**: 186 | **Exports**: `SearchCommand`
- **Purpose**: Global ⌘K command palette — searches events, tasks, notes; navigates to selection.
- **Interface**: `{ open, onOpenChange(bool) }`
- **Dependencies**: shadcn CommandDialog, `useGlobalSearch`, CalendarContext, NoteContext, react-router, date-fns.
- **Reuse notes**: Only entry point for cross-entity search — extend `useGlobalSearch`, not the component.

### UserProfile (`.../UserProfile.tsx`)
- **Size**: 0.9 KB | **Lines**: 23 | **Exports**: `UserProfile`
- **Purpose**: Static sidebar avatar + name + logout button.
- **Interface**: no props
- **⚠ Issues**: Hardcoded "Anastasia William" demo data — MUST wire to `useAuth` before launch.

### WeeklyView (`src/components/calendar/WeeklyView.tsx`)
- **Size**: 15.0 KB | **Lines**: 357 | **Exports**: `WeeklyView`
- **Purpose**: 7-day time grid with current-time indicator, overlap layout, drag/drop/resize, multi-day header row.
- **Interface**: `{ onEventClick?, onCellClick? }`
- **Dependencies**: CalendarContext, `EventCard`, `ResizableEvent`, `DroppableCell`, `MultiDayEventBar`, `layoutOverlappingEvents` util, dnd-kit, date-fns.
- **Patterns**: 15-second tick for current-time line, filtered events by search.

### YearlyView (`src/components/calendar/YearlyView.tsx`)
- **Size**: 8.5 KB | **Lines**: 182 | **Exports**: `YearlyView`
- **Purpose**: 12-month mini-grid overview, clicking a month jumps to MonthlyView.
- **Interface**: `{ onMonthClick?(date) }`
- **Dependencies**: CalendarContext, date-fns.

---

## Events (`src/components/events/`)

Event management page (list + detail + create dialog) separate from calendar-grid event chips.

### EventCard (`src/components/events/EventCard.tsx`)
- **Size**: 5.8 KB | **Lines**: 142 | **Exports**: `EventCard`
- **Purpose**: Row-style event card for the events list page (selectable, duplicate/delete actions).
- **Interface**: `{ event, isSelected, onSelect, onClick, onDuplicate, onDelete, getCategoryColor(cat), isPast? }`
- **Dependencies**: CalendarContext `Event` type, date-fns, lucide.
- **Reuse notes**: Distinct from `calendar/EventCard.tsx` — this one is for list/management UI, not grid placement.

### EventCreateDialog (`.../EventCreateDialog.tsx`)
- **Size**: 13.0 KB | **Lines**: 251 | **Exports**: `EventCreateDialog`
- **Purpose**: Modal event-create with emoji picker + 6 presets (meeting/workout/coffee/call/social/focus).
- **Interface**: `{ open, onClose }`
- **Dependencies**: CalendarContext, shadcn Dialog/Select/Input/Button, date-fns.
- **⚠ Issues**: Overlaps with `AddEventForm` — two event-creation UIs. Consolidate in Phase 4.

### EventDetail (`.../EventDetail.tsx`)
- **Size**: 19.9 KB | **Lines**: 385 | **Exports**: `EventDetail`
- **Purpose**: Full event detail/edit drawer with logs history, participants, color, emoji, category.
- **Interface**: `{ event, onClose, logs: EventLog[] }`
- **Dependencies**: CalendarContext, shadcn (Alert/Dialog/Select/Textarea/Badge), lucide, date-fns.

### EventPage (`.../EventPage.tsx`)
- **Size**: 31.8 KB | **Lines**: 558 | **Exports**: `EventPage`
- **Purpose**: Standalone "All events" page — search, filters (date range, category, sort), stats dashboard, bulk actions.
- **Interface**: no props (page component)
- **Dependencies**: CalendarContext, child event components, shadcn, date-fns.
- **Patterns**: `computeStats` helper, multi-filter reducer, memoized sort.
- **⚠ Issues**: **558 lines** — extract `EventFilters`, `EventStats`, `EventBulkActions` subcomponents.

---

## Notes (`src/components/notes/`)

### NoteCard (`src/components/notes/NoteCard.tsx`)
- **Size**: 2.6 KB | **Lines**: 68 | **Exports**: `NoteCard`
- **Purpose**: Note list item — title, excerpt, pin/star/date indicators, active state.
- **Interface**: `{ note: Note, isActive, onClick }`
- **Dependencies**: `@/types/note`, shadcn Badge, lucide, date-fns.

### NoteEditor (`src/components/notes/NoteEditor.tsx`)
- **Size**: 11.0 KB | **Lines**: 250 | **Exports**: `NoteEditor`
- **Purpose**: Markdown editor with react-markdown preview, tag manager, pin/favorite, toolbar (bold/italic/list/code/link/quote/H2), debounced save.
- **Interface**: `{ note: Note }`
- **Dependencies**: NoteContext, `TagManager`, `react-markdown` + `remark-gfm`, shadcn Input/Button/Badge, date-fns.
- **Patterns**: Local-content state synced via useEffect on note switch, timeout-based autosave.
- **Reuse notes**: TipTap migration candidate per CLAUDE.md (replaces SiYuan/current react-markdown).

### NoteList (`src/components/notes/NoteList.tsx`)
- **Size**: 7.6 KB | **Lines**: 156 | **Exports**: `NoteList`
- **Purpose**: Left-rail note list — search, pinned/recent sections, tag filter, add button.
- **Interface**: no props
- **Dependencies**: NoteContext, `NoteCard`, shadcn Input/Button/Badge, lucide.

### TagManager (`src/components/notes/TagManager.tsx`)
- **Size**: 3.3 KB | **Lines**: 86 | **Exports**: `TagManager`
- **Purpose**: Tag input with autocomplete suggestions from existing tags.
- **Interface**: `{ tags: string[], allTags?: string[], onChange(tags), className? }`
- **Dependencies**: shadcn Badge/Input.
- **Reuse notes**: Generic — usable for tasks/events tag inputs.

---

## Tasks (`src/components/tasks/`)

### ActivityDashboard (`src/components/tasks/ActivityDashboard.tsx`)
- **Size**: 10.0 KB | **Lines**: 198 | **Exports**: `ActivityDashboard`
- **Purpose**: Collapsible dashboard — weekly completion bar chart, streak, stats, star tasks.
- **Interface**: no props
- **Dependencies**: TaskContext, shadcn Chart (recharts), date-fns.

### TaskBoard (`src/components/tasks/TaskBoard.tsx`)
- **Size**: 4.2 KB | **Lines**: 115 | **Exports**: `TaskBoard`
- **Purpose**: Kanban board — renders `TaskColumnComponent` per TASK_COLUMNS with dnd-kit drag/drop.
- **Interface**: `{ onTaskClick(task) }`
- **Dependencies**: TaskContext, `TaskColumnComponent`, `TaskCard`, `@dnd-kit/core` + `sortable`.
- **Patterns**: arrayMove for reordering within column.

### TaskCard (`src/components/tasks/TaskCard.tsx`)
- **Size**: 6.6 KB | **Lines**: 146 | **Exports**: `TaskCard`
- **Purpose**: Draggable task card — title, priority, due, subtask progress, PDCA stage markers, overdue badge.
- **Interface**: `{ task, onClick(task) }`
- **Dependencies**: `@dnd-kit/sortable`, shadcn Badge, date-fns.
- **Patterns**: useSortable drag id `task-drag-${id}`.

### TaskColumnComponent (`src/components/tasks/TaskColumn.tsx`)
- **Size**: 4.0 KB | **Lines**: 102 | **Exports**: `TaskColumnComponent`
- **Purpose**: Kanban column — droppable zone + SortableContext + inline "add task" row.
- **Interface**: `{ status, tasks: Task[], onTaskClick, onAddTask(status,title) }`
- **Dependencies**: dnd-kit, `TaskCard`, shadcn Input.

### TaskDetail (`src/components/tasks/TaskDetail.tsx`)
- **Size**: 27.0 KB | **Lines**: 502 | **Exports**: `TaskDetail`
- **Purpose**: Full task editor — subtasks, PDCA stages, outcome emoji rating, activity log, linked events, priority/status/due.
- **Interface**: `{ task: Task, onClose }`
- **Dependencies**: TaskContext, CalendarContext, shadcn Checkbox/Select/Textarea/Badge, date-fns.
- **⚠ Issues**: **502 lines** — at threshold. Extract `SubtasksSection`, `PDCASection`, `ActivityLog`.

### TaskHeader (`src/components/tasks/TaskHeader.tsx`)
- **Size**: 5.7 KB | **Lines**: 123 | **Exports**: `TaskHeader`
- **Purpose**: Tasks page top bar — search, status/priority filter, board/list toggle, stats, add button.
- **Interface**: `{ onAddTask() }`
- **Dependencies**: TaskContext, shadcn Select/Input/Button/Badge.

### TaskList (`src/components/tasks/TaskList.tsx`)
- **Size**: 9.0 KB | **Lines**: 173 | **Exports**: `TaskList`
- **Purpose**: List-mode (non-kanban) task view with filter+sort+checkbox-complete.
- **Interface**: `{ onTaskClick(task) }`
- **Dependencies**: TaskContext, shadcn Checkbox/Badge, date-fns.

---

## Settings (`src/components/settings/`)

All settings consume `useCalendar` config slices (or sibling contexts). Four still persist via direct `localStorage` — flag for Phase 4 migration to a `user_settings` Supabase table.

### BillingSettings (`src/components/settings/BillingSettings.tsx`)
- **Size**: 14.3 KB | **Lines**: 246 | **Exports**: `BillingSettings`
- **Purpose**: Plan comparison (starter/professional/enterprise), billing cycle toggle, payment method, invoice history.
- **Interface**: no props
- **Dependencies**: shadcn Switch/Button/Label.
- **Patterns**: `PlanCard` subcomponent, **localStorage persistence**.
- **⚠ Issues**: v1 storage — migrate to Supabase `user_subscriptions`.

### CalendarSettings (`.../CalendarSettings.tsx`)
- **Size**: 3.9 KB | **Lines**: 86 | **Exports**: `CalendarSettings`
- **Purpose**: Connect external calendar providers (Google/Outlook/iCloud/Exchange) — stub toggle list.
- **Interface**: no props
- **Patterns**: **localStorage** `settings-calendar-connected`.
- **⚠ Issues**: Stub — no actual OAuth. v1 storage.

### ConferencingSettings (`.../ConferencingSettings.tsx`)
- **Size**: 4.9 KB | **Lines**: 93 | **Exports**: `ConferencingSettings`
- **Purpose**: Connect conferencing providers (Zoom/Meet/Teams/Webex/BlueJeans) — stub toggle list.
- **Patterns**: **localStorage** `settings-conferencing-connected`.

### DailySettings (`.../DailySettings.tsx`)
- **Size**: 3.9 KB | **Lines**: 139 | **Exports**: `DailySettings`
- **Purpose**: Daily view config — start/end hour, interval, variant.
- **Dependencies**: CalendarContext (`dailyTimeConfig`, `dailyViewVariant`).

### EmailSettings (`.../EmailSettings.tsx`)
- **Size**: 8.9 KB | **Lines**: 168 | **Exports**: `EmailSettings`
- **Purpose**: Manage email accounts (primary/verified), notification toggles (event updates, reminders, digests).
- **Dependencies**: CalendarContext (`emailNotificationConfig`), shadcn Switch/Button.
- **Patterns**: `EmailAccount` + `NotificationToggle` subcomponents.

### FlexibleEventsSettings (`.../FlexibleEventsSettings.tsx`)
- **Size**: 7.4 KB | **Lines**: 143 | **Exports**: `FlexibleEventsSettings`
- **Purpose**: Weekly view time-grid config (start/end/interval) — binds to `weeklyTimeConfig`.
- **Dependencies**: CalendarContext.
- **⚠ Issues**: Name collision with Weekly/Working hours — consolidate.

### FocusGuardSettings (`.../FocusGuardSettings.tsx`)
- **Size**: 5.3 KB | **Lines**: 99 | **Exports**: `FocusGuardSettings`
- **Purpose**: Monthly view row-highlight color (mislabeled as "Focus Guard").
- **Dependencies**: CalendarContext (`monthlyViewConfig`).
- **⚠ Issues**: Name vs. content mismatch; overlaps with `MonthlySettings`.

### GeneralSettings (`src/components/settings/GeneralSettings.tsx`)
- **Size**: 17.2 KB | **Lines**: 322 | **Exports**: `GeneralSettings`
- **Purpose**: Theme, language (i18n), time format, week start, declined-events toggle, **import/export JSON/CSV + reset all data**.
- **Dependencies**: CalendarContext, TaskContext, NoteContext, react-i18next, `@/services/dataService` (exportAllDataJSON / exportEventsCSV / exportTasksCSV / exportNotesCSV / importAllData / resetAllData), sonner.
- **Patterns**: **Only settings file importing a service module.** File-upload ref for import.
- **⚠ Issues**: 322 lines; couples three contexts — when refactoring, keep data-section extracted.

### MenuBarSettings (`.../MenuBarSettings.tsx`)
- **Size**: 2.6 KB | **Lines**: 50 | **Exports**: `MenuBarSettings`
- **Purpose**: Toggle native menu bar widget + "event to include" rule.
- **Dependencies**: CalendarContext (`menuBarConfig`).

### MonthlySettings (`.../MonthlySettings.tsx`)
- **Size**: 4.2 KB | **Lines**: 81 | **Exports**: `MonthlySettings`
- **Purpose**: Monthly view row-highlight color preset picker.
- **Dependencies**: CalendarContext (`monthlyViewConfig`).
- **⚠ Issues**: Overlaps with `FocusGuardSettings`.

### ProfileSettings (`.../ProfileSettings.tsx`)
- **Size**: 8.5 KB | **Lines**: 150 | **Exports**: `ProfileSettings`
- **Purpose**: User profile form — avatar, name, email, timezone, location, bio; draft state with save/cancel.
- **Dependencies**: CalendarContext (`profileConfig`), shadcn Input/Button/Textarea/Label.
- **Patterns**: Local draft diffed against context state via JSON.stringify.

### RoomsSettings (`.../RoomsSettings.tsx`)
- **Size**: 4.9 KB | **Lines**: 93 | **Exports**: `RoomsSettings`
- **Purpose**: Connect room-booking providers (Google/MS365/Zoom Rooms, directory/personal contacts) — stub.
- **Patterns**: **localStorage** `settings-rooms-connected`.

### SchedulingLinksSettings (`.../SchedulingLinksSettings.tsx`)
- **Size**: 4.9 KB | **Lines**: 92 | **Exports**: `SchedulingLinksSettings`
- **Purpose**: Yearly view month-highlight color (mislabeled "Scheduling Links").
- **Dependencies**: CalendarContext (`yearlyViewConfig`).
- **⚠ Issues**: Misnamed; overlaps with `YearlySettings`.

### SettingsSidebar (`.../SettingsSidebar.tsx`)
- **Size**: 4.5 KB | **Lines**: 95 | **Exports**: `SettingsSidebar`
- **Purpose**: Settings page left-nav with category groups and back-to-app button.
- **Interface**: `{ activeTab?, onTabChange?(tab) }`
- **Dependencies**: react-router, `@/lib/utils`.

### SmartColorCodingSettings (`.../SmartColorCodingSettings.tsx`)
- **Size**: 6.7 KB | **Lines**: 150 | **Exports**: `SmartColorCodingSettings`
- **Purpose**: Category CRUD — name, color, active toggle — with inline edit.
- **Dependencies**: CalendarContext (`PASTEL_COLORS`, `Category`, category CRUD setters), shadcn Switch/Input/Button.
- **Patterns**: `ColorSelector` + `SettingCategory` subcomponents.
- **Reuse notes**: Source of truth for category color palette edits.

### WeeklySettings (`.../WeeklySettings.tsx`)
- **Size**: 5.6 KB | **Lines**: 102 | **Exports**: `WeeklySettings`
- **Purpose**: Weekly view time-grid config (start/end hour, interval).
- **Dependencies**: CalendarContext (`weeklyTimeConfig`).
- **⚠ Issues**: Overlaps with `FlexibleEventsSettings` (same config slice).

### WorkingHoursSettings (`.../WorkingHoursSettings.tsx`)
- **Size**: 8.8 KB | **Lines**: 163 | **Exports**: `WorkingHoursSettings`
- **Purpose**: Daily view working-hours config — same slice as `DailySettings` with more fields (variant, interval).
- **Dependencies**: CalendarContext (`dailyTimeConfig`, `dailyViewVariant`).
- **⚠ Issues**: Overlaps with `DailySettings`.

### YearlySettings (`.../YearlySettings.tsx`)
- **Size**: 4.2 KB | **Lines**: 81 | **Exports**: `YearlySettings`
- **Purpose**: Yearly view month-highlight color preset picker.
- **Dependencies**: CalendarContext (`yearlyViewConfig`).
- **⚠ Issues**: Overlaps with `SchedulingLinksSettings`.

---

## UI Primitives (`src/components/ui/`)

Shadcn/ui primitives — standard Radix wrappers with Flow theme tokens. Do not edit without design review.

- accordion — `src/components/ui/accordion.tsx`
- alert — `src/components/ui/alert.tsx`
- alert-dialog — `src/components/ui/alert-dialog.tsx`
- aspect-ratio — `src/components/ui/aspect-ratio.tsx`
- avatar — `src/components/ui/avatar.tsx`
- badge — `src/components/ui/badge.tsx`
- breadcrumb — `src/components/ui/breadcrumb.tsx`
- button — `src/components/ui/button.tsx`
- calendar — `src/components/ui/calendar.tsx`
- card — `src/components/ui/card.tsx`
- carousel — `src/components/ui/carousel.tsx`
- chart — `src/components/ui/chart.tsx` (recharts wrapper)
- checkbox — `src/components/ui/checkbox.tsx`
- collapsible — `src/components/ui/collapsible.tsx`
- command — `src/components/ui/command.tsx`
- context-menu — `src/components/ui/context-menu.tsx`
- dialog — `src/components/ui/dialog.tsx`
- drawer — `src/components/ui/drawer.tsx`
- dropdown-menu — `src/components/ui/dropdown-menu.tsx`
- form — `src/components/ui/form.tsx`
- hover-card — `src/components/ui/hover-card.tsx`
- input — `src/components/ui/input.tsx`
- input-otp — `src/components/ui/input-otp.tsx`
- label — `src/components/ui/label.tsx`
- menubar — `src/components/ui/menubar.tsx`
- navigation-menu — `src/components/ui/navigation-menu.tsx`
- pagination — `src/components/ui/pagination.tsx`
- popover — `src/components/ui/popover.tsx`
- progress — `src/components/ui/progress.tsx`
- radio-group — `src/components/ui/radio-group.tsx`
- resizable — `src/components/ui/resizable.tsx`
- scroll-area — `src/components/ui/scroll-area.tsx`
- select — `src/components/ui/select.tsx`
- separator — `src/components/ui/separator.tsx`
- sheet — `src/components/ui/sheet.tsx`
- sidebar — `src/components/ui/sidebar.tsx` (22.8 KB, largest primitive)
- skeleton — `src/components/ui/skeleton.tsx`
- slider — `src/components/ui/slider.tsx`
- sonner — `src/components/ui/sonner.tsx`
- switch — `src/components/ui/switch.tsx`
- table — `src/components/ui/table.tsx`
- tabs — `src/components/ui/tabs.tsx`
- textarea — `src/components/ui/textarea.tsx`
- toast — `src/components/ui/toast.tsx`
- toaster — `src/components/ui/toaster.tsx`
- toggle — `src/components/ui/toggle.tsx`
- toggle-group — `src/components/ui/toggle-group.tsx`
- tooltip — `src/components/ui/tooltip.tsx`
- use-toast — `src/components/ui/use-toast.ts` (re-export hook)

---

## Summary
- **Scanned:** 107 component files (58 business + 49 UI primitives)
- **Oversized (>500 lines):** `DailyJournalView` (1324), `AddEventForm` (652), `EventPage` (558), `TaskDetail` (502)
- **Direct localStorage (v1):** 6 files — Calendar/Conferencing/Rooms/Billing/General settings + DailyJournalView
- **Supabase/service coupling:** 1 file (`GeneralSettings` via `dataService`)
- **Duplication candidates:** Daily vs WorkingHours, Weekly vs FlexibleEvents, Monthly vs FocusGuard, Yearly vs SchedulingLinks, calendar/EventCard vs events/EventCard, AddEventForm vs EventCreateDialog
- **Stub/demo data to wire:** `UserProfile` (hardcoded AW), `FloatingNotification` (hardcoded demo), `AddParticipantCard` (MOCK_USERS), all *Connect* settings stubs (no OAuth)
