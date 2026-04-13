import React, { useState, useMemo } from 'react';
import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    format,
    isSameMonth,
    isSameDay,
    isToday,
    isWithinInterval,
    startOfDay,
    endOfDay,
    isPast,
    differenceInCalendarDays
} from 'date-fns';
import { useCalendar, Event, isMultiDayEvent } from '@/context/CalendarContext';
import { useTaskContext } from '@/context/TaskContext';
import { useExpandedEvents } from '@/hooks/useExpandedEvents';
import { MonthlyEventBar } from './MonthlyEventBar';
import { ChevronRight, ListTodo } from 'lucide-react';
import {
    DndContext, DragEndEvent, DragOverlay, DragStartEvent,
    useDraggable, useDroppable, pointerWithin,
    useSensor, useSensors, PointerSensor
} from '@dnd-kit/core';
import { toast } from 'sonner';
import { CalendarPlus, Calendar, CalendarDays, BarChart2, X } from 'lucide-react';

interface MonthlyViewProps {
    onEventClick?: (event: Event) => void;
}

// ── Droppable Day Cell ──
const DroppableDayCell: React.FC<{
    date: Date;
    children: React.ReactNode;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
}> = ({ date, children, className, onClick }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: `month-day-${date.toISOString()}`,
        data: { date },
    });

    return (
        <div
            ref={setNodeRef}
            onClick={onClick}
            className={`${className} ${isOver ? 'ring-2 ring-primary/40 bg-primary/5' : ''}`}
        >
            {children}
        </div>
    );
};

// ── Draggable Event Bar Wrapper ──
// This component MUST mirror the absolute positioning logic from MonthlyEventBar
// so that the drag handle origin aligns with the visual bar.
const DraggableMonthlyEventBar: React.FC<{
    event: Event;
    weekDays: Date[];
    rowIndex: number;
    onClick?: (event: Event) => void;
}> = ({ event, weekDays, rowIndex, onClick }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `month-event-${event.id}`,
        data: { event },
    });

    // Compute the same left/width as MonthlyEventBar so the
    // draggable wrapper occupies the exact visual position
    const eventStart = startOfDay(new Date(event.startTime));
    const eventEnd = endOfDay(new Date(event.endTime));

    let startDayIndex = -1;
    let endDayIndex = -1;
    weekDays.forEach((day, index) => {
        const dayS = startOfDay(day);
        const dayE = endOfDay(day);
        if (
            isWithinInterval(dayS, { start: eventStart, end: eventEnd }) ||
            isWithinInterval(eventStart, { start: dayS, end: dayE })
        ) {
            if (startDayIndex === -1) startDayIndex = index;
            endDayIndex = index;
        }
    });

    if (startDayIndex === -1) return null;

    const spanDays = endDayIndex - startDayIndex + 1;
    const dayWidth = 100 / 7;
    const leftPercent = startDayIndex * dayWidth;
    const widthPercent = spanDays * dayWidth;

    const style: React.CSSProperties = {
        position: 'absolute',
        top: `${2 + rowIndex * 1.25}rem`,
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        height: '1.125rem',
        zIndex: isDragging ? 100 : 10,
        // Don't apply transform here — DragOverlay handles the moving visual.
        // Just fade the original as a "ghost" placeholder.
        opacity: isDragging ? 0.2 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={style}
            className="pointer-events-auto cursor-grab active:cursor-grabbing"
        >
            <MonthlyEventBar
                event={event}
                weekDays={weekDays}
                rowIndex={rowIndex}
                onClick={onClick}
                inline
            />
        </div>
    );
};

export const MonthlyView: React.FC<MonthlyViewProps> = ({ onEventClick }) => {
    const { currentDate, setDate, setView, setDailyViewVariant, updateEvent, monthlyViewConfig, popoverState, setPopoverState } = useCalendar();
    const expandedEvents = useExpandedEvents();
    const { tasks } = useTaskContext();
    const [draggedEvent, setDraggedEvent] = useState<Event | null>(null);

    // Require 5px movement before starting drag (prevents accidental drags on click)
    const pointerSensor = useSensor(PointerSensor, {
        activationConstraint: { distance: 5 },
    });
    const sensors = useSensors(pointerSensor);

    // Get the calendar grid
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows: Date[][] = [];
    let days: Date[] = [];
    let day = calStart;

    while (day <= calEnd) {
        for (let i = 0; i < 7; i++) {
            days.push(day);
            day = addDays(day, 1);
        }
        rows.push(days);
        days = [];
    }

    // Get events that appear in a specific week row
    const getEventsForWeek = (weekDays: Date[]): Event[] => {
        const weekStart = startOfDay(weekDays[0]);
        const weekEnd = endOfDay(weekDays[6]);

        return expandedEvents.filter(event => {
            const eventStart = startOfDay(new Date(event.startTime));
            const eventEnd = endOfDay(new Date(event.endTime));

            return isWithinInterval(eventStart, { start: weekStart, end: weekEnd }) ||
                isWithinInterval(weekEnd, { start: eventStart, end: eventEnd }) ||
                isWithinInterval(weekStart, { start: eventStart, end: eventEnd });
        });
    };

    // Get events for a specific day (for event count badge)
    const getEventsForDay = (date: Date): Event[] => {
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        return expandedEvents.filter(event => {
            const eventStart = startOfDay(new Date(event.startTime));
            const eventEnd = endOfDay(new Date(event.endTime));

            return isWithinInterval(dayStart, { start: eventStart, end: eventEnd });
        });
    };

    const handleDayClick = (date: Date, e: React.MouseEvent) => {
        setPopoverState({ type: 'menu', x: e.clientX, y: e.clientY, date });
    };

    const handleDayNumberClick = (date: Date, e: React.MouseEvent) => {
        e.stopPropagation();
        setDate(date);
        setDailyViewVariant('timeline');
        setView('daily');
    };

    const handleDragStart = (event: DragStartEvent) => {
        const ev = event.active.data.current?.event as Event;
        if (ev) setDraggedEvent(ev);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setDraggedEvent(null);
        const { active, over } = event;
        if (!over) return;

        const eventData = active.data.current?.event as Event;
        const targetDate = over.data.current?.date as Date;
        if (!eventData || !targetDate) return;

        // Skip recurrence instances (read-only)
        if (eventData.id.includes('-rec-')) {
            toast.info('Recurrence instances cannot be moved');
            return;
        }

        const dayDiff = differenceInCalendarDays(
            targetDate,
            startOfDay(new Date(eventData.startTime))
        );
        if (dayDiff === 0) return;

        updateEvent(eventData.id, {
            startTime: addDays(new Date(eventData.startTime), dayDiff),
            endTime: addDays(new Date(eventData.endTime), dayDiff),
        });
        toast.success('Event moved');
    };

    const weekDayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col flex-1 overflow-hidden bg-background h-full">
                {/* Calendar Grid — header inside scroll container so columns align */}
                <div className="flex-1 overflow-auto">
                    <div className="min-h-full flex flex-col">
                        {/* Week Days Header — sticky inside scroll container */}
                        <div className="grid grid-cols-7 h-10 border-b border-border sticky top-0 z-30 bg-background flex-shrink-0">
                            {weekDayHeaders.map((d, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-center border-r border-border last:border-r-0"
                                >
                                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                                        {d}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {rows.map((week, weekIndex) => {
                            const weekEvents = getEventsForWeek(week);

                            // A week row belongs to the current month if any of its days are in the current month
                            const isCurrentMonthRow = week.some(d => isSameMonth(d, currentDate));

                            const isCurrentWeek = week.some(d => isToday(d));

                            return (
                                <div
                                    key={weekIndex}
                                    className={`grid grid-cols-7 border-b border-border last:border-b-0 relative overflow-hidden`}
                                    style={{
                                        flex: isCurrentMonthRow ? 2 : 1,
                                        minHeight: isCurrentMonthRow ? '120px' : '60px',
                                        backgroundColor: isCurrentWeek ? monthlyViewConfig.rowHighlightColor : undefined,
                                    }}
                                >
                                    {/* Render draggable event bars for this week */}
                                    {weekEvents.map((event, eventIndex) => (
                                        <DraggableMonthlyEventBar
                                            key={event.id}
                                            event={event}
                                            weekDays={week}
                                            rowIndex={eventIndex}
                                            onClick={onEventClick}
                                        />
                                    ))}

                                    {/* Render droppable date cells */}
                                    {week.map((d, dayIndex) => {
                                        const dayEvents = getEventsForDay(d);
                                        const isCurrentMonth = isSameMonth(d, currentDate);
                                        const isDayToday = isToday(d);

                                        return (
                                            <DroppableDayCell
                                                key={dayIndex}
                                                date={d}
                                                onClick={(e) => handleDayClick(d, e)}
                                                className={`
                                                    relative border-r border-border last:border-r-0
                                                    cursor-pointer transition-colors hover:bg-muted/50
                                                    ${!isCurrentMonth ? 'bg-muted/20' : ''}
                                                    ${isDayToday ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}
                                                `}
                                            >
                                                {/* Day Number — click goes to daily view */}
                                                <div className="flex items-center justify-between px-1.5 pt-1 pb-0.5 relative z-20">
                                                    <span
                                                        onClick={(e) => handleDayNumberClick(d, e)}
                                                        className={`
                                                            text-xs font-semibold leading-none
                                                            ${!isCurrentMonth ? 'text-muted-foreground' : 'text-foreground'}
                                                            ${isDayToday ? 'text-primary' : ''}
                                                        `}
                                                    >
                                                        {format(d, 'd')}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        {/* Task due date indicators */}
                                                        {(() => {
                                                            const dueTasks = tasks.filter(t =>
                                                                t.dueDate && isSameDay(new Date(t.dueDate), d) && t.status !== 'done'
                                                            );
                                                            if (dueTasks.length === 0) return null;
                                                            const hasOverdue = dueTasks.some(t => isPast(new Date(t.dueDate!)) && !isToday(new Date(t.dueDate!)));
                                                            return (
                                                                <span className={`flex items-center gap-0.5 text-[10px] font-medium ${hasOverdue ? 'text-destructive' : 'text-primary'
                                                                    }`} title={`${dueTasks.length} task(s) due`}>
                                                                    <ListTodo className="w-3 h-3" />
                                                                    {dueTasks.length}
                                                                </span>
                                                            );
                                                        })()}
                                                        {dayEvents.length > 0 && (
                                                            <span className="text-[10px] text-muted-foreground font-medium">
                                                                {dayEvents.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* +N more indicator when day has more events than visible */}
                                                {(() => {
                                                    // Events visible without clipping: ~3 fit in current-month rows, ~1 in other-month
                                                    const maxVisible = isCurrentMonthRow ? 4 : 1;
                                                    const overflow = dayEvents.length - maxVisible;
                                                    if (overflow <= 0) return null;
                                                    return (
                                                        <div className="absolute bottom-1 left-1 z-20">
                                                            <span className="text-[9px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
                                                                +{overflow} more
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </DroppableDayCell>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Popovers are now handled globally in Index.tsx */}

            {/* Drag Overlay */}
            <DragOverlay>
                {draggedEvent && (
                    <div className="bg-primary/20 rounded px-2 py-1 text-xs font-medium shadow-lg border border-primary/30">
                        {draggedEvent.emoji} {draggedEvent.title}
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
};
