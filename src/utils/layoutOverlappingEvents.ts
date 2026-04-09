import { Event } from '@/context/CalendarContext';

export interface EventLayout {
    /** 0-based column index within the overlap group */
    column: number;
    /** Total number of parallel columns in this group */
    totalColumns: number;
}

/**
 * Compute side-by-side layout for overlapping events within a single day.
 *
 * Algorithm (Google Calendar–style):
 * 1. Sort by start time ascending, then by duration descending (ties).
 * 2. Walk through sorted events and build collision groups — a group is a
 *    maximal set of events where each event overlaps with at least one other
 *    event in the group.
 * 3. Within each group, greedily assign each event to the leftmost available
 *    column (the first column whose end time ≤ this event's start time).
 * 4. Return a Map<eventId, { column, totalColumns }>.
 */
export function layoutOverlappingEvents(events: Event[]): Map<string, EventLayout> {
    const result = new Map<string, EventLayout>();

    if (events.length === 0) return result;

    // Helper to get minutes-from-midnight for positioning
    const getStartMin = (e: Event) => {
        const d = new Date(e.startTime);
        return d.getHours() * 60 + d.getMinutes();
    };
    const getEndMin = (e: Event) => {
        const d = new Date(e.endTime);
        return d.getHours() * 60 + d.getMinutes();
    };

    // 1. Sort by start ascending, then longer events first for tie-breaking
    const sorted = [...events].sort((a, b) => {
        const diff = getStartMin(a) - getStartMin(b);
        if (diff !== 0) return diff;
        // Longer events first so they anchor the column
        return (getEndMin(b) - getStartMin(b)) - (getEndMin(a) - getStartMin(a));
    });

    // 2. Build collision groups
    const groups: Event[][] = [];
    let currentGroup: Event[] = [];
    let groupEnd = -Infinity;

    for (const event of sorted) {
        const start = getStartMin(event);
        const end = getEndMin(event);

        if (currentGroup.length === 0 || start < groupEnd) {
            // Overlaps with the current group
            currentGroup.push(event);
            groupEnd = Math.max(groupEnd, end);
        } else {
            // No overlap — start a new group
            groups.push(currentGroup);
            currentGroup = [event];
            groupEnd = end;
        }
    }
    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }

    // 3. Assign columns within each group
    for (const group of groups) {
        // Track the end time of each column to know when a column becomes free
        const columnEnds: number[] = [];

        for (const event of group) {
            const start = getStartMin(event);

            // Find the leftmost column where this event fits
            let assignedCol = -1;
            for (let col = 0; col < columnEnds.length; col++) {
                if (columnEnds[col] <= start) {
                    assignedCol = col;
                    break;
                }
            }

            if (assignedCol === -1) {
                // Need a new column
                assignedCol = columnEnds.length;
                columnEnds.push(0);
            }

            columnEnds[assignedCol] = getEndMin(event);

            result.set(event.id, {
                column: assignedCol,
                totalColumns: 0, // will be set after all events in group are assigned
            });
        }

        // Set totalColumns for every event in this group
        const totalCols = columnEnds.length;
        for (const event of group) {
            const layout = result.get(event.id)!;
            layout.totalColumns = totalCols;
        }
    }

    return result;
}
