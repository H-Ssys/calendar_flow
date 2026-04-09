import React from 'react';
import { Event, isMultiDayEvent, getEventDurationDays, useCalendar } from '@/context/CalendarContext';
import { isSameDay, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface MonthlyEventBarProps {
    event: Event;
    weekDays: Date[]; // 7 days in the current week row
    rowIndex: number; // Which event row (0, 1, 2...)
    onClick?: (event: Event) => void;
    /** When true, skips own absolute positioning (used inside DraggableMonthlyEventBar) */
    inline?: boolean;
}

export const MonthlyEventBar: React.FC<MonthlyEventBarProps> = ({
    event,
    weekDays,
    rowIndex,
    onClick,
    inline = false,
}) => {
    const { getCategoryColor } = useCalendar();
    const eventStart = startOfDay(new Date(event.startTime));
    const eventEnd = endOfDay(new Date(event.endTime));

    // Find which days in this week the event spans
    let startDayIndex = -1;
    let endDayIndex = -1;

    weekDays.forEach((day, index) => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);

        if (isWithinInterval(dayStart, { start: eventStart, end: eventEnd }) ||
            isWithinInterval(eventStart, { start: dayStart, end: dayEnd })) {
            if (startDayIndex === -1) startDayIndex = index;
            endDayIndex = index;
        }
    });

    // Event doesn't appear in this week
    if (startDayIndex === -1) return null;

    const spanDays = endDayIndex - startDayIndex + 1;
    const dayWidth = 100 / 7; // 7 days per week
    const leftPercent = startDayIndex * dayWidth;
    const widthPercent = spanDays * dayWidth;

    // Check if event continues before/after this week
    const startsBeforeWeek = eventStart < startOfDay(weekDays[0]);
    const endsAfterWeek = eventEnd > endOfDay(weekDays[6]);

    const isMultiDay = isMultiDayEvent(event);

    // When inline (inside draggable wrapper), the wrapper already handles positioning
    if (inline) {
        return (
            <div
                className="w-full h-full px-1 pointer-events-auto cursor-pointer group"
            >
                <div
                    className="h-full rounded-sm px-1.5 flex items-center gap-1 overflow-hidden transition-all group-hover:shadow-md group-hover:scale-[1.01]"
                    style={{
                        backgroundColor: getCategoryColor(event.category, event.color),
                        borderLeft: startsBeforeWeek ? '2px solid rgba(0,0,0,0.3)' : undefined,
                        borderRight: endsAfterWeek ? '2px solid rgba(0,0,0,0.3)' : undefined,
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick?.(event);
                    }}
                >
                    {startsBeforeWeek && <span className="text-[9px] text-gray-700 flex-shrink-0">←</span>}
                    {!startsBeforeWeek && <span className="text-[10px] flex-shrink-0">{event.emoji}</span>}
                    <span className="text-[10px] font-medium text-gray-800 truncate flex-1">{event.title}</span>
                    {endsAfterWeek && <span className="text-[9px] text-gray-700 flex-shrink-0">→</span>}
                </div>
            </div>
        );
    }

    return (
        <div
            className="absolute left-0 right-0 px-1 pointer-events-auto cursor-pointer group"
            style={{
                top: `${2 + rowIndex * 1.25}rem`, // Stack events vertically
                height: '1.125rem',
                zIndex: 10
            }}
            onClick={(e) => {
                e.stopPropagation();
                onClick?.(event);
            }}
        >
            <div
                className="h-full rounded-sm px-1.5 flex items-center gap-1 overflow-hidden transition-all group-hover:shadow-md group-hover:scale-[1.01]"
                style={{
                    backgroundColor: getCategoryColor(event.category, event.color),
                    marginLeft: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    borderLeft: startsBeforeWeek ? '2px solid rgba(0,0,0,0.3)' : undefined,
                    borderRight: endsAfterWeek ? '2px solid rgba(0,0,0,0.3)' : undefined
                }}
            >
                {/* Continuation indicator (left) */}
                {startsBeforeWeek && (
                    <span className="text-[9px] text-gray-700 flex-shrink-0">←</span>
                )}

                {/* Event content */}
                {!startsBeforeWeek && (
                    <span className="text-[10px] flex-shrink-0">{event.emoji}</span>
                )}
                <span className="text-[10px] font-medium text-gray-800 truncate flex-1">
                    {event.title}
                </span>

                {/* Continuation indicator (right) */}
                {endsAfterWeek && (
                    <span className="text-[9px] text-gray-700 flex-shrink-0">→</span>
                )}
            </div>
        </div>
    );
};
