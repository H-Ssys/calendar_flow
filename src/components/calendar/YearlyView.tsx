import React from 'react';
import {
    startOfYear,
    endOfYear,
    eachMonthOfInterval,
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday
} from 'date-fns';
import { useCalendar, Event } from '@/context/CalendarContext';

interface YearlyViewProps {
    onMonthClick?: (date: Date) => void;
}

export const YearlyView: React.FC<YearlyViewProps> = ({ onMonthClick }) => {
    const { events, currentDate, setDate, setView, searchQuery, yearlyViewConfig } = useCalendar();

    const filteredEvents = events.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

    // Get event count for a specific day
    const getEventCountForDay = (date: Date): number => {
        return filteredEvents.filter(event => {
            const start = new Date(event.startTime);
            const end = new Date(event.endTime);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            const target = new Date(date);
            target.setHours(0, 0, 0, 0);
            return target >= start && target <= end;
        }).length;
    };

    // Get heatmap color based on event count
    const getHeatmapColor = (count: number): string => {
        if (count === 0) return 'bg-muted/20';
        if (count === 1) return 'bg-blue-200 dark:bg-blue-900/40';
        if (count === 2) return 'bg-blue-300 dark:bg-blue-800/60';
        if (count === 3) return 'bg-blue-400 dark:bg-blue-700/80';
        return 'bg-blue-500 dark:bg-blue-600';
    };

    const handleMonthClick = (month: Date) => {
        setDate(month);
        setView('monthly');
        onMonthClick?.(month);
    };

    return (
        <div className="flex flex-col flex-1 overflow-hidden bg-background h-full p-6">
            {/* Year Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-foreground">
                    {format(currentDate, 'yyyy')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Click any month to view details
                </p>
            </div>

            {/* 12-Month Grid */}
            <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-3 gap-6 pb-6">
                    {months.map((month, monthIndex) => {
                        const monthStart = startOfMonth(month);
                        const monthEnd = endOfMonth(month);
                        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

                        // Pad to start on correct day of week (Monday = 0)
                        const firstDayOfWeek = (monthStart.getDay() + 6) % 7;
                        const paddedDays = [
                            ...Array(firstDayOfWeek).fill(null),
                            ...days
                        ];

                        const isCurrentMonth = monthIndex === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

                        return (
                            <div
                                key={monthIndex}
                                onClick={() => handleMonthClick(month)}
                                className={`border border-border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer hover:border-primary/50
                                    ${isCurrentMonth ? 'ring-2 ring-primary/30' : 'bg-card'}`}
                                style={{
                                    backgroundColor: isCurrentMonth ? yearlyViewConfig.monthHighlightColor : undefined,
                                }}
                            >
                                {/* Month Name */}
                                <h3 className="text-sm font-semibold text-foreground mb-2 text-center">
                                    {format(month, 'MMMM')}
                                </h3>

                                {/* Mini Calendar Grid */}
                                <div className="grid grid-cols-7 gap-1">
                                    {/* Week day headers */}
                                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                                        <div
                                            key={i}
                                            className="text-[8px] font-medium text-muted-foreground text-center"
                                        >
                                            {day}
                                        </div>
                                    ))}

                                    {/* Days */}
                                    {paddedDays.map((day, dayIndex) => {
                                        if (!day) {
                                            return <div key={`empty-${dayIndex}`} className="aspect-square" />;
                                        }

                                        const eventCount = getEventCountForDay(day);
                                        const isDayToday = isToday(day);

                                        return (
                                            <div
                                                key={dayIndex}
                                                className={`
                          aspect-square rounded-sm flex items-center justify-center
                          text-[9px] font-medium transition-all
                          ${getHeatmapColor(eventCount)}
                          ${isDayToday ? 'ring-2 ring-primary ring-offset-1' : ''}
                          ${isSameMonth(day, month) ? 'text-foreground' : 'text-muted-foreground'}
                        `}
                                                title={`${format(day, 'MMM d')}: ${eventCount} event${eventCount !== 1 ? 's' : ''}`}
                                            >
                                                {format(day, 'd')}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Event Count Summary */}
                                <div className="mt-2 text-center">
                                    <span className="text-[10px] text-muted-foreground">
                                        {days.reduce((sum, day) => sum + getEventCountForDay(day), 0)} events
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 py-4 border-t border-border">
                <span className="text-xs text-muted-foreground">Event density:</span>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-sm bg-muted/20" />
                        <span className="text-xs text-muted-foreground">0</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-sm bg-blue-200 dark:bg-blue-900/40" />
                        <span className="text-xs text-muted-foreground">1</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-sm bg-blue-300 dark:bg-blue-800/60" />
                        <span className="text-xs text-muted-foreground">2</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-sm bg-blue-400 dark:bg-blue-700/80" />
                        <span className="text-xs text-muted-foreground">3</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-sm bg-blue-500 dark:bg-blue-600" />
                        <span className="text-xs text-muted-foreground">4+</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
