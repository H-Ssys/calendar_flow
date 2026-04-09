
import React, { useState } from 'react';
import { Event, useCalendar } from '@/context/CalendarContext';
import { useTaskContext } from '@/context/TaskContext';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Clock, Copy, Files, Trash, ChevronRight, CalendarPlus, CalendarDays, ChevronLeft, CheckSquare } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { addDays, addWeeks, format } from 'date-fns';
import { toast } from 'sonner';

interface EventCardProps {
    event: Event;
    onClick?: (event: Event) => void;
    description?: string; // Kept for interface compatibility, though usually part of event
}

export const EventCard: React.FC<EventCardProps> = ({ event, onClick }) => {
    const { updateEvent, deleteEvent, addEvent, getCategoryColor } = useCalendar();
    const { tasks } = useTaskContext();
    const linkedTasks = tasks.filter(t => t.linkedEventIds.includes(event.id));
    const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
    const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
    const [rescheduleView, setRescheduleView] = useState<'menu' | 'on' | 'time'>('menu');

    // Event data for rescheduling
    const [rescheduleDate, setRescheduleDate] = useState(format(new Date(event.startTime), 'yyyy-MM-dd'));
    const [rescheduleFromTime, setRescheduleFromTime] = useState(format(new Date(event.startTime), 'HH:mm'));
    const [rescheduleToTime, setRescheduleToTime] = useState(format(new Date(event.endTime), 'HH:mm'));

    const handleEventClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsQuickEditOpen(true);
    };

    // Helper: apply a day offset to the event's start/end times
    const rescheduleByDays = (days: number) => {
        const newStart = addDays(new Date(event.startTime), days);
        const newEnd = addDays(new Date(event.endTime), days);
        updateEvent(event.id, { startTime: newStart, endTime: newEnd });
    };

    // Reschedule handlers
    const handlePostpone = () => {
        rescheduleByDays(1);
        toast.success('Postponed to tomorrow');
        setIsQuickEditOpen(false);
        setIsRescheduleOpen(false);
        setRescheduleView('menu');
    };

    const handleNextWeek = () => {
        const newStart = addWeeks(new Date(event.startTime), 1);
        const newEnd = addWeeks(new Date(event.endTime), 1);
        updateEvent(event.id, { startTime: newStart, endTime: newEnd });
        toast.success('Rescheduled to next week');
        setIsQuickEditOpen(false);
        setIsRescheduleOpen(false);
        setRescheduleView('menu');
    };

    const handleSameDay = () => {
        setRescheduleView('time');
    };

    const handleAfter = () => {
        rescheduleByDays(1);
        toast.success('Moved to next available slot');
        setIsQuickEditOpen(false);
        setIsRescheduleOpen(false);
        setRescheduleView('menu');
    };

    const handleMenuAction = (action: string, e: React.MouseEvent) => {
        e.stopPropagation();

        switch (action) {
            case 'edit':
                setIsQuickEditOpen(false);
                onClick?.(event);
                break;
            case 'copy': {
                const timeStr = `${format(new Date(event.startTime), 'h:mm a')} – ${format(new Date(event.endTime), 'h:mm a')}`;
                navigator.clipboard.writeText(`${event.title} - ${timeStr}`);
                toast.success('Copied to clipboard');
                setIsQuickEditOpen(false);
                break;
            }
            case 'duplicate': {
                const { id, ...rest } = event;
                addEvent({ ...rest, title: `${event.title} (copy)` });
                toast.success('Event duplicated');
                setIsQuickEditOpen(false);
                break;
            }
            case 'delete': {
                deleteEvent(event.id);
                toast.success('Event deleted');
                setIsQuickEditOpen(false);
                break;
            }
        }
    };

    return (
        <>
            <Popover open={isQuickEditOpen} onOpenChange={setIsQuickEditOpen}>
                <PopoverTrigger asChild>
                    <div
                        onClick={handleEventClick}
                        className={cn(
                            "rounded-xl p-1.5 text-[10px] cursor-pointer hover:opacity-90 transition-all flex flex-col gap-0.5 overflow-hidden h-full shadow-sm min-w-0 border border-black/5",
                        )}
                        style={{
                            backgroundColor: getCategoryColor(event.category, event.color),
                        }}
                    >
                        <div className="font-semibold text-xs leading-tight line-clamp-2 break-words min-w-0">
                            {event.title}
                        </div>

                        <div className="text-[9px] opacity-60 font-medium leading-none whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
                            {`${format(new Date(event.startTime), 'HH:mm')} - ${format(new Date(event.endTime), 'HH:mm')}`}
                        </div>

                        <div className="flex-1" /> {/* Spacer to push avatars to bottom */}

                        {event.participants && event.participants.length > 0 && (
                            <div className="flex items-center -space-x-1.5 mt-1">
                                {event.participants.slice(0, 3).map((p, i) => (
                                    <div
                                        key={i}
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border border-background ring-1 ring-border"
                                        style={{
                                            backgroundColor: stringToColor(p.name),
                                            color: 'white'
                                        }}
                                        title={p.name}
                                    >
                                        {p.name.charAt(0).toUpperCase()}
                                    </div>
                                ))}
                                {event.participants.length > 3 && (
                                    <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center text-[8px] font-bold border border-border text-muted-foreground shadow-sm z-10">
                                        +{event.participants.length - 3}
                                    </div>
                                )}
                            </div>
                        )}
                        {linkedTasks.length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                                <CheckSquare className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">
                                    {linkedTasks.filter(t => t.status === 'done').length}/{linkedTasks.length}
                                </span>
                            </div>
                        )}
                    </div>
                </PopoverTrigger>

                <PopoverContent
                    className="w-[240px] p-2 bg-popover/95 backdrop-blur-md shadow-lg border border-border rounded-xl"
                    align="start"
                    side="right"
                    sideOffset={8}
                >
                    {/* Color Palette */}
                    <div className="flex items-center gap-2 px-3 py-3 mb-2">
                        {['#FCA5A5', '#86EFAC', '#93C5FD', '#A78BFA', '#C084FC', '#F9A8D4', '#FB923C', '#FBBF24', '#FDE68A', '#D9F99D', '#A7F3D0'].map((color, idx) => (
                            <button
                                key={idx}
                                className="w-5 h-5 rounded-full hover:scale-110 transition-transform border-2 border-transparent hover:border-muted-foreground/30"
                                style={{ backgroundColor: color }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    updateEvent(event.id, { color });
                                    toast.success('Color updated');
                                    setIsQuickEditOpen(false);
                                }}
                            />
                        ))}
                    </div>

                    {/* Menu Items */}
                    <div className="space-y-1">
                        {/* Edit Event Details Form */}
                        <button
                            onClick={(e) => handleMenuAction('edit', e)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            <Edit className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">Edit Event Details Form</span>
                        </button>

                        {/* Reschedule - nested popover */}
                        <Popover open={isRescheduleOpen} onOpenChange={(open) => {
                            setIsRescheduleOpen(open);
                            if (!open) setRescheduleView('menu');
                        }}>
                            <PopoverTrigger asChild>
                                <button
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                                >
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium flex-1 text-left">Reschedule</span>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-[280px] p-0"
                                side="right"
                                align="start"
                                sideOffset={8}
                            >
                                {rescheduleView === 'menu' ? (
                                    <>
                                        <div className="p-2 space-y-1">
                                            <button
                                                onClick={handlePostpone}
                                                className="flex items-start gap-3 w-full p-2 hover:bg-muted rounded-lg transition-colors text-left group"
                                            >
                                                <div className="mt-0.5 text-teal-600 group-hover:text-teal-700">
                                                    <CalendarPlus className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm text-foreground">Postpone</div>
                                                    <div className="text-xs text-muted-foreground">Same time - Next day</div>
                                                </div>
                                            </button>

                                            <button
                                                onClick={handleNextWeek}
                                                className="flex items-start gap-3 w-full p-2 hover:bg-muted rounded-lg transition-colors text-left group"
                                            >
                                                <div className="mt-0.5 text-purple-600 group-hover:text-purple-700">
                                                    <CalendarDays className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm text-foreground">Next week</div>
                                                    <div className="text-xs text-muted-foreground">Same time - Next week</div>
                                                </div>
                                            </button>
                                        </div>

                                        <div className="h-[1px] bg-border mx-2 my-1" />

                                        <div className="p-2 space-y-1">
                                            <button
                                                onClick={handleSameDay}
                                                className="flex items-start gap-3 w-full p-2 hover:bg-muted rounded-lg transition-colors text-left group"
                                            >
                                                <div className="mt-0.5 text-blue-600 group-hover:text-blue-700">
                                                    <Clock className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm text-foreground">Same-Day Reschedule</div>
                                                    <div className="text-xs text-muted-foreground">Next 1 hour</div>
                                                </div>
                                            </button>
                                            <button
                                                onClick={handleAfter}
                                                className="flex items-start gap-3 w-full p-2 hover:bg-muted rounded-lg transition-colors text-left group"
                                            >
                                                <div className="mt-0.5 text-orange-600 group-hover:text-orange-700">
                                                    <ChevronRight className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm text-foreground">After</div>
                                                    <div className="text-xs text-muted-foreground">Move to next available</div>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => setRescheduleView('on')}
                                                className="flex items-start gap-3 w-full p-2 hover:bg-muted rounded-lg transition-colors text-left group"
                                            >
                                                <div className="mt-0.5 text-green-600 group-hover:text-green-700">
                                                    <CalendarDays className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm text-foreground">On</div>
                                                    <div className="text-xs text-muted-foreground">Pick a specific date</div>
                                                </div>
                                            </button>
                                        </div>
                                    </>
                                ) : rescheduleView === 'time' ? (
                                    <div className="p-2 space-y-3">
                                        <div className="flex items-center justify-between mb-2 px-1">
                                            <button
                                                onClick={() => setRescheduleView('menu')}
                                                className="p-1 hover:bg-muted rounded-md transition-colors"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <span className="text-sm font-semibold">Select Time</span>
                                            <div className="w-6" />
                                        </div>
                                        <div className="space-y-3 px-2">
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">Start Time</label>
                                                <Input
                                                    type="time"
                                                    value={rescheduleFromTime}
                                                    onChange={(e) => setRescheduleFromTime(e.target.value)}
                                                    className="h-8"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">End Time</label>
                                                <Input
                                                    type="time"
                                                    value={rescheduleToTime}
                                                    onChange={(e) => setRescheduleToTime(e.target.value)}
                                                    className="h-8"
                                                />
                                            </div>
                                            <Button
                                                size="sm"
                                                className="w-full mt-2"
                                                onClick={() => {
                                                    // Parse times and update event
                                                    const eventDate = new Date(event.startTime);
                                                    const [fromH, fromM] = rescheduleFromTime.split(':').map(Number);
                                                    const [toH, toM] = rescheduleToTime.split(':').map(Number);
                                                    const newStart = new Date(eventDate);
                                                    newStart.setHours(fromH, fromM, 0, 0);
                                                    const newEnd = new Date(eventDate);
                                                    newEnd.setHours(toH, toM, 0, 0);
                                                    updateEvent(event.id, { startTime: newStart, endTime: newEnd });
                                                    toast.success('Time updated');
                                                    setIsQuickEditOpen(false);
                                                    setIsRescheduleOpen(false);
                                                    setRescheduleView('menu');
                                                }}
                                            >
                                                Done
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-2">
                                        <div className="flex items-center justify-between mb-2 px-2">
                                            <button
                                                onClick={() => setRescheduleView('menu')}
                                                className="p-1 hover:bg-muted rounded-md transition-colors"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <span className="text-sm font-semibold">Select Date</span>
                                            <div className="w-6" />
                                        </div>
                                        <CalendarComponent
                                            mode="single"
                                            selected={new Date(rescheduleDate)}
                                            onSelect={(day) => {
                                                if (day) {
                                                    setRescheduleDate(format(day, 'yyyy-MM-dd'));
                                                    // Calculate day offset from current event date
                                                    const currentStart = new Date(event.startTime);
                                                    const currentEnd = new Date(event.endTime);
                                                    const dayDiff = Math.round((day.getTime() - new Date(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate()).getTime()) / (1000 * 60 * 60 * 24));
                                                    if (dayDiff !== 0) {
                                                        updateEvent(event.id, {
                                                            startTime: addDays(currentStart, dayDiff),
                                                            endTime: addDays(currentEnd, dayDiff),
                                                        });
                                                        toast.success(`Rescheduled to ${format(day, 'MMM d')}`);
                                                    }
                                                    setIsQuickEditOpen(false);
                                                    setIsRescheduleOpen(false);
                                                    setRescheduleView('menu');
                                                }
                                            }}
                                            initialFocus
                                        />
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>

                        {/* Copy */}
                        <button
                            onClick={(e) => handleMenuAction('copy', e)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            <Copy className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium flex-1 text-left">Copy</span>
                            <span className="text-xs text-muted-foreground">⌘ C</span>
                        </button>

                        {/* Duplicate */}
                        <button
                            onClick={(e) => handleMenuAction('duplicate', e)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            <Files className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium flex-1 text-left">Duplicate</span>
                            <span className="text-xs text-muted-foreground">⌘ D</span>
                        </button>

                        {/* Delete */}
                        <button
                            onClick={(e) => handleMenuAction('delete', e)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors mt-1 border-t border-border pt-3"
                        >
                            <Trash className="w-4 h-4" />
                            <span className="font-medium flex-1 text-left">Delete</span>
                            <span className="text-xs opacity-60">⌫</span>
                        </button>
                    </div>
                </PopoverContent>
            </Popover>
        </>
    );
};

// Helper to generate consistent avatar colors
function stringToColor(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
}
