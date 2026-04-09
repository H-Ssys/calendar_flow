// ──────────────────────────────────────────────────
// useExpandedEvents — Merges stored events with
// generated recurrence instances for a date range
// ──────────────────────────────────────────────────

import { useMemo } from 'react';
import { useCalendar, Event } from '@/context/CalendarContext';
import { parseRecurrence, generateOccurrences } from '@/services/recurrenceService';
import { startOfMonth, endOfMonth, addDays } from 'date-fns';

/**
 * Returns all events (original + recurrence instances) for
 * the current month ± a 7-day buffer so adjacent weeks are covered.
 */
export const useExpandedEvents = (): Event[] => {
    const { events, currentDate, searchQuery } = useCalendar();

    return useMemo(() => {
        const rangeStart = addDays(startOfMonth(currentDate), -7);
        const rangeEnd = addDays(endOfMonth(currentDate), 7);

        const expanded: Event[] = [];

        for (const event of events) {
            // Always include the original
            expanded.push(event);

            // Generate recurrence instances if applicable
            if (event.recurrence && event.recurrence !== 'none') {
                const rule = parseRecurrence(event.recurrence);
                if (rule) {
                    const instances = generateOccurrences(event, rule, rangeStart, rangeEnd);
                    expanded.push(...instances);
                }
            }
        }

        // Apply search filter
        if (!searchQuery.trim()) return expanded;
        const q = searchQuery.toLowerCase();
        return expanded.filter(e => e.title.toLowerCase().includes(q));
    }, [events, currentDate, searchQuery]);
};
