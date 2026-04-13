import React, { useState } from 'react';
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar';
import { NoteList } from '@/components/notes/NoteList';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { useNoteContext } from '@/context/NoteContext';
import { FileText, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { PageHeaderRight } from '@/components/PageHeaderRight';

const Notes = () => {
    const { activeNote, addNote, setActiveNote } = useNoteContext();
    const isMobile = useIsMobile();

    // On mobile, show editor full-screen when a note is selected
    const showEditor = activeNote !== null;

    return (
        <div className="flex w-full h-screen bg-background overflow-hidden relative">
            {/* Left Sidebar */}
            <CalendarSidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <PageHeaderRight />
                
                <div className="flex flex-1 overflow-hidden">
                    {/* Mobile: show either list or editor, not both */}
                    {isMobile ? (
                        showEditor && activeNote ? (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Back button */}
                                <div className="flex items-center gap-2 p-2 border-b border-border">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setActiveNote(null)}
                                        className="gap-1"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Back
                                    </Button>
                                </div>
                                <NoteEditor note={activeNote} />
                            </div>
                        ) : (
                            <NoteList />
                        )
                    ) : (
                        /* Desktop: side-by-side layout */
                        <>
                    {/* Note List */}
                    <NoteList />

                    {/* Note Editor / Empty State */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {activeNote ? (
                            <NoteEditor note={activeNote} />
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center space-y-3">
                                    <FileText className="w-16 h-16 text-muted-foreground/20 mx-auto" />
                                    <h2 className="text-lg font-medium text-muted-foreground">Select a note</h2>
                                    <p className="text-sm text-muted-foreground/70">
                                        Choose a note from the list or create a new one
                                    </p>
                                    <Button variant="outline" onClick={() => addNote()} className="gap-1.5">
                                        <Plus className="w-4 h-4" />
                                        New Note
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
                </div>
            </div>
        </div>
    );
};

export default Notes;
