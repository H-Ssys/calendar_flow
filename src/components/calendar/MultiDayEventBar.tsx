import React from 'react';
import { Event, isMultiDayEvent, getEventDurationDays, useCalendar } from '@/context/CalendarContext';
import { format, isSameDay } from 'date-fns';

interface MultiDayEventBarProps {
    event: Event;
    startDayIndex: number; // 0-6 for week view
    visibleDays: number; // How many days to show (for partial weeks)
    onClick?: (event: Event) => void;
}

export const MultiDayEventBar: React.FC<MultiDayEventBarProps> = ({
    event,
    startDayIndex,
    visibleDays,
    onClick
}) => {
    const isMultiDay = isMultiDayEvent(event);
    const durationDays = isMultiDay ? getEventDurationDays(event) : 1;
    const { getCategoryColor } = useCalendar();

    // Calculate how many columns this event should span
    const endDayIndex = Math.min(startDayIndex + durationDays - 1, visibleDays - 1);
    const spanDays = endDayIndex - startDayIndex + 1;

    // Calculate width percentage (each day is 1/7 of the container)
    const dayWidth = 100 / visibleDays;
    const leftPercent = startDayIndex * dayWidth;
    const widthPercent = spanDays * dayWidth;

    // Determine if this is a partial span (continues before/after visible range)
    const startsBeforeWeek = startDayIndex < 0;
    const endsAfterWeek = endDayIndex >= visibleDays;

    return (
        <div
            className="absolute px-1 pointer-events-auto cursor-pointer group"
            style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                top: 0,
                height: '2rem',
                zIndex: 20
            }}
            onClick={() => onClick?.(event)}
        >
            <div
                className="h-full rounded-md px-2 py-1 flex items-center justify-between overflow-hidden transition-all group-hover:shadow-md"
                style={{
                    backgroundColor: getCategoryColor(event.category, event.color),
                    borderLeft: startsBeforeWeek ? '3px solid rgba(0,0,0,0.3)' : undefined,
                    borderRight: endsAfterWeek ? '3px solid rgba(0,0,0,0.3)' : undefined
                }}
            >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {!startsBeforeWeek && (
                        <span className="text-sm flex-shrink-0">{event.emoji}</span>
                    )}
                    <span className="text-xs font-medium text-gray-800 truncate">
                        {event.title}
                    </span>
                </div>

                {isMultiDay && !endsAfterWeek && (
                    <span className="text-[10px] text-gray-600 flex-shrink-0 ml-1">
                        {durationDays}d
                    </span>
                )}

                {/* Continuation indicators */}
                {startsBeforeWeek && (
                    <span className="text-xs text-gray-600 mr-1">←</span>
                )}
                {endsAfterWeek && (
                    <span className="text-xs text-gray-600 ml-1">→</span>
                )}
            </div>
        </div>
    );
};
