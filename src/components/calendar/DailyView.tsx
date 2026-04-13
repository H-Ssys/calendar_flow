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
} from 'date-fns';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { Copy, Save, ChevronDown, Plus, Check, X, Circle } from 'lucide-react';

// ── Overlap detection ─────────────────────────────────────────────────
interface EventColumn { column: number; totalColumns: number; }

function eventsOverlap(a: Event, b: Event): boolean {
    const aStart = new Date(a.startTime).getTime();
    const aEnd = new Date(a.endTime).getTime();
    const bStart = new Date(b.startTime).getTime();
    const bEnd = new Date(b.endTime).getTime();
    return aStart < bEnd && bStart < aEnd;
}

function calculateEventColumns(events: Event[]): Map<string, EventColumn> {
    const result = new Map<string, EventColumn>();
    if (!events.length) return result;
    const sorted = [...events].sort((a, b) => {
        const d = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        return d !== 0 ? d :
            differenceInMinutes(new Date(b.endTime), new Date(b.startTime)) -
            differenceInMinutes(new Date(a.endTime), new Date(a.startTime));
    });
    const groups: Event[][] = [];
    const visited = new Set<string>();
    for (const ev of sorted) {
        if (visited.has(ev.id)) continue;
        const group: Event[] = [];
        const queue = [ev];
        visited.add(ev.id);
        while (queue.length) {
            const cur = queue.shift()!;
            group.push(cur);
            for (const other of sorted) {
                if (visited.has(other.id)) continue;
                if (group.some(g => eventsOverlap(g, other))) {
                    visited.add(other.id);
                    queue.push(other);
                }
            }
        }
        groups.push(group);
    }
    for (const group of groups) {
        group.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        const ends: number[] = [];
        for (const ev of group) {
            const start = new Date(ev.startTime).getTime();
            let col = ends.findIndex(e => e <= start);
            if (col === -1) col = ends.length, ends.push(0);
            ends[col] = new Date(ev.endTime).getTime();
            result.set(ev.id, { column: col, totalColumns: 0 });
        }
        for (const ev of group) result.get(ev.id)!.totalColumns = ends.length;
    }
    return result;
}

// ── Journal row data ──────────────────────────────────────────────────
interface JournalRow {
    time: string;   // "06:00"
    hour: number;
    taskEvent: string;
    actual: string;
}

// ── Component ─────────────────────────────────────────────────────────
interface DailyViewProps { onEventClick?: (event: Event) => void; }

export const DailyView = ({ onEventClick }: DailyViewProps) => {
    const { events, currentDate, updateEvent, dailyTimeConfig, getCategoryColor, setPopoverState, dailyViewVariant } = useCalendar();
    const [activeId, setActiveId] = useState<string | null>(null);

    // Journal state
    const [journalTitle, setJournalTitle] = useState('Dreams and Hopes for This Year');
    const [monthGoal, setMonthGoal] = useState('');
    const [todayGoal, setTodayGoal] = useState('');
    const [result, setResult] = useState('');
    const [actualResults, setActualResults] = useState<Record<string, string>>({});

    // ── Filter events ─────────────────────────────────────────────────
    const dailyEvents = useMemo(() => {
        const dayStart = startOfDay(currentDate);
        return events.filter(ev => {
            const s = startOfDay(new Date(ev.startTime));
            const e = endOfDay(new Date(ev.endTime));
            return isWithinInterval(dayStart, { start: s, end: e });
        });
    }, [events, currentDate]);

    const allDayEvents = dailyEvents.filter(e => e.isAllDay || isMultiDayEvent(e));
    const timedEvents  = dailyEvents.filter(e => !e.isAllDay && !isMultiDayEvent(e));

    // ── Timeline bounds ───────────────────────────────────────────────
    const { timelineStartHour, timelineEndHour } = useMemo(() => {
        let min = dailyTimeConfig.startHour, max = dailyTimeConfig.endHour;
        for (const ev of timedEvents) {
            const s = new Date(ev.startTime), e = new Date(ev.endTime);
            if (s.getHours() < min) min = s.getHours();
            const eh = e.getHours() + (e.getMinutes() > 0 ? 1 : 0);
            if (eh > max) max = eh;
        }
        return { timelineStartHour: min, timelineEndHour: Math.min(max, 24) };
    }, [timedEvents, dailyTimeConfig]);

    const HOUR_HEIGHT_PX = 100;
    const totalHours = timelineEndHour - timelineStartHour;
    const hours = useMemo(() =>
        Array.from({ length: totalHours }, (_, i) => {
            const h = i + timelineStartHour;
            return { label: `${String(h).padStart(2, '0')}:00`, hour: h };
        }),
        [totalHours, timelineStartHour]);

    const eventColumns = useMemo(() => calculateEventColumns(timedEvents), [timedEvents]);

    const getEventStyle = (event: Event) => {
        const s = new Date(event.startTime), e = new Date(event.endTime);
        const top = ((s.getHours() - timelineStartHour) * 60 + s.getMinutes()) / 60 * HOUR_HEIGHT_PX;
        const height = Math.max(differenceInMinutes(e, s) / 60 * HOUR_HEIGHT_PX, 20);
        const col = eventColumns.get(event.id) ?? { column: 0, totalColumns: 1 };
        return {
            top: `${top}px`,
            height: `${height}px`,
            left: `${col.column / col.totalColumns * 100}%`,
            width: `calc(${100 / col.totalColumns}% - 4px)`,
        };
    };

    // ── Drag handlers ─────────────────────────────────────────────────
    const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
    const handleDragEnd = (e: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = e;
        if (!over) return;
        const eventId = String(active.id).replace('daily-event-', '');
        const ev = events.find(x => x.id === eventId);
        if (!ev) return;
        const m = String(over.id).match(/^daily-slot-(\d+)-(\d+)$/);
        if (!m) return;
        const ns = setMinutes(setHours(new Date(currentDate), +m[1]), +m[2]);
        ns.setSeconds(0, 0);
        const dur = new Date(ev.endTime).getTime() - new Date(ev.startTime).getTime();
        updateEvent(eventId, { startTime: ns, endTime: new Date(ns.getTime() + dur) });
    };

    const activeEvent = activeId ? events.find(ev => `daily-event-${ev.id}` === activeId) : null;

    // ── Now: figure out which panel to show ──────────────────────────
    const isJournal = dailyViewVariant === 'journal';

    if (isJournal) {
        return <JournalView
            currentDate={currentDate}
            timedEvents={timedEvents}
            journalTitle={journalTitle} setJournalTitle={setJournalTitle}
            monthGoal={monthGoal} setMonthGoal={setMonthGoal}
            todayGoal={todayGoal} setTodayGoal={setTodayGoal}
            result={result} setResult={setResult}
            actualResults={actualResults} setActualResults={setActualResults}
            hours={hours}
            setPopoverState={setPopoverState}
        />;
    }

    // ── Timeline view ─────────────────────────────────────────────────
    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
            <div className="flex flex-1 overflow-hidden bg-background h-full">
                {/* Timeline column */}
                <div className="flex-1 flex flex-col border-r border-border">
                    {/* Header row */}
                    <div className="h-10 border-b border-border flex items-center justify-between px-4 bg-background shrink-0">
                        <h2 className="text-sm font-semibold text-foreground">
                            {format(currentDate, 'EEEE, d MMMM yyyy')}
                        </h2>
                        <span className="text-xs text-muted-foreground">{timedEvents.length} events</span>
                    </div>

                    {/* All-day strip */}
                    {allDayEvents.length > 0 && (
                        <div className="border-b border-border bg-muted/30 px-4 py-1.5 flex flex-wrap gap-1.5 shrink-0">
                            {allDayEvents.map(ev => (
                                <div
                                    key={ev.id}
                                    onClick={() => onEventClick?.(ev)}
                                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium cursor-pointer"
                                    style={{ backgroundColor: getCategoryColor(ev.category, ev.color) }}
                                >
                                    {ev.emoji && <span>{ev.emoji}</span>}
                                    <span className="text-gray-800 truncate max-w-[160px]">{ev.title}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Scrollable grid */}
                    <div className="flex-1 overflow-y-auto relative bg-background">
                        <div className="relative" style={{ height: `${totalHours * HOUR_HEIGHT_PX}px` }}>
                            {/* Hour rows */}
                            {hours.map(({ label, hour }, i) => (
                                <div key={label} className="absolute left-0 right-0 flex" style={{ top: `${i * HOUR_HEIGHT_PX}px`, height: `${HOUR_HEIGHT_PX}px` }}>
                                    {/* Time label */}
                                    <div className="w-16 shrink-0 border-r border-border px-2 pt-1.5">
                                        <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
                                    </div>
                                    {/* Drop zones */}
                                    <div className="flex-1 relative flex flex-col border-b border-border">
                                        {[0, 15, 30, 45].map(min => (
                                            <DroppableTimeSlot
                                                key={min}
                                                id={`daily-slot-${hour}-${min}`}
                                                className="flex-1 hover:bg-primary/5 cursor-pointer transition-colors"
                                                onClick={(e: React.MouseEvent) => {
                                                    const d = new Date(currentDate);
                                                    d.setHours(hour, min, 0, 0);
                                                    setPopoverState({ type: 'menu', x: e.clientX, y: e.clientY, date: d });
                                                }}
                                            />
                                        ))}
                                        {/* Half-hour dashed line */}
                                        <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dashed border-border/40 pointer-events-none" />
                                    </div>
                                </div>
                            ))}

                            {/* Events overlay */}
                            <div className="absolute inset-0 left-16 pointer-events-none">
                                {timedEvents.map(ev => {
                                    const style = getEventStyle(ev);
                                    return (
                                        <DraggableDailyEvent
                                            key={ev.id} event={ev}
                                            style={{ position: 'absolute', ...style, zIndex: 10 }}
                                        >
                                            <div className="h-full rounded-md overflow-hidden pointer-events-auto">
                                                <EventCard event={ev} onClick={() => onEventClick?.(ev)} />
                                            </div>
                                        </DraggableDailyEvent>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right pane — tasks list placeholder */}
                <div className="w-72 shrink-0 flex flex-col bg-card/20 border-l border-border">
                    <div className="h-10 border-b border-border flex items-center px-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Today's Tasks</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                        <p className="text-xs text-muted-foreground/60">No tasks for today</p>
                        <button
                            onClick={e => setPopoverState({ type: 'task', x: e.clientX, y: e.clientY, date: new Date() })}
                            className="mt-3 text-xs text-primary hover:underline"
                        >+ Add Task</button>
                    </div>
                </div>
            </div>

            <DragOverlay>
                {activeEvent && (
                    <div className="w-56 h-14 rounded-lg overflow-hidden shadow-xl opacity-90">
                        <EventCard event={activeEvent} />
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
};

// ── Journal panel (matching the live app) ─────────────────────────────
interface JournalViewProps {
    currentDate: Date;
    timedEvents: Event[];
    journalTitle: string; setJournalTitle: (v: string) => void;
    monthGoal: string; setMonthGoal: (v: string) => void;
    todayGoal: string; setTodayGoal: (v: string) => void;
    result: string; setResult: (v: string) => void;
    actualResults: Record<string, string>; setActualResults: (v: Record<string, string>) => void;
    hours: { label: string; hour: number }[];
    setPopoverState: any;
}

function JournalView({
    currentDate, timedEvents,
    journalTitle, setJournalTitle,
    monthGoal, setMonthGoal,
    todayGoal, setTodayGoal,
    result, setResult,
    actualResults, setActualResults,
    hours, setPopoverState
}: JournalViewProps) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const updateActual = (time: string, val: string) =>
        setActualResults({ ...actualResults, [time]: val });

    return (
        <div className="flex-1 overflow-y-auto bg-background">
            {/* Top bar */}
            <div className="sticky top-0 z-20 bg-background border-b border-border px-4 py-2 flex items-center justify-between gap-3">
                <div>
                    <div className="text-base font-bold text-foreground">
                        {format(currentDate, 'EEEE, MMMM d, yyyy')}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                        {timeStr} · Daily Journal
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 text-xs border border-border rounded-md px-2.5 py-1.5 hover:bg-muted transition-colors">
                        <ChevronDown className="w-3 h-3" />
                        Today Events ({timedEvents.length})
                    </button>
                    <button className="flex items-center gap-1.5 text-xs border border-border rounded-md px-2.5 py-1.5 hover:bg-muted transition-colors">
                        <Copy className="w-3 h-3" />
                        Copy yesterday's task
                    </button>
                    <button className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-md px-2.5 py-1.5 hover:bg-primary/90 transition-colors">
                        <Save className="w-3 h-3" />
                        Save
                    </button>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
                {/* Journal title */}
                <input
                    value={journalTitle}
                    onChange={e => setJournalTitle(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                    placeholder="Dreams and Hopes for This Year"
                />

                {/* Goals row */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { icon: '🟡', label: 'Month', value: monthGoal, onChange: setMonthGoal, placeholder: "Month's goal..." },
                        { icon: '🟢', label: 'Today', value: todayGoal, onChange: setTodayGoal, placeholder: "Today's goal..." },
                        { icon: '🔵', label: 'Result', value: result, onChange: setResult, placeholder: 'Result...' },
                    ].map(({ icon, label, value, onChange, placeholder }) => (
                        <div key={label} className="border border-border rounded-lg overflow-hidden">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-muted/30">
                                <span className="text-xs">{icon}</span>
                                <span className="text-xs font-semibold text-foreground">{label}</span>
                            </div>
                            <input
                                value={value}
                                onChange={e => onChange(e.target.value)}
                                placeholder={placeholder}
                                className="w-full px-3 py-2 text-xs bg-background focus:outline-none placeholder:text-muted-foreground"
                            />
                        </div>
                    ))}
                </div>

                {/* Hourly schedule table */}
                <div className="border border-border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border">
                        <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground">Hourly Schedule</span>
                    </div>

                    {/* Table header */}
                    <div className="grid grid-cols-[80px_1fr_180px] border-b border-border bg-muted/20">
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Time</div>
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-l border-border">Today's Task/Event</div>
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-l border-border">Actual Result</div>
                    </div>

                    {/* Rows */}
                    {hours.map(({ label, hour }) => {
                        // Find events at this hour
                        const rowEvents = timedEvents.filter(ev => new Date(ev.startTime).getHours() === hour);
                        return (
                            <div key={label} className="grid grid-cols-[80px_1fr_180px] border-b border-border last:border-b-0 min-h-[56px]">
                                {/* Time */}
                                <div className="px-3 pt-2 border-r border-border">
                                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                                </div>

                                {/* Task/Event cell */}
                                <div className="px-3 py-2 border-r border-border space-y-1">
                                    {rowEvents.map(ev => (
                                        <div
                                            key={ev.id}
                                            className="flex items-center gap-1.5 text-xs rounded px-1.5 py-0.5"
                                            style={{ backgroundColor: ev.color ? ev.color + '30' : '#6366f130' }}
                                        >
                                            {ev.emoji && <span className="text-xs">{ev.emoji}</span>}
                                            <span className="font-medium text-foreground truncate">{ev.title}</span>
                                            <span className="text-muted-foreground ml-auto shrink-0">
                                                {format(new Date(ev.startTime), 'HH:mm')}–{format(new Date(ev.endTime), 'HH:mm')}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-2 mt-1">
                                        <button
                                            onClick={e => {
                                                const d = new Date(currentDate);
                                                d.setHours(hour, 0, 0, 0);
                                                setPopoverState({ type: 'event', x: e.clientX, y: e.clientY, date: d });
                                            }}
                                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Plus className="w-2.5 h-2.5" /> Add event
                                        </button>
                                        <button
                                            onClick={e => {
                                                const d = new Date(currentDate);
                                                d.setHours(hour, 0, 0, 0);
                                                setPopoverState({ type: 'task', x: e.clientX, y: e.clientY, date: d });
                                            }}
                                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Plus className="w-2.5 h-2.5" /> Add Task
                                        </button>
                                    </div>
                                </div>

                                {/* Actual result */}
                                <div className="flex items-start gap-1.5 px-2 py-2">
                                    {/* Result action icons */}
                                    <div className="flex items-center gap-1 mt-0.5 shrink-0">
                                        <button className="p-0.5 rounded text-green-500 hover:bg-green-50 dark:hover:bg-green-950 transition-colors">
                                            <Check className="w-3 h-3" strokeWidth={2.5} />
                                        </button>
                                        <button className="p-0.5 rounded text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-950 transition-colors">
                                            <Circle className="w-3 h-3" />
                                        </button>
                                        <button className="p-0.5 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <input
                                        value={actualResults[label] ?? ''}
                                        onChange={e => updateActual(label, e.target.value)}
                                        placeholder="Actual..."
                                        className="flex-1 text-xs bg-transparent focus:outline-none placeholder:text-muted-foreground/50 pt-0.5"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
