import React, { useState } from 'react';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import { Calendar, CheckSquare, FileText, Users, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { useCalendar } from '@/context/CalendarContext';
import { useNoteContext } from '@/context/NoteContext';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface SearchCommandProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const SearchCommand: React.FC<SearchCommandProps> = ({ open, onOpenChange }) => {
    const [query, setQuery] = useState('');
    const results = useGlobalSearch(query);
    const { setDate, setView, getCategoryColor } = useCalendar();
    const { setActiveNote } = useNoteContext();
    const navigate = useNavigate();

    const close = () => {
        onOpenChange(false);
        setQuery('');
    };

    const handleEventSelect = (eventId: string, startTime: Date) => {
        setDate(new Date(startTime));
        setView('daily');
        navigate('/');
        close();
    };

    const handleTaskSelect = () => {
        navigate('/tasks');
        close();
    };

    const handleNoteSelect = (noteId: string) => {
        setActiveNote(noteId);
        navigate('/notes');
        close();
    };

    const handleContactSelect = () => {
        navigate('/contacts');
        close();
    };

    const hasResults = results.total > 0;
    const hasQuery = query.trim().length > 0;

    return (
        <CommandDialog open={open} onOpenChange={(val) => { if (!val) close(); else onOpenChange(val); }}>
            <CommandInput
                placeholder="Search events, tasks, notes..."
                value={query}
                onValueChange={setQuery}
            />
            <CommandList className="pb-2 max-h-[400px]">
                {hasQuery && !hasResults && (
                    <CommandEmpty>No results found.</CommandEmpty>
                )}

                {!hasQuery && (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Type to search across events, tasks, and notes
                    </div>
                )}

                {/* Events */}
                {results.events.length > 0 && (
                    <CommandGroup heading="Events">
                        {results.events.map(event => (
                            <CommandItem
                                key={event.id}
                                className="flex items-center gap-3 py-2.5 cursor-pointer"
                                onSelect={() => handleEventSelect(event.id, event.startTime)}
                            >
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                                    style={{ backgroundColor: getCategoryColor(event.category, event.color) }}
                                >
                                    {event.emoji}
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className="font-medium text-sm text-foreground truncate">{event.title}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {format(new Date(event.startTime), 'MMM d, h:mm a')}
                                    </span>
                                </div>
                                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {results.events.length > 0 && (results.tasks.length > 0 || results.notes.length > 0) && (
                    <CommandSeparator className="my-1" />
                )}

                {/* Tasks */}
                {results.tasks.length > 0 && (
                    <CommandGroup heading="Tasks">
                        {results.tasks.map(task => (
                            <CommandItem
                                key={task.id}
                                className="flex items-center gap-3 py-2.5 cursor-pointer"
                                onSelect={handleTaskSelect}
                            >
                                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className="font-medium text-sm text-foreground truncate">{task.title}</span>
                                    <span className="text-xs text-muted-foreground capitalize">
                                        {task.status.replace('-', ' ')} · {task.priority}
                                    </span>
                                </div>
                                {task.dueDate && (
                                    <span className="text-[11px] text-muted-foreground flex-shrink-0">
                                        {format(new Date(task.dueDate), 'MMM d')}
                                    </span>
                                )}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {results.tasks.length > 0 && (results.notes.length > 0 || results.contacts.length > 0) && (
                    <CommandSeparator className="my-1" />
                )}

                {/* Notes */}
                {results.notes.length > 0 && (
                    <CommandGroup heading="Notes">
                        {results.notes.map(note => (
                            <CommandItem
                                key={note.id}
                                className="flex items-center gap-3 py-2.5 cursor-pointer"
                                onSelect={() => handleNoteSelect(note.id)}
                            >
                                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className="font-medium text-sm text-foreground truncate">{note.title}</span>
                                    <span className="text-xs text-muted-foreground truncate">
                                        {note.excerpt || 'No content'}
                                    </span>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {results.notes.length > 0 && results.contacts.length > 0 && (
                    <CommandSeparator className="my-1" />
                )}

                {/* Contacts — snippet: "{name} · {company}" (+ altDisplayName if alt_language set) */}
                {results.contacts.length > 0 && (
                    <CommandGroup heading="Contacts">
                        {results.contacts.map(contact => {
                            const parts = [contact.displayName, contact.company].filter(Boolean) as string[];
                            let snippet = parts.join(' · ');
                            const altDisplay = [contact.altFirstName, contact.altLastName]
                                .filter(Boolean)
                                .join(' ')
                                .trim();
                            if (contact.alt_language && altDisplay && altDisplay !== contact.displayName) {
                                snippet = snippet ? `${snippet} (+ ${altDisplay})` : `(+ ${altDisplay})`;
                            }
                            return (
                                <CommandItem
                                    key={contact.id}
                                    className="flex items-center gap-3 py-2.5 cursor-pointer"
                                    onSelect={handleContactSelect}
                                >
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                                        style={{ backgroundColor: contact.color ?? '#a3a3a3' }}
                                    >
                                        {contact.displayName?.slice(0, 2).toUpperCase() || '?'}
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="font-medium text-sm text-foreground truncate">{contact.displayName}</span>
                                        {snippet && (
                                            <span className="text-xs text-muted-foreground truncate">{snippet}</span>
                                        )}
                                    </div>
                                    <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                </CommandItem>
                            );
                        })}
                    </CommandGroup>
                )}

                {hasQuery && hasResults && (
                    <div className="px-4 py-2 text-[11px] text-muted-foreground text-center">
                        {results.total} result{results.total !== 1 ? 's' : ''} found
                    </div>
                )}
            </CommandList>

            <div className="flex items-center gap-4 px-4 py-3 border-t border-border bg-muted/30">
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5 border border-border bg-background rounded p-0.5">
                        <ArrowUp className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-0.5 border border-border bg-background rounded p-0.5">
                        <ArrowDown className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground ml-1">Navigate</span>
                </div>

                <div className="flex items-center gap-1.5">
                    <div className="flex items-center justify-center border border-border bg-background rounded p-0.5 w-5 h-5">
                        <CornerDownLeft className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground">Open</span>
                </div>
            </div>
        </CommandDialog>
    );
};
