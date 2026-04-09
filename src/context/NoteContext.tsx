import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, ReactNode } from 'react';
import { Note } from '@/types/note';
import {
    loadNotes, saveNotes, searchNotes as searchNotesService,
    generateNoteId, getWordCount, getExcerpt
} from '@/services/noteService';
import { toast } from 'sonner';

// ========== Context Type ==========

interface NoteContextType {
    notes: Note[];
    activeNoteId: string | null;
    activeNote: Note | null;

    // CRUD
    addNote: (partial?: Partial<Note>) => Note;
    updateNote: (id: string, updates: Partial<Note>) => void;
    deleteNote: (id: string) => void;

    // Actions
    setActiveNote: (id: string | null) => void;
    togglePin: (id: string) => void;
    toggleFavorite: (id: string) => void;

    // Queries
    pinnedNotes: Note[];
    recentNotes: Note[];
    allTags: string[];
    notesByTag: (tag: string) => Note[];
    searchResults: Note[];

    // Filters
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    sortBy: 'updated' | 'created' | 'title';
    setSortBy: (sort: 'updated' | 'created' | 'title') => void;
    filterTag: string | null;
    setFilterTag: (tag: string | null) => void;
}

const NoteContext = createContext<NoteContextType | undefined>(undefined);

export const useNoteContext = () => {
    const ctx = useContext(NoteContext);
    if (!ctx) throw new Error('useNoteContext must be used within NoteProvider');
    return ctx;
};

// ========== Provider ==========

export const NoteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notes, setNotes] = useState<Note[]>(() => loadNotes());
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');
    const [filterTag, setFilterTag] = useState<string | null>(null);

    // Persist on change
    useEffect(() => {
        saveNotes(notes);
    }, [notes]);

    // Active note
    const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId) ?? null, [notes, activeNoteId]);

    // CRUD
    const addNote = useCallback((partial?: Partial<Note>) => {
        const now = new Date();
        const newNote: Note = {
            id: generateNoteId(),
            title: partial?.title || 'Untitled Note',
            content: partial?.content || '',
            excerpt: '',
            tags: partial?.tags || [],
            category: partial?.category || '',
            color: partial?.color || '#f8fafc',
            isPinned: false,
            isFavorite: false,
            linkedDate: partial?.linkedDate,
            linkedEventIds: partial?.linkedEventIds || [],
            createdAt: now,
            updatedAt: now,
            wordCount: 0,
            ...partial,
        };
        newNote.id = generateNoteId(); // Ensure unique ID
        newNote.createdAt = now;
        newNote.updatedAt = now;
        setNotes(prev => [newNote, ...prev]);
        setActiveNoteId(newNote.id);
        toast.success('Note created');
        return newNote;
    }, []);

    const updateNote = useCallback((id: string, updates: Partial<Note>) => {
        setNotes(prev => prev.map(n => {
            if (n.id !== id) return n;
            const updated = { ...n, ...updates, updatedAt: new Date() };
            // Auto-update word count and excerpt when content changes
            if (updates.content !== undefined) {
                updated.wordCount = getWordCount(updates.content);
                updated.excerpt = getExcerpt(updates.content);
            }
            return updated;
        }));
    }, []);

    const deleteNote = useCallback((id: string) => {
        setNotes(prev => {
            const noteToDelete = prev.find(n => n.id === id);
            if (noteToDelete) {
                toast.success('Note deleted', {
                    action: {
                        label: 'Undo',
                        onClick: () => setNotes(p => [noteToDelete, ...p]),
                    },
                    duration: 5000,
                });
            }
            return prev.filter(n => n.id !== id);
        });
        if (activeNoteId === id) {
            setActiveNoteId(null);
        }
    }, [activeNoteId]);

    // Actions
    const setActiveNote = useCallback((id: string | null) => {
        // Auto-clean: if the previously active note is empty and untitled, remove it
        setNotes(prev => {
            if (activeNoteId && activeNoteId !== id) {
                const prevNote = prev.find(n => n.id === activeNoteId);
                if (prevNote && prevNote.title === 'Untitled Note' && !prevNote.content.trim()) {
                    return prev.filter(n => n.id !== activeNoteId);
                }
            }
            return prev;
        });
        setActiveNoteId(id);
    }, [activeNoteId]);

    const togglePin = useCallback((id: string) => {
        setNotes(prev => prev.map(n =>
            n.id === id ? { ...n, isPinned: !n.isPinned, updatedAt: new Date() } : n
        ));
    }, []);

    const toggleFavorite = useCallback((id: string) => {
        setNotes(prev => prev.map(n =>
            n.id === id ? { ...n, isFavorite: !n.isFavorite, updatedAt: new Date() } : n
        ));
    }, []);

    // Queries
    const sortedNotes = useMemo(() => {
        let filtered = [...notes];
        if (filterTag) {
            filtered = filtered.filter(n => n.tags.includes(filterTag));
        }
        return filtered.sort((a, b) => {
            if (sortBy === 'updated') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            if (sortBy === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            return a.title.localeCompare(b.title);
        });
    }, [notes, sortBy, filterTag]);

    const pinnedNotes = useMemo(() => sortedNotes.filter(n => n.isPinned), [sortedNotes]);
    const recentNotes = useMemo(() => sortedNotes.filter(n => !n.isPinned), [sortedNotes]);

    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        notes.forEach(n => n.tags.forEach(t => tagSet.add(t)));
        return Array.from(tagSet).sort();
    }, [notes]);

    const notesByTagFn = useCallback((tag: string) => notes.filter(n => n.tags.includes(tag)), [notes]);

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return sortedNotes;
        return searchNotesService(sortedNotes, searchQuery);
    }, [sortedNotes, searchQuery]);

    const value: NoteContextType = {
        notes,
        activeNoteId,
        activeNote,
        addNote,
        updateNote,
        deleteNote,
        setActiveNote,
        togglePin,
        toggleFavorite,
        pinnedNotes,
        recentNotes,
        allTags,
        notesByTag: notesByTagFn,
        searchResults,
        searchQuery,
        setSearchQuery,
        sortBy,
        setSortBy,
        filterTag,
        setFilterTag,
    };

    return <NoteContext.Provider value={value}>{children}</NoteContext.Provider>;
};
