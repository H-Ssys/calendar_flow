---
type: registry
category: utilities
updated: 2026-04-09
scan_step: 4/8
scope: src/utils/ + src/lib/
total_files: 2
---

# Utilities Registry

Two small utility modules. Both pure, no side effects, no storage. Consumed by [[components]]; the `Event` type lives in [[contexts]] and [[types]].

---

### layoutOverlappingEvents (`src/utils/layoutOverlappingEvents.ts`)
- **Size**: 3.5 KB | **Lines**: 109 | **Exports**: `EventLayout`, `layoutOverlappingEvents`

```ts
export interface EventLayout {
    column: number;        // 0-based column index within the overlap group
    totalColumns: number;  // total parallel columns in this group
}

export function layoutOverlappingEvents(events: Event[]): Map<string, EventLayout>
```

- **Purpose**: Google-Calendar-style side-by-side layout for overlapping events in a single day. Returns a `Map<eventId, {column, totalColumns}>` so the caller can position each event as `left = column/totalColumns`, `width = 1/totalColumns`.
- **Algorithm**:
  1. Sort by start time ascending; ties → longer event first (anchors the column).
  2. Walk sorted events, building collision groups by checking if the next event starts before the group's current max end.
  3. Within each group, greedily assign each event to the leftmost column whose previous end ≤ this start.
  4. Fill `totalColumns` per group after assignment.
- **Dependencies**: `Event` type from `@/context/CalendarContext` (only).
- **Used by**: `src/components/calendar/WeeklyView.tsx` (sole consumer)
- **Reuse notes**: If `DailyView` ever needs true parallel-column layout it currently does its own greedy allocation inline (see `DailyView.tsx` line 27 `interface EventColumn`). That inline version should be replaced with a call to this util — **duplication candidate**.
- **Edge cases handled**: empty input returns empty map; single group uses one column; ties broken by duration.

### cn (`src/lib/utils.ts`)
- **Size**: 142 bytes | **Lines**: 6 | **Exports**: `cn`

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- **Purpose**: Canonical Tailwind className combiner — `clsx` for conditionals + `tailwind-merge` for conflict resolution.
- **Dependencies**: `clsx`, `tailwind-merge`
- **Used by**: **67 files** across `src/` — every shadcn primitive + most business components. The most-imported utility in the codebase.
- **Reuse notes**: Canonical path `@/lib/utils`. Never re-implement.

---

## Summary
- **2 files, 115 lines**. Both pure.
- **`cn` is the most-imported symbol in the app** (67 files).
- **Duplication flag:** `DailyView` implements its own overlap-column algorithm inline; consolidate onto `layoutOverlappingEvents` during the next refactor of `DailyView`.
- **No `src/utils/date.ts`, `src/utils/color.ts`, etc.** — date work is delegated to `date-fns`, color work stays in `CalendarContext.getCategoryColor`. No orphan utility modules to clean up.

---

## Related

- Consumers: [[components]] · [[hooks]]
- Contracts: [[contexts]] · [[types]]
- Architecture: [[dependency-map]] · [[codebase-scan]]
