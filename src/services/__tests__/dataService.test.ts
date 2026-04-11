import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    exportAllDataJSON,
    exportEventsCSV,
    exportTasksCSV,
    exportNotesCSV,
    importAllData,
    resetAllData,
} from '@/services/dataService';

// ── Mock localStorage ──
const store: Record<string, string> = {};

beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k]);

    vi.stubGlobal('localStorage', {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, val: string) => { store[key] = val; },
        removeItem: (key: string) => { delete store[key]; },
    });
});

// ─── exportAllDataJSON ───
describe('exportAllDataJSON', () => {
    it('returns valid JSON with version field', () => {
        const result = JSON.parse(exportAllDataJSON());
        expect(result).toHaveProperty('version', '1.0');
        expect(result).toHaveProperty('exportedAt');
        expect(result).toHaveProperty('events');
        expect(result).toHaveProperty('tasks');
        expect(result).toHaveProperty('notes');
        expect(result).toHaveProperty('journal');
    });

    it('includes existing localStorage data', () => {
        store['calendar-events'] = JSON.stringify([{ id: 'e1', title: 'Test Event' }]);
        store['ofative-tasks'] = JSON.stringify([{ id: 't1', title: 'Test Task' }]);

        const result = JSON.parse(exportAllDataJSON());
        expect(result.events).toHaveLength(1);
        expect(result.events[0].title).toBe('Test Event');
        expect(result.tasks).toHaveLength(1);
    });
});

// ─── exportEventsCSV ───
describe('exportEventsCSV', () => {
    it('generates CSV with headers', () => {
        const csv = exportEventsCSV([]);
        expect(csv).toBe('Title,Start,End,All Day,Category,Color');
    });

    it('includes event rows', () => {
        const events = [{
            id: 'e1',
            title: 'Meeting',
            startTime: new Date('2025-01-15T10:00:00Z'),
            endTime: new Date('2025-01-15T11:00:00Z'),
            isAllDay: false,
            category: 'Work',
            color: 'blue',
        }] as any[];

        const csv = exportEventsCSV(events);
        const lines = csv.split('\n');
        expect(lines).toHaveLength(2);
        expect(lines[1]).toContain('"Meeting"');
    });
});

// ─── exportTasksCSV ───
describe('exportTasksCSV', () => {
    it('generates CSV with headers', () => {
        const csv = exportTasksCSV([]);
        expect(csv).toBe('Title,Status,Priority,Due Date,Tags,Category');
    });

    it('handles tasks with tags', () => {
        const tasks = [{
            id: 't1',
            title: 'Buy groceries',
            status: 'todo',
            priority: 'medium',
            dueDate: null,
            tags: ['shopping', 'personal'],
            category: 'life',
        }] as any[];

        const csv = exportTasksCSV(tasks);
        expect(csv).toContain('"shopping;personal"');
    });
});

// ─── exportNotesCSV ───
describe('exportNotesCSV', () => {
    it('generates CSV with headers', () => {
        const csv = exportNotesCSV([]);
        expect(csv).toBe('Title,Tags,Category,Word Count,Created,Updated');
    });
});

// ─── importAllData ───
describe('importAllData', () => {
    it('rejects invalid JSON', () => {
        const result = importAllData('not-json');
        expect(result.success).toBe(false);
        expect(result.message).toContain('Failed to parse');
    });

    it('rejects data missing version', () => {
        const result = importAllData(JSON.stringify({ events: [] }));
        expect(result.success).toBe(false);
        expect(result.message).toContain('missing version');
    });

    it('imports valid data', () => {
        const data = {
            version: '1.0',
            events: [{ id: 'e1' }, { id: 'e2' }],
            tasks: [{ id: 't1' }],
            notes: [],
            journal: { '2025-01-15': { plan: 'test' } },
        };

        const result = importAllData(JSON.stringify(data));
        expect(result.success).toBe(true);
        expect(result.counts?.events).toBe(2);
        expect(result.counts?.tasks).toBe(1);
        expect(result.counts?.notes).toBe(0);

        // Verify localStorage was updated
        expect(JSON.parse(store['calendar-events'])).toHaveLength(2);
        expect(JSON.parse(store['ofative-tasks'])).toHaveLength(1);
    });

    it('imports journal data', () => {
        const data = {
            version: '1.0',
            events: [],
            tasks: [],
            notes: [],
            journal: { '2025-01-15': { plan: 'Work on project' } },
        };

        importAllData(JSON.stringify(data));
        expect(JSON.parse(store['daily-journal-default-user'])).toHaveProperty('2025-01-15');
    });
});

// ─── resetAllData ───
describe('resetAllData', () => {
    it('removes all known keys', () => {
        store['calendar-events'] = '[]';
        store['ofative-tasks'] = '[]';
        store['ofative-notes'] = '[]';
        store['daily-journal-default-user'] = '{}';
        store['focus-timer-state'] = '{}';

        resetAllData();

        expect(store['calendar-events']).toBeUndefined();
        expect(store['ofative-tasks']).toBeUndefined();
        expect(store['ofative-notes']).toBeUndefined();
        expect(store['daily-journal-default-user']).toBeUndefined();
        expect(store['focus-timer-state']).toBeUndefined();
    });
});
