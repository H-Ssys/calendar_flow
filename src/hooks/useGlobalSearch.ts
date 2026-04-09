// ──────────────────────────────────────────────────
// useGlobalSearch — Unified search across events, tasks, notes
// ──────────────────────────────────────────────────

import { useMemo } from 'react';
import { useCalendar, Event } from '@/context/CalendarContext';
import { useTaskContext } from '@/context/TaskContext';
import { useNoteContext } from '@/context/NoteContext';
import { Task } from '@/types/task';
import { Note } from '@/types/note';

export interface GlobalSearchResults {
    events: Event[];
    tasks: Task[];
    notes: Note[];
    total: number;
}

export const useGlobalSearch = (query: string): GlobalSearchResults => {
    const { events } = useCalendar();
    const { tasks } = useTaskContext();
    const { notes } = useNoteContext();

    return useMemo(() => {
        const empty: GlobalSearchResults = { events: [], tasks: [], notes: [], total: 0 };
        if (!query.trim()) return empty;

        const q = query.toLowerCase();

        const matchedEvents = events.filter(e =>
            e.title.toLowerCase().includes(q) ||
            e.description?.toLowerCase().includes(q) ||
            e.category?.toLowerCase().includes(q)
        );

        const matchedTasks = tasks.filter(t =>
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.tags.some(tag => tag.toLowerCase().includes(q))
        );

        const matchedNotes = notes.filter(n =>
            n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q) ||
            n.tags.some(tag => tag.toLowerCase().includes(q))
        );

        return {
            events: matchedEvents.slice(0, 10),
            tasks: matchedTasks.slice(0, 10),
            notes: matchedNotes.slice(0, 10),
            total: matchedEvents.length + matchedTasks.length + matchedNotes.length,
        };
    }, [query, events, tasks, notes]);
};
