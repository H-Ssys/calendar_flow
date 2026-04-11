// Note Service — pure helpers (search, ID generation, derived fields).
// Persistence lives in noteSupabaseService.
import { Note } from '@/types/note';

export const searchNotes = (notes: Note[], query: string): Note[] => {
    const q = query.toLowerCase().trim();
    if (!q) return notes;
    return notes.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
    );
};

export const getNotesByTag = (notes: Note[], tag: string): Note[] => {
    return notes.filter(n => n.tags.includes(tag));
};

export const getNotesForDate = (notes: Note[], date: Date): Note[] => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return notes.filter(n => {
        if (!n.linkedDate) return false;
        const d = new Date(n.linkedDate);
        return d >= start && d <= end;
    });
};

export const generateNoteId = (): string => {
    return `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
};

export const getWordCount = (content: string): number => {
    return content.trim().split(/\s+/).filter(w => w.length > 0).length;
};

export const getExcerpt = (content: string, maxLength: number = 100): string => {
    const plain = content
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`{1,3}[^`]*`{1,3}/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[>\-\[\]]/g, '')
        .replace(/\n+/g, ' ')
        .trim();
    if (plain.length <= maxLength) return plain;
    return plain.substring(0, maxLength).trim() + '...';
};
