import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef, ReactNode } from 'react';
import { Note } from '@/types/note';
import {
    searchNotes as searchNotesService,
    generateNoteId, getWordCount, getExcerpt
} from '@/services/noteService';
import * as noteSupabaseService from '@/services/supabase/noteSupabaseService';
import { mapV1ToV2, mapV2ToV1, mapV1UpdateToV2 } from '@/utils/noteTypeMapper';
import { useAuthContext } from './AuthContext';
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
    const { user } = useAuthContext();
    const userId = user?.id;

    const [notes, setNotes] = useState<Note[]>([]);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');
    const [filterTag, setFilterTag] = useState<string | null>(null);

    // Track raw v2 metadata per note ID so update mapper can merge correctly
    const metadataByNoteId = useRef<Record<string, Record<string, unknown>>>({});

    // Track latest activeNoteId for use inside async error handlers
    const activeNoteIdRef = useRef<string | null>(null);
    useEffect(() => { activeNoteIdRef.current = activeNoteId; }, [activeNoteId]);

    // ── Refetch helper ───────────────────────────────────────────────
    const refetchFromSupabase = useCallback(async () => {
        if (!userId) return;
        try {
            const rows = await noteSupabaseService.fetchNotes(userId);
            metadataByNoteId.current = {};
            const v1Notes = rows.map((row) => {
                metadataByNoteId.current[row.id] = row.metadata ?? {};
                return mapV2ToV1(row);
            });
            setNotes(v1Notes);
        } catch (err) {
            console.error('[NoteContext] Failed to fetch notes from Supabase:', err);
        }
    }, [userId]);

    // ── Fetch on mount + realtime subscription ───────────────────────
    useEffect(() => {
        if (!userId) return;
        refetchFromSupabase();
        const unsubscribe = noteSupabaseService.subscribeToNotes(userId, () => {
            refetchFromSupabase();
        });
        return () => { unsubscribe(); };
    }, [userId, refetchFromSupabase]);

    // Active note
    const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId) ?? null, [notes, activeNoteId]);

    // CRUD
    const addNote = useCallback((partial?: Partial<Note>) => {
        const now = new Date();
        const noteId = generateNoteId();
        const newNote: Note = {
            id: noteId,
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
            // Re-override the auto-generated fields after spread
            id: noteId,
            createdAt: now,
            updatedAt: now,
        };
        // Optimistic local update
        setNotes(prev => [newNote, ...prev]);
        setActiveNoteId(newNote.id);
        toast.success('Note created');

        if (userId) {
            const v2Note = mapV1ToV2(newNote, userId);
            noteSupabaseService.createNote(userId, v2Note).then((row) => {
                metadataByNoteId.current[row.id] = row.metadata ?? {};
            }).catch((err) => {
                console.error('[NoteContext] Supabase createNote failed, rolling back:', err);
                setNotes(prev => prev.filter(n => n.id !== newNote.id));
                if (activeNoteIdRef.current === newNote.id) setActiveNoteId(null);
            });
        }

        return newNote;
    }, [userId]);

    const updateNote = useCallback((id: string, updates: Partial<Note>) => {
        let previous: Note | undefined;
        const now = new Date();
        // Compute the updated patch with derived fields so we can pass them to the mapper too
        const patch: Partial<Note> = { ...updates, updatedAt: now };
        if (updates.content !== undefined) {
            patch.wordCount = getWordCount(updates.content);
        }

        setNotes(prev => prev.map(n => {
            if (n.id !== id) return n;
            previous = n;
            const updated: Note = { ...n, ...patch };
            // Auto-update excerpt when content changes (excerpt is derived, not persisted in v2)
            if (updates.content !== undefined) {
                updated.excerpt = getExcerpt(updates.content);
            }
            return updated;
        }));

        const existingMeta = metadataByNoteId.current[id] ?? {};
        const v2Updates = mapV1UpdateToV2(patch, existingMeta);
        noteSupabaseService.updateNote(id, v2Updates).then((row) => {
            metadataByNoteId.current[id] = row.metadata ?? {};
        }).catch((err) => {
            console.error('[NoteContext] Supabase updateNote failed, rolling back:', err);
            if (previous) {
                setNotes(prev => prev.map(n => n.id === id ? previous! : n));
            }
        });
    }, []);

    const deleteNote = useCallback((id: string) => {
        let deleted: Note | undefined;
        setNotes(prev => {
            deleted = prev.find(n => n.id === id);
            if (deleted) {
                toast.success('Note deleted', {
                    action: {
                        label: 'Undo',
                        onClick: () => {
                            setNotes(p => [deleted!, ...p]);
                            if (userId && deleted) {
                                const v2Note = mapV1ToV2(deleted, userId);
                                noteSupabaseService.createNote(userId, v2Note).then((row) => {
                                    metadataByNoteId.current[row.id] = row.metadata ?? {};
                                }).catch((err) => {
                                    console.error('[NoteContext] Undo: failed to recreate note in Supabase:', err);
                                });
                            }
                        },
                    },
                    duration: 5000,
                });
            }
            return prev.filter(n => n.id !== id);
        });
        if (activeNoteId === id) {
            setActiveNoteId(null);
        }

        noteSupabaseService.deleteNote(id).then(() => {
            delete metadataByNoteId.current[id];
        }).catch((err) => {
            console.error('[NoteContext] Supabase deleteNote failed, rolling back:', err);
            if (deleted) {
                setNotes(prev => [deleted!, ...prev]);
            }
        });
    }, [activeNoteId, userId]);

    // Actions
    const setActiveNote = useCallback((id: string | null) => {
        // Auto-clean: if the previously active note is empty and untitled, remove it
        let toCleanupId: string | null = null;
        setNotes(prev => {
            if (activeNoteId && activeNoteId !== id) {
                const prevNote = prev.find(n => n.id === activeNoteId);
                if (prevNote && prevNote.title === 'Untitled Note' && !prevNote.content.trim()) {
                    toCleanupId = activeNoteId;
                    return prev.filter(n => n.id !== activeNoteId);
                }
            }
            return prev;
        });
        setActiveNoteId(id);

        // If we just removed an empty draft, also delete it remotely
        if (toCleanupId) {
            noteSupabaseService.deleteNote(toCleanupId).then(() => {
                delete metadataByNoteId.current[toCleanupId!];
            }).catch((err) => {
                console.error('[NoteContext] Cleanup deleteNote failed:', err);
            });
        }
    }, [activeNoteId]);

    const togglePin = useCallback((id: string) => {
        let nextPinned = false;
        const now = new Date();
        setNotes(prev => prev.map(n => {
            if (n.id !== id) return n;
            nextPinned = !n.isPinned;
            return { ...n, isPinned: nextPinned, updatedAt: now };
        }));

        noteSupabaseService.updateNote(id, {
            is_pinned: nextPinned,
            updated_at: now.toISOString(),
        }).then((row) => {
            metadataByNoteId.current[id] = row.metadata ?? {};
        }).catch((err) => {
            console.error('[NoteContext] Supabase togglePin failed:', err);
        });
    }, []);

    const toggleFavorite = useCallback((id: string) => {
        let nextFavorite = false;
        const now = new Date();
        setNotes(prev => prev.map(n => {
            if (n.id !== id) return n;
            nextFavorite = !n.isFavorite;
            return { ...n, isFavorite: nextFavorite, updatedAt: now };
        }));

        const existingMeta = metadataByNoteId.current[id] ?? {};
        const v2Updates = mapV1UpdateToV2({ isFavorite: nextFavorite, updatedAt: now }, existingMeta);
        noteSupabaseService.updateNote(id, v2Updates).then((row) => {
            metadataByNoteId.current[id] = row.metadata ?? {};
        }).catch((err) => {
            console.error('[NoteContext] Supabase toggleFavorite failed:', err);
        });
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
