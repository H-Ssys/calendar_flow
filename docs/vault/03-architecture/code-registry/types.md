---
type: registry
category: types
updated: 2026-04-09
scan_step: 4/8
scope: src/types/ + CalendarContext type exports
total_files: 3
---

# Types Registry

Three dedicated type files + Calendar types that live inline in `CalendarContext.tsx` (documented in [[contexts]]). Verbatim definitions below — these ARE the contracts. v2 equivalents live in [[shared-packages]]; target rows are in [[supabase-tables]].

> **Note on CalendarEvent:** There is **no** `src/types/event.ts`. The canonical `Event` interface is exported from `@/context/CalendarContext` (lines 3–24). It is also re-exported under the alias `CalendarEvent` in `src/pages/Index.tsx`: `import { Event as CalendarEvent } from '@/context/CalendarContext'`. If you need to move it out of the context, put it in `src/types/event.ts` and re-export from the context for backward compat.

---

## task.ts (`src/types/task.ts`)
- **Size**: 154 lines | **Module role:** types + enums + helper functions + smart-date formatter

```ts
// ── Enums ──
export type TaskStatus   = 'todo' | 'in-progress' | 'review' | 'done';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type PdcaStage    = 'plan' | 'do' | 'check' | 'act';
export type ActivitySource = 'journal' | 'manual' | 'status_change' | 'system';
export type OutcomeEmoji   = 'great' | 'ok' | 'rough';

// ── Activity timeline ──
export interface TaskActivityEntry {
    id: string;
    timestamp: Date;
    text: string;
    source: ActivitySource;
}

// ── Core Task ──
export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: Date;

    // Outcome tracking (PDCA simplified)
    actualResult: string;              // quick single-line note
    outcomeRating?: 1 | 2 | 3 | 4 | 5; // mapped from emoji: great=5, ok=3, rough=1
    outcomeEmoji?: OutcomeEmoji;       // 😊 great · 😐 ok · 😟 rough
    lessonsLearned?: string;           // backward compat

    // Time context (journal integration)
    scheduledDate?: string;
    scheduledSlotId?: string;
    timeSpent?: number;

    // Calendar integration
    linkedEventIds: string[];
    linkedTaskIds: string[];

    // Organization
    tags: string[];
    category: string;
    color: string;

    // Checklist
    subtasks: Subtask[];

    // Activity timeline
    activityLog: TaskActivityEntry[];

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    order: number;
}

export interface Subtask {
    id: string;
    title: string;
    done: boolean;
}

export interface TaskColumn {
    id: TaskStatus;
    title: string;
    emoji: string;
    color: string;
}
```

### Exported constants
- `TASK_COLUMNS: TaskColumn[]` — 4 kanban columns (todo 📋 #94a3b8, in-progress 🔄 #60a5fa, review 👁️ #f59e0b, done ✅ #22c55e)
- `PRIORITY_CONFIG: Record<TaskPriority, { label, color, emoji }>` — urgent 🔴, high 🟠, medium 🟡, low 🟢
- `PDCA_STAGES: { key, label, emoji, color }[]` — plan 📝, do 🔨, check 🔍, act 🚀
- `OUTCOME_EMOJIS: { key, emoji, label, rating }[]` — great 😊 5, ok 😐 3, rough 😟 1

### Exported helper functions
- `emojiToRating(emoji: OutcomeEmoji): 1|3|5` — map to legacy numeric rating
- `computePdcaStage(task: Task): PdcaStage` — derives stage from status/outcome (plan → do → check → act)
- `getCompletedPdcaStages(task: Task): PdcaStage[]` — which stages are completed
- `generateSubtaskSummary(task: Task): string` — `"Completed X/Y subtasks:\n✅ …\n❌ …"`
- `getDueLabel(dueDate: Date): string` — smart label: "Overdue by Xd/h", "Due soon", "Due in Xh/d", or `format(d, 'MMM d')`

### ⚠ Module issues
- Types file also exports **runtime constants, helper functions, and imports `date-fns`**. Split pure types from logic if Phase 4 introduces tree-shaken imports.
- `pages/Tasks.tsx`'s `addTask` call is missing `linkedTaskIds` and `activityLog` — would fail TS strict if that page were still routed (it is not — see pages section).

---

## note.ts (`src/types/note.ts`)
- **Size**: 34 lines

```ts
export interface Note {
    id: string;
    title: string;
    content: string;   // markdown
    excerpt: string;   // first ~100 chars for preview

    // Organization
    tags: string[];
    category: string;
    color: string;
    isPinned: boolean;
    isFavorite: boolean;

    // Calendar integration
    linkedDate?: Date;
    linkedEventIds: string[];

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    wordCount: number;
}

export const NOTE_COLORS = [
    { name: 'Default',  value: '#f8fafc' },
    { name: 'Rose',     value: '#ffe4e6' },
    { name: 'Amber',    value: '#fef3c7' },
    { name: 'Emerald',  value: '#d1fae5' },
    { name: 'Sky',      value: '#e0f2fe' },
    { name: 'Violet',   value: '#ede9fe' },
    { name: 'Fuchsia',  value: '#fae8ff' },
];
```
- **No helpers** — pure types + palette constant.

---

## dailyJournal.ts (`src/types/dailyJournal.ts`)
- **Size**: 56 lines | PDAC (Plan-Do-Act-Check) structure with Vietnamese-language field comments

```ts
export interface TimeSlot {
  id: string;
  startTime: string;          // HH:mm
  endTime: string;            // HH:mm
  planText: string;
  actualText: string;
  done: boolean;
  deadline: string;
  linkedEventIds: string[];
  linkedTaskIds: string[];
}

export interface UrgentTask {
  id: string;
  taskText: string;
  deadline: string;           // YYYY-MM-DD
  done: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface JournalGoals {
  yearlyGoalText: string;     // Ước Mơ, Hy Vọng Trong Năm Nay
  monthlyGoalText: string;    // Mục Tiêu Tháng Này
  dailyGoalText: string;      // Mục tiêu Ngày Hôm Nay
  dailyGoalResult: string;    // Kết Quả Mục Tiêu Ngày Hôm Nay
}

export interface JournalReflections {
  gratitudeGood: string;      // Việc Đã Làm Tốt / Biết Ơn
  standardizeRules: string;   // Việc Cần Quy Tắc Hóa
  notGood: string;            // Việc Làm Không Tốt
  improvements: string;       // Cách Cải Thiện
  selfEncouragement: string;  // Khích Lệ Động Viên Bản Thân
  notes: string;              // Ghi Chú
}

export interface DailyJournalEntry {
  id: string;
  userId: string;
  date: string;               // YYYY-MM-DD
  timezone: string;
  title: string;
  timeSlots: TimeSlot[];
  urgentTasks: UrgentTask[];
  goals: JournalGoals;
  reflections: JournalReflections;
  attachments?: Array<{
    id: string;
    type: 'image' | 'pdf';
    url: string;
    name: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
```
- **Notes**:
  - Vietnamese comments on goal/reflection fields — these labels drive the UI text. Do not translate without updating `DailyJournalView`.
  - `attachments` field is present in the type but not surfaced in `DailyJournalView` yet.
  - `timezone` is declared but currently ignored; wire to profile timezone in Phase 4.

---

## Calendar types (live in `src/context/CalendarContext.tsx`)

Declared inside the context file, exported as public API. See [[contexts]] for full listing. Summary:

```ts
export interface Event {            // the canonical CalendarEvent
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  emoji?: string;
  color: string;
  category?: string;
  participants?: { name: string; email: string }[];
  description?: string;
  recurrence?: string;              // 'none' | named preset | JSON-encoded RecurrenceRule
  location?: string;
}

export type EventLogAction = 'created' | 'updated' | 'deleted';
export type EventLogSource = 'event-page' | 'daily-view' | 'weekly-view'
                           | 'monthly-view' | 'yearly-view' | 'journal' | 'unknown';

export interface EventLog {
  id: string;
  eventId: string;
  action: EventLogAction;
  source: EventLogSource;
  timestamp: Date;
  snapshot?: Partial<Event>;
}

export interface Category { name: string; color: string; active: boolean; }

export type Theme       = 'light' | 'dark' | 'system';
export type TimeFormat  = '12h' | '24h';
export type WeekStart   = 'sunday' | 'monday';
export type ViewType    = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type DailyViewVariant = 'timeline' | 'journal';

export interface TimeConfig       { startHour: number; endHour: number; hourInterval: number; }
export type ViewTimeConfig        = TimeConfig;
export interface MonthlyViewConfig { /* row highlight color, show weekend, etc. */ }
export interface YearlyViewConfig  { /* month highlight color, etc. */ }
export interface MenuBarConfig    { enabled: boolean; /* event filter rule */ }
export interface ProfileConfig    { name: string; email: string; timezone: string; location: string; bio: string; avatarUrl?: string; }
export interface EmailNotificationConfig { eventUpdates: boolean; reminders: boolean; digests: boolean; }
```
Plus exported helpers `isMultiDayEvent(event)`, `getEventDurationDays(event)` and constants `PASTEL_COLORS` (9 entries) + `DEFAULT_CATEGORY_COLOR = '#96AAFF'`.

---

## Summary
- **3 type files / 244 lines** (+ Calendar types inline in context, ~120 more lines of interfaces)
- **No `event.ts` yet** — Calendar types live in `CalendarContext.tsx`. Extracting to `src/types/event.ts` would decouple types from provider.
- **`task.ts` is not pure types** — ships enums, constants, helpers, and a date-fns dependency. Consider splitting.
- **Vietnamese labels** on `JournalGoals`/`JournalReflections` — translation is a UI-layer concern, types are locale-agnostic.

---

## Related

- Consumers: [[contexts]] · [[components]] · [[services]] · [[hooks]]
- v2 contracts: [[shared-packages]] · [[supabase-tables]]
- Migration: [[adr-010-dual-mode-migration]]
