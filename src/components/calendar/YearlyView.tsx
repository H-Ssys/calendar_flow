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
    const { events, currentDate, setDate, setView, searchQuery, yearlyViewConfig, setPopoverState } = useCalendar();

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
        if (count === 0) return 'bg-muted/10 hover:bg-muted/30';
        if (count === 1) return 'bg-blue-100/80 dark:bg-blue-900/40';
        if (count === 2) return 'bg-blue-300/80 dark:bg-blue-800/60';
        if (count === 3) return 'bg-blue-400 dark:bg-blue-700/80 text-white';
        return 'bg-blue-500 dark:bg-blue-600 text-white';
    };

    const handleMonthClick = (month: Date, e: React.MouseEvent) => {
        e.stopPropagation();
        setPopoverState({
            type: 'menu',
            x: e.clientX,
            y: e.clientY,
            date: month,
        });
        onMonthClick?.(month);
    };

    return (
        <div className="flex flex-col flex-1 overflow-hidden bg-background h-full p-6">
            {/* Year Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {format(currentDate, 'yyyy')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Select any month to view details
                    </p>
                </div>
            </div>

            {/* 12-Month Grid */}
            <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
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
                                onClick={(e) => handleMonthClick(month, e as React.MouseEvent)}
                                className={`flex flex-col group border rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer 
                                    ${isCurrentMonth ? 'border-primary/50 ring-1 ring-primary/50 bg-primary/[0.02]' : 'border-border bg-card hover:border-primary/40'}`}
                                style={{
                                    backgroundColor: isCurrentMonth ? yearlyViewConfig.monthHighlightColor : undefined,
                                }}
                            >
                                {/* Month Name */}
                                <h3 className="text-base font-semibold mb-4 flex items-center justify-between">
                                    <span className={isCurrentMonth ? 'text-primary' : 'text-foreground'}>{format(month, 'MMMM')}</span>
                                    {isCurrentMonth && <span className="text-[10px] font-medium text-primary px-2 py-0.5 bg-primary/10 rounded-full">Current</span>}
                                </h3>

                                {/* Mini Calendar Grid */}
                                <div className="grid grid-cols-7 gap-1.5 flex-1">
                                    {/* Week day headers */}
                                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                                        <div
                                            key={i}
                                            className="text-[10px] font-medium text-muted-foreground/70 text-center mb-1"
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
                                        const isCurrentMonthDay = isSameMonth(day, month);

                                        return (
                                            <div
                                                key={dayIndex}
                                                className={`
                                                    aspect-square rounded flex items-center justify-center
                                                    text-[11px] sm:text-xs transition-all
                                                    ${getHeatmapColor(eventCount)}
                                                    ${isDayToday ? 'ring-2 ring-primary ring-offset-1 font-bold z-10' : ''}
                                                    ${isCurrentMonthDay ? (isDayToday ? 'text-primary' : 'text-foreground') : 'text-foreground/30 hover:text-foreground/50'}
                                                    hover:scale-110 hover:z-20 hover:shadow-sm
                                                `}
                                                title={`${format(day, 'MMM d')}: ${eventCount} event${eventCount !== 1 ? 's' : ''}`}
                                            >
                                                {format(day, 'd')}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Event Count Summary */}
                                <div className="mt-4 text-center">
                                    <span className="text-[11px] font-medium text-muted-foreground/80 px-3 py-1 bg-muted/30 rounded-full group-hover:bg-muted/50 transition-colors">
                                        {days.reduce((sum, day) => sum + getEventCountForDay(day), 0)} events
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-5 py-4 mt-2 border-t border-border">
                <span className="text-sm font-medium text-muted-foreground">Activity Density:</span>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-[4px] bg-muted/10 border border-border/50" />
                        <span className="text-xs text-muted-foreground">0</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-[4px] bg-blue-100/80 dark:bg-blue-900/40" />
                        <span className="text-xs text-muted-foreground">1</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-[4px] bg-blue-300/80 dark:bg-blue-800/60" />
                        <span className="text-xs text-muted-foreground">2</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-[4px] bg-blue-400 dark:bg-blue-700/80" />
                        <span className="text-xs text-muted-foreground">3</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-[4px] bg-blue-500 dark:bg-blue-600" />
                        <span className="text-xs text-muted-foreground">4+</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
