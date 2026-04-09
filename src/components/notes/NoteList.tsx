import React from 'react';
import { useNoteContext } from '@/context/NoteContext';
import { NoteCard } from './NoteCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Pin, Clock, Tag, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export const NoteList: React.FC = () => {
    const {
        pinnedNotes,
        recentNotes,
        searchResults,
        allTags,
        activeNoteId,
        setActiveNote,
        addNote,
        searchQuery,
        setSearchQuery,
        filterTag,
        setFilterTag,
    } = useNoteContext();

    const isSearching = searchQuery.trim().length > 0;
    const displayNotes = isSearching ? searchResults : null;

    return (
        <div className="flex flex-col h-full w-[300px] border-r border-border bg-muted/20">
            {/* Header */}
            <div className="p-3 border-b border-border space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        Notes
                    </h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addNote()}
                        className="h-7 w-7 p-0"
                        title="New note"
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 border border-input rounded-lg px-2.5 h-8 bg-background focus-within:ring-2 focus-within:ring-ring">
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
                {isSearching ? (
                    /* Search Results */
                    <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground px-2 uppercase font-semibold tracking-wider">
                            {displayNotes?.length} result{displayNotes?.length !== 1 ? 's' : ''}
                        </p>
                        {displayNotes?.map(note => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                isActive={note.id === activeNoteId}
                                onClick={() => setActiveNote(note.id)}
                            />
                        ))}
                        {displayNotes?.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4">No notes found</p>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Pinned */}
                        {pinnedNotes.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground px-2 uppercase font-semibold tracking-wider flex items-center gap-1">
                                    <Pin className="w-3 h-3" /> Pinned
                                </p>
                                {pinnedNotes.map(note => (
                                    <NoteCard
                                        key={note.id}
                                        note={note}
                                        isActive={note.id === activeNoteId}
                                        onClick={() => setActiveNote(note.id)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Recent */}
                        <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground px-2 uppercase font-semibold tracking-wider flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Recent
                            </p>
                            {recentNotes.map(note => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    isActive={note.id === activeNoteId}
                                    onClick={() => setActiveNote(note.id)}
                                />
                            ))}
                            {recentNotes.length === 0 && pinnedNotes.length === 0 && (
                                <div className="text-center py-8 space-y-2">
                                    <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                                    <p className="text-xs text-muted-foreground">No notes yet</p>
                                    <Button variant="outline" size="sm" onClick={() => addNote()} className="text-xs">
                                        <Plus className="w-3 h-3 mr-1" /> Create your first note
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Tags */}
                        {allTags.length > 0 && (
                            <div className="space-y-1.5">
                                <p className="text-[10px] text-muted-foreground px-2 uppercase font-semibold tracking-wider flex items-center gap-1">
                                    <Tag className="w-3 h-3" /> Tags
                                </p>
                                <div className="flex flex-wrap gap-1 px-2">
                                    <Badge
                                        variant={filterTag === null ? "default" : "secondary"}
                                        className="text-[10px] px-2 py-0.5 cursor-pointer"
                                        onClick={() => setFilterTag(null)}
                                    >
                                        All
                                    </Badge>
                                    {allTags.map(tag => (
                                        <Badge
                                            key={tag}
                                            variant={filterTag === tag ? "default" : "secondary"}
                                            className="text-[10px] px-2 py-0.5 cursor-pointer"
                                            onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                                        >
                                            #{tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
