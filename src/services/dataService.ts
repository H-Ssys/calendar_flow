// ──────────────────────────────────────────────────
// Data Export / Import Service
// ──────────────────────────────────────────────────

import { Event } from '@/context/CalendarContext';
import { Task } from '@/types/task';
import { Note } from '@/types/note';

// ── Download helper ──

export const downloadAsFile = (content: string, filename: string, mimeType = 'application/json') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

// ── JSON Export ──

export const exportAllDataJSON = (): string => {
    const data = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        events: JSON.parse(localStorage.getItem('calendar-events') || '[]'),
        tasks: JSON.parse(localStorage.getItem('tasks') || '[]'),
        notes: JSON.parse(localStorage.getItem('notes') || '[]'),
        journal: JSON.parse(localStorage.getItem('daily-journal-default-user') || '{}'),
    };
    return JSON.stringify(data, null, 2);
};

// ── CSV Export ──

const escapeCSV = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;

export const exportEventsCSV = (events: Event[]): string => {
    const headers = 'Title,Start,End,All Day,Category,Color';
    const rows = events.map(e =>
        `${escapeCSV(e.title)},${new Date(e.startTime).toISOString()},${new Date(e.endTime).toISOString()},${e.isAllDay},${escapeCSV(e.category || '')},${e.color || ''}`
    );
    return [headers, ...rows].join('\n');
};

export const exportTasksCSV = (tasks: Task[]): string => {
    const headers = 'Title,Status,Priority,Due Date,Tags,Category';
    const rows = tasks.map(t =>
        `${escapeCSV(t.title)},${t.status},${t.priority},${t.dueDate ? new Date(t.dueDate).toISOString() : ''},${escapeCSV(t.tags.join(';'))},${escapeCSV(t.category)}`
    );
    return [headers, ...rows].join('\n');
};

export const exportNotesCSV = (notes: Note[]): string => {
    const headers = 'Title,Tags,Category,Word Count,Created,Updated';
    const rows = notes.map(n =>
        `${escapeCSV(n.title)},${escapeCSV(n.tags.join(';'))},${escapeCSV(n.category)},${n.wordCount},${new Date(n.createdAt).toISOString()},${new Date(n.updatedAt).toISOString()}`
    );
    return [headers, ...rows].join('\n');
};

// ── JSON Import ──

export interface ImportResult {
    success: boolean;
    message: string;
    counts?: { events: number; tasks: number; notes: number };
}

export const importAllData = (jsonString: string): ImportResult => {
    try {
        const data = JSON.parse(jsonString);

        if (!data.version) {
            return { success: false, message: 'Invalid backup file: missing version field.' };
        }

        let eventCount = 0, taskCount = 0, noteCount = 0;

        if (Array.isArray(data.events)) {
            localStorage.setItem('calendar-events', JSON.stringify(data.events));
            eventCount = data.events.length;
        }

        if (Array.isArray(data.tasks)) {
            localStorage.setItem('tasks', JSON.stringify(data.tasks));
            taskCount = data.tasks.length;
        }

        if (Array.isArray(data.notes)) {
            localStorage.setItem('notes', JSON.stringify(data.notes));
            noteCount = data.notes.length;
        }

        if (data.journal && typeof data.journal === 'object') {
            localStorage.setItem('daily-journal-default-user', JSON.stringify(data.journal));
        }

        return {
            success: true,
            message: `Imported ${eventCount} events, ${taskCount} tasks, ${noteCount} notes.`,
            counts: { events: eventCount, tasks: taskCount, notes: noteCount },
        };
    } catch {
        return { success: false, message: 'Failed to parse backup file. Ensure it is valid JSON.' };
    }
};

// ── Reset ──

export const resetAllData = () => {
    localStorage.removeItem('calendar-events');
    localStorage.removeItem('tasks');
    localStorage.removeItem('notes');
    localStorage.removeItem('daily-journal-default-user');
    localStorage.removeItem('focus-timer-state');
};
