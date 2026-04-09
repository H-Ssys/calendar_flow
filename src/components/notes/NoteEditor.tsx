import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Note, NOTE_COLORS } from '@/types/note';
import { useNoteContext } from '@/context/NoteContext';
import { TagManager } from './TagManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Pin, Star, Trash2, Calendar, Eye, Pencil,
    Bold, Italic, List, ListOrdered, Code, Link2, Quote, Heading2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface NoteEditorProps {
    note: Note;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ note }) => {
    const { updateNote, deleteNote, togglePin, toggleFavorite, allTags, setActiveNote } = useNoteContext();
    const [isPreview, setIsPreview] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [localContent, setLocalContent] = useState(note.content);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout>();

    // Sync local content when note changes (switching notes)
    useEffect(() => {
        setLocalContent(note.content);
    }, [note.id]);

    // Debounced save
    const debouncedUpdate = useCallback((id: string, updates: Partial<Note>) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            updateNote(id, updates);
        }, 500);
    }, [updateNote]);

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, []);

    const insertMarkdown = (prefix: string, suffix: string = '') => {
        const ta = textareaRef.current;
        if (!ta) return;

        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const selected = localContent.substring(start, end);
        const before = localContent.substring(0, start);
        const after = localContent.substring(end);

        const newContent = before + prefix + selected + suffix + after;
        setLocalContent(newContent);
        updateNote(note.id, { content: newContent });

        // Restore cursor
        setTimeout(() => {
            ta.focus();
            ta.selectionStart = start + prefix.length;
            ta.selectionEnd = start + prefix.length + selected.length;
        }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') { e.preventDefault(); insertMarkdown('**', '**'); }
            if (e.key === 'i') { e.preventDefault(); insertMarkdown('*', '*'); }
            if (e.key === 'k') { e.preventDefault(); insertMarkdown('[', '](url)'); }
        }
    };

    const handleDelete = () => {
        if (confirmDelete) {
            deleteNote(note.id);
        } else {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
        }
    };



    return (
        <div className="flex flex-col h-full bg-background">
            {/* Editor Header */}
            <div className="border-b border-border px-4 py-3 space-y-2.5">
                {/* Title */}
                <Input
                    value={note.title}
                    onChange={(e) => updateNote(note.id, { title: e.target.value })}
                    className="text-lg font-bold border-none shadow-none px-0 focus-visible:ring-0 h-auto"
                    placeholder="Untitled Note"
                />

                {/* Tags + Actions */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                        <TagManager
                            tags={note.tags}
                            allTags={allTags}
                            onChange={(tags) => updateNote(note.id, { tags })}
                        />
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePin(note.id)}
                            className={cn("h-7 w-7 p-0", note.isPinned && "text-primary")}
                            title={note.isPinned ? "Unpin" : "Pin"}
                        >
                            <Pin className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFavorite(note.id)}
                            className={cn("h-7 w-7 p-0", note.isFavorite && "text-amber-500")}
                            title={note.isFavorite ? "Unfavorite" : "Favorite"}
                        >
                            <Star className={cn("w-3.5 h-3.5", note.isFavorite && "fill-amber-500")} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDelete}
                            className={cn("h-7 w-7 p-0", confirmDelete && "text-destructive")}
                            title="Delete note"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>

                {/* Date + Color */}
                <div className="flex items-center gap-3 text-xs">
                    <Input
                        type="date"
                        value={note.linkedDate ? format(new Date(note.linkedDate), 'yyyy-MM-dd') : ''}
                        onChange={(e) => updateNote(note.id, {
                            linkedDate: e.target.value ? new Date(e.target.value) : undefined
                        })}
                        className="h-7 text-xs w-40"
                    />
                    <div className="flex items-center gap-1">
                        {NOTE_COLORS.map(c => (
                            <button
                                key={c.value}
                                onClick={() => updateNote(note.id, { color: c.value })}
                                className={cn(
                                    "w-4 h-4 rounded-full border transition-transform",
                                    note.color === c.value ? "scale-125 ring-2 ring-primary ring-offset-1" : "hover:scale-110"
                                )}
                                style={{ backgroundColor: c.value }}
                                title={c.name}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-4 py-1.5 border-b border-border">
                <div className="flex items-center gap-0.5">
                    {[
                        { icon: Bold, action: () => insertMarkdown('**', '**'), title: 'Bold (Ctrl+B)' },
                        { icon: Italic, action: () => insertMarkdown('*', '*'), title: 'Italic (Ctrl+I)' },
                        { icon: Code, action: () => insertMarkdown('`', '`'), title: 'Code' },
                        { icon: Heading2, action: () => insertMarkdown('## '), title: 'Heading' },
                        { icon: Quote, action: () => insertMarkdown('> '), title: 'Quote' },
                        { icon: List, action: () => insertMarkdown('- '), title: 'Bullet List' },
                        { icon: ListOrdered, action: () => insertMarkdown('1. '), title: 'Numbered List' },
                        { icon: Link2, action: () => insertMarkdown('[', '](url)'), title: 'Link (Ctrl+K)' },
                    ].map(({ icon: Icon, action, title }) => (
                        <Button
                            key={title}
                            variant="ghost"
                            size="sm"
                            onClick={action}
                            className="h-7 w-7 p-0"
                            title={title}
                            disabled={isPreview}
                        >
                            <Icon className="w-3.5 h-3.5" />
                        </Button>
                    ))}
                </div>
                <div className="ml-auto flex items-center gap-1">
                    <Button
                        variant={!isPreview ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setIsPreview(false)}
                        className="h-7 text-xs gap-1"
                    >
                        <Pencil className="w-3 h-3" /> Write
                    </Button>
                    <Button
                        variant={isPreview ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setIsPreview(true)}
                        className="h-7 text-xs gap-1"
                    >
                        <Eye className="w-3 h-3" /> Preview
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                {isPreview ? (
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        className="prose prose-sm dark:prose-invert max-w-none p-4"
                    >
                        {localContent}
                    </ReactMarkdown>
                ) : (
                    <textarea
                        ref={textareaRef}
                        value={localContent}
                        onChange={(e) => {
                            setLocalContent(e.target.value);
                            debouncedUpdate(note.id, { content: e.target.value });
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Start writing... (Markdown supported)"
                        className={cn(
                            "w-full h-full p-4 resize-none bg-transparent text-sm font-mono",
                            "text-foreground placeholder:text-muted-foreground outline-none",
                            "leading-relaxed"
                        )}
                        spellCheck={true}
                    />
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-4 py-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{note.wordCount} words</span>
                <span>Updated {format(new Date(note.updatedAt), 'MMM d, HH:mm')}</span>
            </div>
        </div>
    );
};
