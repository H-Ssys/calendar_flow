---
type: registry
category: patterns
updated: 2026-04-11
scan: step-8
---

# Architectural Patterns Registry

10 patterns identified across the codebase. Cross-referenced to [[components]], [[contexts]], [[hooks]], [[services]], and [[supabase-tables]].

---

## 1. Context + Provider (v1 State Management)

Three React Contexts provide all application state. Each is self-contained with CRUD, filtering, and localStorage persistence.

| Context | File | State | Consumers |
|---------|------|-------|-----------|
| CalendarContext | `src/context/CalendarContext.tsx` (640 lines) | events, categories, settings, view config | 45 files |
| TaskContext | `src/context/TaskContext.tsx` | tasks, filters, view mode | 16 files |
| NoteContext | `src/context/NoteContext.tsx` | notes, active note, sort/search | 7 files |

**Pattern**: `createContext` + `Provider` wrapper + `useCalendar`/`useTaskContext`/`useNoteContext` consumer hooks.
**Issue**: CalendarContext is a god object — events, categories, 8+ settings, view config all in one context. Triggers unnecessary re-renders across 45 consumers.

---

## 2. localStorage Persistence (v1 Data Layer)

All v1 data stored in localStorage with JSON serialization. 21 keys identified.

| Key | Owner | Purpose |
|-----|-------|---------|
| `calendar-events` | CalendarContext / dataService | Event storage |
| `event-logs` | CalendarContext | Event changelog/audit |
| `settings-categories` | CalendarContext | Category definitions |
| `settings-daily-time-config` | CalendarContext | Daily view hours |
| `settings-weekly-time-config` | CalendarContext | Weekly view hours |
| `settings-monthly-view-config` | CalendarContext | Monthly row highlight |
| `settings-yearly-view-config` | CalendarContext | Yearly month highlight |
| `settings-menu-bar` | CalendarContext | Menu bar config |
| `settings-profile` | CalendarContext | User profile |
| `settings-email-notifications` | CalendarContext | Email notification prefs |
| `ofative-tasks` | taskService | Task list |
| `ofative-notes` | noteService | Notes list |
| `daily-journal-default-user` | dailyJournalService | Journal entries |
| `daily-journal` | dailyJournalService | Additional journal data |
| `focus-timer-state` | useFocusTimer hook | Pomodoro state |
| `language` | i18n / GeneralSettings | UI language (en/vi) |
| `settings-rooms-connected` | RoomsSettings | Rooms integration (unbuilt) |
| `settings-conferencing-connected` | ConferencingSettings | Conferencing (unbuilt) |
| `settings-calendar-connected` | CalendarSettings | External cal sync (unbuilt) |
| `settings-billing-plan` | BillingSettings | Billing (unbuilt) |
| `settings-billing-cycle` | BillingSettings | Billing cycle (unbuilt) |

**Migration path**: 10 CalendarContext keys -> `profiles` table. Task/note/journal keys -> their respective Supabase tables. Last 5 keys -> delete with dead feature code.

---

## 3. Supabase Client Pattern (v2 Data Layer)

Defined in `packages/supabase-client/` but NOT yet wired to any page component.

| Hook | Purpose | Status |
|------|---------|--------|
| `useAuth()` | Auth state + signIn/signOut/signUp | Ready, not consumed |
| `useRealtimeQuery()` | React Query + Realtime subscriptions | Ready, not consumed |
| `globalSearch()` | Cmd+K fan-out across 4 tables + SiYuan | Ready, not consumed |

**Pattern**: `useRealtimeQuery(queryKey, queryFn, { table, filter?, event? })` wraps React Query with Supabase channel auto-subscription. Channel name `rt-{table}-{filter}` prevents collisions. This is the ONLY allowed Realtime pattern.

---

## 4. Switchable AI Providers

Implemented in `flow-api/app/services/ai_providers.py`.

| Concern | Env Var | Options | Default |
|---------|---------|---------|---------|
| OCR | `OCR_PROVIDER` | deepseek, gemini, openai | deepseek |
| Embeddings | `EMBED_PROVIDER` | openai, deepseek | openai |

**Pattern**: `run_ocr()` and `run_embed()` route to provider-specific functions based on config. All providers share the same async interface. Adding a provider = one function + one elif branch.

---

## 5. PDCA Tracking (Plan-Do-Check-Act)

Implemented across tasks and journal with auto-derivation from task status.

| Component | Location | Implementation |
|-----------|----------|---------------|
| Stage derivation | `src/types/task.ts: computePdcaStage()` | Auto: todo->Plan, in-progress->Do, review/done->Check, has outcome->Act |
| Completed stages | `src/types/task.ts: getCompletedPdcaStages()` | Returns array of completed stages |
| Outcome tracking | `TaskRow.outcome_emoji` + `outcome_rating` | great/ok/rough mapped to 5/3/1 rating |
| Journal integration | `journal_entries.slots[]` | Hourly plan vs actual tracking |
| Reflections | `journal_entries.reflections{}` | gratitude, standardize, not_good, improvements, encouragement, notes |

---

## 6. Drag-and-Drop (@dnd-kit)

Extensive use across calendar views and task board.

| Component | Type | Library |
|-----------|------|---------|
| `DraggableEvent.tsx` | Draggable | `@dnd-kit/core: useDraggable` |
| `DraggableDailyEvent.tsx` | Draggable | `@dnd-kit/core: useDraggable` |
| `DroppableCell.tsx` | Droppable | `@dnd-kit/core: useDroppable` |
| `DroppableTimeSlot.tsx` | Droppable | `@dnd-kit/core: useDroppable` |
| `DailyView.tsx` | DndContext | Full drag-drop with DragOverlay |
| `WeeklyView.tsx` | DndContext | Full drag-drop with DragOverlay |
| `MonthlyView.tsx` | DndContext | Full drag-drop with DragOverlay |
| `TaskBoard.tsx` | DndContext | Sortable kanban columns |
| `TaskColumn.tsx` | Droppable | `SortableContext, verticalListSortingStrategy` |
| `TaskCard.tsx` | Sortable | `@dnd-kit/sortable: useSortable` |

**Packages**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

---

## 7. Recurrence Rules (Custom iCal-like)

Custom recurrence engine in `src/services/recurrenceService.ts`.

```
RecurrenceRule { frequency, interval, daysOfWeek?, endDate?, count? }
```

**Flow**: RecurrencePicker UI -> JSON rule on Event.recurrence -> `useExpandedEvents` hook generates occurrences -> calendar views render them. Server-side expansion planned via `recurring_event_occurrences` table.

---

## 8. Cross-Module Linking

v1 uses ID arrays on each entity. v2 uses junction tables.

| v1 Pattern | v2 Table |
|-----------|----------|
| `Task.linkedEventIds: string[]` | `event_tasks (event_id, task_id)` |
| `Task.linkedTaskIds: string[]` | Self-ref via `parent_task_id` |
| `Note.linkedEventIds: string[]` | `event_notes (event_id, note_id)` |
| Contact links | `contact_events`, `contact_tasks`, `contact_notes` |

16 files reference linked IDs. Migration: extract arrays into junction table rows using `id_mapping` for v1->v2 ID translation.

---

## 9. Keyboard Shortcuts

Global navigation via `useCalendarKeyboard` hook.

| Key | Action |
|-----|--------|
| `ArrowLeft/Right` | Navigate back/forward by period |
| `t` | Jump to today |
| `1/2/3/4` | Switch to daily/weekly/monthly/yearly view |
| `n` | Create new event |

Additional `onKeyDown` handlers in TaskDetail (Enter for tags/subtasks), SearchCommand, NoteEditor, TagManager.

---

## 10. i18n (react-i18next)

| Config | Value |
|--------|-------|
| Library | `i18next` + `react-i18next` |
| Default language | Vietnamese (`vi`) |
| Fallback | English (`en`) |
| Locale files | `src/i18n/locales/en.json`, `vi.json` |
| Persistence | `language` localStorage key |
| Active consumers | CalendarHeader, GeneralSettings |

---

## Patterns Not Yet Wired (from v2 packages)

| Pattern | Package | Status |
|---------|---------|--------|
| Realtime subscriptions | `useRealtimeQuery` | Hook ready, no consumers |
| Typed Supabase queries | `supabase` client | Pages still use localStorage |
| Design token system | `@ofative/ui/tokens` | Not imported by src/ |
| Tailwind preset | `@ofative/ui/tailwind.config` | Not consumed by root config |

---

## Related

- State: [[contexts]] · [[hooks]] · [[services]]
- UI: [[components]] · [[shared-packages]]
- Data: [[supabase-tables]] · [[api-endpoints]] · [[types]]
- Architecture: [[dependency-map]] · [[codebase-scan]]
