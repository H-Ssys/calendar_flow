import React from 'react';
import { Event } from '@/context/CalendarContext';
import { format, isToday, isTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Copy, Trash2 } from 'lucide-react';

interface EventCardProps {
    event: Event;
    isSelected: boolean;
    onSelect: () => void;
    onClick: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    getCategoryColor: (cat?: string) => string;
    isPast?: boolean;
}

const getSmartDate = (date: Date): string => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
};

export const EventCard: React.FC<EventCardProps> = ({
    event, isSelected, onSelect, onClick, onDuplicate, onDelete, getCategoryColor, isPast,
}) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const durationMin = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    const durationLabel = durationMin >= 60
        ? `${Math.floor(durationMin / 60)}h${durationMin % 60 > 0 ? ` ${durationMin % 60}m` : ''}`
        : `${durationMin}m`;

    return (
        <div
            className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-pointer",
                isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-background hover:bg-muted/30 hover:border-border/80",
                isPast && "opacity-60"
            )}
            onClick={onClick}
        >
            {/* Checkbox */}
            <button
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
                className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/30 hover:border-primary/50"
                )}
            >
                {isSelected && (
                    <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </button>

            {/* Color dot + Emoji */}
            <div className="flex items-center gap-2 flex-shrink-0">
                <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: event.color || getCategoryColor(event.category) }}
                />
                <span className="text-base">{event.emoji}</span>
            </div>

            {/* Title + Description */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-sm font-medium text-foreground truncate",
                        isPast && "line-through"
                    )}>
                        {event.title}
                    </span>
                    {event.recurrence && event.recurrence !== 'none' && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            🔁 {event.recurrence}
                        </span>
                    )}
                </div>
                {event.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{event.description}</p>
                )}
            </div>

            {/* Category badge */}
            {event.category && (
                <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                    style={{
                        backgroundColor: `${getCategoryColor(event.category)}20`,
                        color: getCategoryColor(event.category),
                    }}
                >
                    {event.category}
                </span>
            )}

            {/* Date + time */}
            <div className="flex-shrink-0 text-right">
                <div className="text-xs font-medium text-foreground">{getSmartDate(start)}</div>
                <div className="text-[10px] text-muted-foreground">
                    {event.isAllDay
                        ? 'All day'
                        : `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`
                    }
                    <span className="ml-1 opacity-60">({durationLabel})</span>
                </div>
            </div>

            {/* Participants count */}
            {event.participants && event.participants.length > 0 && (
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    👥 {event.participants.length}
                </span>
            )}

            {/* Quick actions */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                    onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Duplicate"
                >
                    <Copy className="w-3 h-3" />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    title="Delete"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
};
