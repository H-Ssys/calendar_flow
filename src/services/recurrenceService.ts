// ──────────────────────────────────────────────────
// Recurrence Engine — parse recurrence rules from Event
// and generate virtual occurrences within a visible range
// ──────────────────────────────────────────────────

import {
    addDays, addWeeks, addMonths, addYears,
    differenceInMilliseconds, isWithinInterval, isBefore, startOfDay
} from 'date-fns';
import { Event } from '@/context/CalendarContext';

// ── Public types ──

export interface RecurrenceRule {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;       // e.g. every 2 weeks
    daysOfWeek?: number[];  // 0=Sun..6=Sat (for weekly)
    endDate?: Date;
    count?: number;         // max occurrences
}

// ── Parsing ──

/**
 * Parse the `recurrence` string stored on an Event.
 * Expected values: 'none', 'daily', 'weekly', 'monthly', 'yearly',
 * or a JSON-encoded RecurrenceRule for 'custom'.
 */
export const parseRecurrence = (rule: string): RecurrenceRule | null => {
    if (!rule || rule === 'none') return null;

    // Simple named presets
    const presets: Record<string, RecurrenceRule> = {
        daily: { frequency: 'daily', interval: 1 },
        weekly: { frequency: 'weekly', interval: 1 },
        monthly: { frequency: 'monthly', interval: 1 },
        yearly: { frequency: 'yearly', interval: 1 },
    };

    if (presets[rule]) return presets[rule];

    // Try JSON
    try {
        const parsed = JSON.parse(rule);
        if (parsed && parsed.frequency) return parsed as RecurrenceRule;
    } catch {
        // ignore
    }

    return null;
};

// ── Occurrence generation ──

const advanceDate = (date: Date, freq: RecurrenceRule['frequency'], interval: number): Date => {
    switch (freq) {
        case 'daily': return addDays(date, interval);
        case 'weekly': return addWeeks(date, interval);
        case 'monthly': return addMonths(date, interval);
        case 'yearly': return addYears(date, interval);
    }
};

/**
 * Generate virtual event instances for a given date range.
 * Each instance gets a derived ID `${event.id}-rec-${i}` and
 * is treated as read-only (display only).
 */
export const generateOccurrences = (
    event: Event,
    rule: RecurrenceRule,
    rangeStart: Date,
    rangeEnd: Date,
): Event[] => {
    const instances: Event[] = [];
    const duration = differenceInMilliseconds(
        new Date(event.endTime),
        new Date(event.startTime),
    );

    let occurrenceStart = new Date(event.startTime);
    let count = 0;
    const maxIterations = 365; // safety cap

    // Skip forward to the range start area to avoid iterating over old events
    while (isBefore(addDays(occurrenceStart, 1), rangeStart) && count < maxIterations) {
        occurrenceStart = advanceDate(occurrenceStart, rule.frequency, rule.interval);
        count++;
    }

    // Reset count for actual occurrence counting
    count = 0;

    // Go back a few periods to catch events that start before range but might overlap
    for (let back = 0; back < 3; back++) {
        const testStart = advanceDate(occurrenceStart, rule.frequency, -(back + 1) * rule.interval);
        if (isBefore(testStart, new Date(event.startTime))) break;
        occurrenceStart = testStart;
    }

    while (count < maxIterations) {
        // Don't generate the original event's occurrence
        if (startOfDay(occurrenceStart).getTime() === startOfDay(new Date(event.startTime)).getTime()) {
            occurrenceStart = advanceDate(occurrenceStart, rule.frequency, rule.interval);
            count++;
            continue;
        }

        // Respect endDate/count limits
        if (rule.endDate && isBefore(rule.endDate, occurrenceStart)) break;
        if (rule.count && count >= rule.count) break;

        // Stop if we've passed the visible range
        if (isBefore(rangeEnd, occurrenceStart)) break;

        const occEnd = new Date(occurrenceStart.getTime() + duration);

        // Check if this occurrence overlaps the visible range
        const overlaps =
            isWithinInterval(occurrenceStart, { start: rangeStart, end: rangeEnd }) ||
            isWithinInterval(rangeStart, { start: occurrenceStart, end: occEnd });

        if (overlaps) {
            instances.push({
                ...event,
                id: `${event.id}-rec-${count}`,
                startTime: new Date(occurrenceStart),
                endTime: occEnd,
            });
        }

        occurrenceStart = advanceDate(occurrenceStart, rule.frequency, rule.interval);
        count++;
    }

    return instances;
};
