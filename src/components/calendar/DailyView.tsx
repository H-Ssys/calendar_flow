import React, { useMemo, useState } from 'react';
import { useCalendar, Event, isMultiDayEvent } from '@/context/CalendarContext';
import { cn } from '@/lib/utils';
import { EventCard } from './EventCard';
import { DroppableTimeSlot } from './DroppableTimeSlot';
import { DraggableDailyEvent } from './DraggableDailyEvent';
import {
    format,
    isSameDay,
    isWithinInterval,
    startOfDay,
    endOfDay,
    differenceInDays,
    differenceInMinutes,
    setHours,
    setMinutes,
    addMinutes
} from 'date-fns';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';

interface DailyViewProps {
    onEventClick?: (event: Event) => void;
}

// ── Collision Detection ─────────────────────────────────────────────
// Greedy column assignment for overlapping events
interface EventColumn {
    column: number;
    totalColumns: number;
}

function calculateEventColumns(events: Event[]): Map<string, EventColumn> {
    const result = new Map<string, EventColumn>();
    if (events.length === 0) return result;

    // Sort by start time, then by duration (longer first)
    const sorted = [...events].sort((a, b) => {
        const diff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        if (diff !== 0) return diff;
        // Longer events first
        return differenceInMinutes(new Date(b.endTime), new Date(b.startTime))
            - differenceInMinutes(new Date(a.endTime), new Date(a.startTime));
    });

    // Build overlap groups: events that are transitively connected through overlaps
    const groups: Event[][] = [];
    const visited = new Set<string>();

    for (const event of sorted) {
        if (visited.has(event.id)) continue;

        const group: Event[] = [];
        const queue = [event];
        visited.add(event.id);

        while (queue.length > 0) {
            const current = queue.shift()!;
            group.push(current);

            for (const other of sorted) {
                if (visited.has(other.id)) continue;
                // Check if any event in the group overlaps with other
                const overlaps = group.some(g => eventsOverlap(g, other));
                if (overlaps) {
                    visited.add(other.id);
                    queue.push(other);
                }
            }
        }
        groups.push(group);
    }

    // Assign columns within each group
    for (const group of groups) {
        // Sort group by start time
        group.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        const columnEnds: number[] = []; // Track end time of each column

        for (const event of group) {
            const eventStart = new Date(event.startTime).getTime();

            // Find first column where event fits (doesn't overlap)
            let assignedCol = -1;
            for (let col = 0; col < columnEnds.length; col++) {
                if (columnEnds[col] <= eventStart) {
                    assignedCol = col;
                    break;
                }
            }

            if (assignedCol === -1) {
                // Need a new column
                assignedCol = columnEnds.length;
                columnEnds.push(0);
            }

            columnEnds[assignedCol] = new Date(event.endTime).getTime();
            result.set(event.id, { column: assignedCol, totalColumns: 0 });
        }

        // Set totalColumns for all events in this group
        const totalCols = columnEnds.length;
        for (const event of group) {
            const col = result.get(event.id)!;
            col.totalColumns = totalCols;
        }
    }

    return result;
}

function eventsOverlap(a: Event, b: Event): boolean {
    const aStart = new Date(a.startTime).getTime();
    const aEnd = new Date(a.endTime).getTime();
    const bStart = new Date(b.startTime).getTime();
    const bEnd = new Date(b.endTime).getTime();
    return aStart < bEnd && bStart < aEnd;
}

// ── Component ───────────────────────────────────────────────────────
export const DailyView = ({ onEventClick }: DailyViewProps) => {
    const { events, currentDate, updateEvent, dailyTimeConfig, getCategoryColor } = useCalendar();
    const [activeId, setActiveId] = useState<string | null>(null);

    // ── Filter events for current day ───────────────────────────────
    const dailyEvents = useMemo(() => {
        const dayStart = startOfDay(currentDate);
        return events.filter(event => {
            const eventStart = startOfDay(new Date(event.startTime));
            const eventEnd = endOfDay(new Date(event.endTime));
            return isWithinInterval(dayStart, { start: eventStart, end: eventEnd });
        });
    }, [events, currentDate]);

    const allDayEvents = dailyEvents.filter(e => e.isAllDay || isMultiDayEvent(e));
    const timedEvents = dailyEvents.filter(e => !e.isAllDay && !isMultiDayEvent(e));

    // ── B: Dynamic Timeline Extension ───────────────────────────────
    const { timelineStartHour, timelineEndHour } = useMemo(() => {
        let minHour = dailyTimeConfig.startHour;
        let maxHour = dailyTimeConfig.endHour;

        for (const event of timedEvents) {
            const s = new Date(event.startTime);
            const e = new Date(event.endTime);
            const sh = s.getHours() + (s.getMinutes() > 0 ? 0 : 0);
            const eh = e.getHours() + (e.getMinutes() > 0 ? 1 : 0);
            if (sh < minHour) minHour = sh;
            if (eh > maxHour) maxHour = eh;
        }

        return { timelineStartHour: minHour, timelineEndHour: Math.min(maxHour, 24) };
    }, [timedEvents, dailyTimeConfig]);

    const HOUR_HEIGHT_PX = 128;
    const totalHours = timelineEndHour - timelineStartHour;

    const hours = useMemo(() =>
        Array.from({ length: totalHours }, (_, i) => {
            const hour = i + timelineStartHour;
            return `${hour.toString().padStart(2, '0')}:00`;
        }),
        [totalHours, timelineStartHour]);

    // ── A: Collision Detection ──────────────────────────────────────
    const eventColumns = useMemo(() => calculateEventColumns(timedEvents), [timedEvents]);

    // ── Positioning ─────────────────────────────────────────────────
    const getEventStyle = (event: Event) => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);

        const startH = eventStart.getHours();
        const startM = eventStart.getMinutes();
        const minutesFromStart = (startH - timelineStartHour) * 60 + startM;
        const topPx = (minutesFromStart / 60) * HOUR_HEIGHT_PX;

        const durationMin = differenceInMinutes(eventEnd, eventStart);
        const heightPx = Math.max((durationMin / 60) * HOUR_HEIGHT_PX, 24); // min 24px

        // Collision column info
        const col = eventColumns.get(event.id) ?? { column: 0, totalColumns: 1 };
        const widthPct = 100 / col.totalColumns;
        const leftPct = (col.column / col.totalColumns) * 100;

        return {
            top: `${topPx}px`,
            height: `${heightPx}px`,
            left: `${leftPct}%`,
            width: `calc(${widthPct}% - 4px)`,
        };
    };

    // ── C: Drag & Drop Handlers ─────────────────────────────────────
    const SNAP_MINUTES = 15;

    const handleDragStart = (e: DragStartEvent) => {
        setActiveId(String(e.active.id));
    };

    const handleDragEnd = (e: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = e;
        if (!over) return;

        const eventId = String(active.id).replace('daily-event-', '');
        const event = events.find(ev => ev.id === eventId);
        if (!event) return;

        const overId = String(over.id);

        // Parse drop target: "daily-slot-HH-MM"
        const slotMatch = overId.match(/^daily-slot-(\d+)-(\d+)$/);
        if (!slotMatch) return;

        const newHour = parseInt(slotMatch[1], 10);
        const newMinute = parseInt(slotMatch[2], 10);

        const oldStart = new Date(event.startTime);
        const oldEnd = new Date(event.endTime);
        const durationMs = oldEnd.getTime() - oldStart.getTime();

        const newStart = setMinutes(setHours(new Date(currentDate), newHour), newMinute);
        newStart.setSeconds(0, 0);
        const newEnd = new Date(newStart.getTime() + durationMs);

        updateEvent(eventId, {
            startTime: newStart,
            endTime: newEnd,
        });
    };

    const activeEvent = activeId
        ? events.find(ev => `daily-event-${ev.id}` === activeId)
        : null;

    // ── Render ──────────────────────────────────────────────────────
    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
            <div className="flex flex-1 overflow-hidden bg-background h-full">
                {/* Left Pane: Calendar Timeline (60% width) */}
                <div className="flex-1 flex flex-col border-r border-border min-w-[60%]">
                    {/* Header */}
                    <div className="h-10 border-b border-border flex items-center justify-between px-4 bg-background z-10">
                        <h2 className="text-lg font-semibold text-foreground">
                            {format(currentDate, 'd MMMM')} <span className="text-red-500">{format(currentDate, 'yyyy')}</span>
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{timedEvents.length} events</span>
                            <span>•</span>
                            <span>{timelineStartHour}:00 – {timelineEndHour}:00</span>
                        </div>
                    </div>

                    {/* All-day / Multi-day Events Section */}
                    {allDayEvents.length > 0 && (
                        <div className="border-b border-border bg-muted/30 min-h-[3rem] max-h-[10rem] overflow-y-auto">
                            <div className="p-2 space-y-1.5">
                                {allDayEvents.map(event => {
                                    const eventStart = new Date(event.startTime);
                                    const eventEnd = new Date(event.endTime);
                                    const isMultiDay = isMultiDayEvent(event);
                                    const durationDays = isMultiDay ? differenceInDays(eventEnd, eventStart) + 1 : 1;
                                    const startsBeforeToday = startOfDay(eventStart) < startOfDay(currentDate);
                                    const endsAfterToday = startOfDay(eventEnd) > startOfDay(currentDate);

                                    return (
                                        <div
                                            key={event.id}
                                            onClick={() => onEventClick?.(event)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-all hover:shadow-md hover:scale-[1.01]"
                                            style={{ backgroundColor: getCategoryColor(event.category, event.color) }}
                                        >
                                            {startsBeforeToday && <span className="text-sm text-gray-700 flex-shrink-0">←</span>}
                                            <span className="text-base flex-shrink-0">{event.emoji}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-800 truncate">{event.title}</div>
                                                {isMultiDay && (
                                                    <div className="text-xs text-gray-600">
                                                        {format(eventStart, 'MMM d')} – {format(eventEnd, 'MMM d')} ({durationDays} days)
                                                    </div>
                                                )}
                                            </div>
                                            {endsAfterToday && <span className="text-sm text-gray-700 flex-shrink-0">→</span>}
                                            {event.isAllDay && !isMultiDay && (
                                                <span className="text-xs px-2 py-0.5 bg-gray-700/20 rounded-full text-gray-800 flex-shrink-0">All day</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Scrollable Timeline */}
                    <div className="flex-1 overflow-y-auto no-scrollbar relative bg-background">
                        <div className="flex flex-col relative min-h-full">
                            {/* Hour grid rows + drop zones */}
                            {hours.map((time, hourIndex) => {
                                const hour = hourIndex + timelineStartHour;
                                const showLabel = hourIndex % dailyTimeConfig.hourInterval === 0;
                                return (
                                    <div key={time} className={`flex last:border-b-0 relative group ${showLabel ? 'border-b border-border' : 'border-b border-border/30'}`} style={{ height: `${HOUR_HEIGHT_PX}px` }}>
                                        {/* Time Label */}
                                        <div className="w-16 flex-shrink-0 flex justify-center pt-2 border-r border-border bg-background z-10 sticky left-0 group-hover:bg-muted/30 transition-colors">
                                            {showLabel && (
                                                <span className="text-[10px] font-medium text-muted-foreground">{time}</span>
                                            )}
                                        </div>

                                        {/* 4 × 15-min drop zones per hour */}
                                        <div className="flex-1 relative flex flex-col">
                                            {[0, 15, 30, 45].map(minute => (
                                                <DroppableTimeSlot
                                                    key={`${hour}-${minute}`}
                                                    id={`daily-slot-${hour}-${minute}`}
                                                    className="flex-1 border-b border-border/10 last:border-b-0 transition-colors"
                                                />
                                            ))}
                                            {/* Half-hour line */}
                                            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-border/30 border-dashed border-t border-border/30 w-full pointer-events-none" />
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Timed Events Overlay */}
                            <div className="absolute inset-0 left-16 pointer-events-none">
                                {timedEvents.map(event => {
                                    const style = getEventStyle(event);

                                    return (
                                        <DraggableDailyEvent
                                            key={event.id}
                                            event={event}
                                            style={{
                                                position: 'absolute',
                                                top: style.top,
                                                height: style.height,
                                                left: style.left,
                                                width: style.width,
                                                zIndex: 10,
                                            }}
                                        >
                                            <div className="h-full rounded-lg overflow-hidden pointer-events-auto">
                                                <EventCard event={event} onClick={() => onEventClick?.(event)} />
                                            </div>
                                        </DraggableDailyEvent>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Pane: Journal / Notes (40% width) */}
                <div className="w-[40%] flex flex-col bg-card/30">
                    <div className="h-10 border-b border-border" />
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <div className="w-24 h-24 mb-4 text-muted-foreground/20">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                                <path d="M8 14h.01" />
                                <path d="M12 14h.01" />
                                <path d="M16 14h.01" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-muted-foreground">No Items Today</h3>
                        <p className="text-sm text-muted-foreground/70">Enjoy your day!</p>
                    </div>
                </div>

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeEvent && (
                        <div className="w-64 h-16 rounded-lg overflow-hidden shadow-xl opacity-90">
                            <EventCard event={activeEvent} />
                        </div>
                    )}
                </DragOverlay>
            </div>
        </DndContext>
    );
};
