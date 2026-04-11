// ──────────────────────────────────────────────────
// Data Export / Import Service
// ──────────────────────────────────────────────────

import { Event } from '@/context/CalendarContext';
import { Task } from '@/types/task';
import { Note } from '@/types/note';
import * as eventSupabaseService from '@/services/supabase/eventSupabaseService';
import * as taskSupabaseService from '@/services/supabase/taskSupabaseService';
import * as noteSupabaseService from '@/services/supabase/noteSupabaseService';
import * as journalSupabaseService from '@/services/supabase/journalSupabaseService';
import * as focusSupabaseService from '@/services/supabase/focusSupabaseService';
import * as settingsSupabaseService from '@/services/supabase/settingsSupabaseService';
import { mapV2ToV1 as mapEventV2ToV1, mapV1ToV2 as mapEventV1ToV2 } from '@/utils/eventTypeMapper';
import { mapV2ToV1 as mapTaskV2ToV1, mapV1ToV2 as mapTaskV1ToV2 } from '@/utils/taskTypeMapper';
import { mapV2ToV1 as mapNoteV2ToV1, mapV1ToV2 as mapNoteV1ToV2 } from '@/utils/noteTypeMapper';
import { supabase } from '@ofative/supabase-client';

const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';

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
        tasks: JSON.parse(localStorage.getItem('ofative-tasks') || '[]'),
        notes: JSON.parse(localStorage.getItem('ofative-notes') || '[]'),
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
            localStorage.setItem('ofative-tasks', JSON.stringify(data.tasks));
            taskCount = data.tasks.length;
        }

        if (Array.isArray(data.notes)) {
            localStorage.setItem('ofative-notes', JSON.stringify(data.notes));
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
    localStorage.removeItem('ofative-tasks');
    localStorage.removeItem('ofative-notes');
    localStorage.removeItem('daily-journal-default-user');
    localStorage.removeItem('focus-timer-state');
};

// ──────────────────────────────────────────────────
// Async dual-mode API (Supabase + localStorage)
// ──────────────────────────────────────────────────
//
// These wrap the legacy sync functions when USE_SUPABASE is false. When the
// flag is on, they read/write through the Supabase service layer.

/** Export all data for a user as JSON. Dual-mode. */
export async function exportAllData(userId: string): Promise<string> {
    if (!USE_SUPABASE) {
        return exportAllDataJSON();
    }

    const [events, taskRes, notes, journal] = await Promise.all([
        eventSupabaseService.fetchEvents(userId),
        taskSupabaseService.fetchTasks(userId),
        noteSupabaseService.fetchNotes(userId),
        journalSupabaseService.fetchAllEntries(userId),
    ]);

    let settings = {};
    let profile = {};
    try {
        const res = await settingsSupabaseService.fetchSettings(userId);
        settings = res.settings;
        profile = res.profile;
    } catch (err) {
        console.error('[dataService] Failed to fetch settings for export:', err);
    }

    const data = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        source: 'supabase',
        events: events.map(mapEventV2ToV1),
        tasks: taskRes.tasks.map((row) =>
            mapTaskV2ToV1(row, taskRes.subtasksByTaskId[row.id] ?? [])
        ),
        notes: notes.map(mapNoteV2ToV1),
        journal: journal.map((row) => journalSupabaseService.mapV2ToV1(row, userId)),
        settings,
        profile,
    };
    return JSON.stringify(data, null, 2);
}

/** Import a backup JSON. Dual-mode. */
export async function importData(userId: string, jsonString: string): Promise<ImportResult> {
    if (!USE_SUPABASE) {
        return importAllData(jsonString);
    }

    let data: {
        events?: Event[];
        tasks?: Task[];
        notes?: Note[];
        journal?: unknown;
    };
    try {
        data = JSON.parse(jsonString);
    } catch {
        return { success: false, message: 'Failed to parse backup file. Ensure it is valid JSON.' };
    }

    let eventCount = 0, taskCount = 0, noteCount = 0;
    const errors: string[] = [];

    if (Array.isArray(data.events)) {
        for (const e of data.events) {
            try {
                const event = { ...e, startTime: new Date(e.startTime), endTime: new Date(e.endTime) };
                await eventSupabaseService.createEvent(userId, mapEventV1ToV2(event, userId));
                eventCount++;
            } catch (err) {
                errors.push(`Event "${e.title}": ${(err as Error).message ?? 'unknown'}`);
            }
        }
    }

    if (Array.isArray(data.tasks)) {
        for (const t of data.tasks) {
            try {
                const task: Task = {
                    ...t,
                    createdAt: new Date(t.createdAt),
                    updatedAt: new Date(t.updatedAt),
                    dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
                    completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
                };
                const v2Subtasks = (task.subtasks ?? []).map((s, i) => ({
                    id: s.id, title: s.title, is_completed: s.done, sort_order: i,
                }));
                await taskSupabaseService.createTask(userId, mapTaskV1ToV2(task, userId), v2Subtasks);
                taskCount++;
            } catch (err) {
                errors.push(`Task "${t.title}": ${(err as Error).message ?? 'unknown'}`);
            }
        }
    }

    if (Array.isArray(data.notes)) {
        for (const n of data.notes) {
            try {
                const note: Note = {
                    ...n,
                    createdAt: new Date(n.createdAt),
                    updatedAt: new Date(n.updatedAt),
                    linkedDate: n.linkedDate ? new Date(n.linkedDate) : undefined,
                };
                await noteSupabaseService.createNote(userId, mapNoteV1ToV2(note, userId));
                noteCount++;
            } catch (err) {
                errors.push(`Note "${n.title}": ${(err as Error).message ?? 'unknown'}`);
            }
        }
    }

    const message = errors.length > 0
        ? `Imported ${eventCount} events, ${taskCount} tasks, ${noteCount} notes (${errors.length} errors).`
        : `Imported ${eventCount} events, ${taskCount} tasks, ${noteCount} notes.`;

    return {
        success: errors.length === 0,
        message,
        counts: { events: eventCount, tasks: taskCount, notes: noteCount },
    };
}

/** Reset all data for a user. Dual-mode. */
export async function resetAllDataForUser(userId: string): Promise<void> {
    if (!USE_SUPABASE) {
        resetAllData();
        return;
    }

    // Delete user-scoped rows from each table. RLS ensures we only touch own rows.
    const tables = ['events', 'tasks', 'notes', 'journal_entries', 'focus_sessions'];
    for (const table of tables) {
        try {
            const { error } = await supabase.from(table).delete().eq('user_id', userId);
            if (error) throw error;
        } catch (err) {
            console.error(`[dataService] Failed to clear ${table}:`, err);
        }
    }

    // Clear settings JSONB (keep the profile row itself)
    try {
        await settingsSupabaseService.updateSettings(userId, {});
    } catch (err) {
        console.error('[dataService] Failed to clear settings:', err);
    }
}
