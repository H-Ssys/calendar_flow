// ──────────────────────────────────────────────────
// useGlobalSearch — Unified search across events, tasks, notes
// ──────────────────────────────────────────────────

import { useMemo } from 'react';
import { useCalendar, Event } from '@/context/CalendarContext';
import { useTaskContext } from '@/context/TaskContext';
import { useNoteContext } from '@/context/NoteContext';
import { useContactContext } from '@/context/ContactContext';
import { Task } from '@/types/task';
import { Note } from '@/types/note';
import { Contact } from '@/types/contact';

export interface GlobalSearchResults {
    events: Event[];
    tasks: Task[];
    notes: Note[];
    contacts: Contact[];
    total: number;
}

export const useGlobalSearch = (query: string): GlobalSearchResults => {
    const { events } = useCalendar();
    const { tasks } = useTaskContext();
    const { notes } = useNoteContext();
    const { contacts } = useContactContext();

    return useMemo(() => {
        const empty: GlobalSearchResults = { events: [], tasks: [], notes: [], contacts: [], total: 0 };
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

        // Contact match: displayName, company, email, plus alt-language fields
        // (altFirstName/Last/Company) so multilingual cards are discoverable.
        const matchedContacts = contacts.filter(c =>
            c.displayName?.toLowerCase().includes(q) ||
            c.company?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.altFirstName?.toLowerCase().includes(q) ||
            c.altLastName?.toLowerCase().includes(q) ||
            c.altCompany?.toLowerCase().includes(q) ||
            c.tags?.some(tag => tag.toLowerCase().includes(q))
        );

        return {
            events: matchedEvents.slice(0, 10),
            tasks: matchedTasks.slice(0, 10),
            notes: matchedNotes.slice(0, 10),
            contacts: matchedContacts.slice(0, 10),
            total: matchedEvents.length + matchedTasks.length + matchedNotes.length + matchedContacts.length,
        };
    }, [query, events, tasks, notes, contacts]);
};
