import React, { useState, useMemo, useCallback } from 'react';
import { useCalendar, Event, EventLog } from '@/context/CalendarContext';
import { EventCard } from './EventCard';
import { EventDetail } from './EventDetail';
import { EventCreateDialog } from './EventCreateDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Search, Plus, CalendarCheck2, Trash2, Tag, Clock,
    BarChart3, AlertTriangle, Copy, ChevronDown, ChevronRight,
    History, Filter, Calendar as CalendarIcon, X
} from 'lucide-react';
import { format, isToday, isBefore, isAfter, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, areIntervalsOverlapping } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type DateRange = 'today' | 'this-week' | 'this-month' | 'upcoming' | 'past' | 'all';
type SortField = 'date' | 'title' | 'category' | 'duration';
type SortDir = 'asc' | 'desc';

// ── Event statistics helper ─────────────────────────────────────────
const computeStats = (events: Event[]) => {
    const now = new Date();
    const upcoming = events.filter(e => isAfter(new Date(e.startTime), now));
    const today = events.filter(e => isToday(new Date(e.startTime)));
    const past = events.filter(e => isBefore(new Date(e.endTime), now));

    // Hours per category
    const catHours: Record<string, number> = {};
    events.forEach(e => {
        const cat = e.category || 'Uncategorized';
        const hours = (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / (1000 * 60 * 60);
        catHours[cat] = (catHours[cat] || 0) + hours;
    });

    const totalHours = Object.values(catHours).reduce((a, b) => a + b, 0);

    return { upcoming: upcoming.length, today: today.length, past: past.length, totalHours, catHours };
};

// ── Conflict detection ──────────────────────────────────────────────
const findConflicts = (events: Event[]): [Event, Event][] => {
    const conflicts: [Event, Event][] = [];
    for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
            const a = events[i], b = events[j];
            if (a.isAllDay || b.isAllDay) continue;
            try {
                if (areIntervalsOverlapping(
                    { start: new Date(a.startTime), end: new Date(a.endTime) },
                    { start: new Date(b.startTime), end: new Date(b.endTime) },
                )) {
                    conflicts.push([a, b]);
                }
            } catch { /* ignore invalid intervals */ }
        }
    }
    return conflicts;
};

export const EventPage: React.FC = () => {
    const { events, deleteEvent, addEvent, updateEvent, categories, eventLogs, getEventLogs, getCategoryColor } = useCalendar();

    // ── State ────────────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState<DateRange>('all');
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showStats, setShowStats] = useState(false);
    const [showConflicts, setShowConflicts] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const [pastCollapsed, setPastCollapsed] = useState(true);

    // ── Derived ──────────────────────────────────────────────────────
    const now = useMemo(() => new Date(), []);

    const filteredEvents = useMemo(() => {
        let list = [...events];

        // Search
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(e =>
                e.title.toLowerCase().includes(q) ||
                e.description?.toLowerCase().includes(q) ||
                e.category?.toLowerCase().includes(q)
            );
        }

        // Category
        if (categoryFilter !== 'all') {
            list = list.filter(e => e.category === categoryFilter);
        }

        // Date range
        const today = new Date();
        switch (dateRange) {
            case 'today':
                list = list.filter(e => isToday(new Date(e.startTime)));
                break;
            case 'this-week':
                list = list.filter(e => {
                    const d = new Date(e.startTime);
                    return isAfter(d, startOfWeek(today, { weekStartsOn: 1 })) &&
                        isBefore(d, endOfWeek(today, { weekStartsOn: 1 }));
                });
                break;
            case 'this-month':
                list = list.filter(e => {
                    const d = new Date(e.startTime);
                    return isAfter(d, startOfMonth(today)) && isBefore(d, endOfMonth(today));
                });
                break;
            case 'upcoming':
                list = list.filter(e => isAfter(new Date(e.startTime), now));
                break;
            case 'past':
                list = list.filter(e => isBefore(new Date(e.endTime), now));
                break;
        }

        // Sort
        list.sort((a, b) => {
            let cmp = 0;
            switch (sortField) {
                case 'date':
                    cmp = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                    break;
                case 'title':
                    cmp = a.title.localeCompare(b.title);
                    break;
                case 'category':
                    cmp = (a.category || '').localeCompare(b.category || '');
                    break;
                case 'duration': {
                    const durA = new Date(a.endTime).getTime() - new Date(a.startTime).getTime();
                    const durB = new Date(b.endTime).getTime() - new Date(b.startTime).getTime();
                    cmp = durA - durB;
                    break;
                }
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return list;
    }, [events, search, categoryFilter, dateRange, sortField, sortDir, now]);

    // Split into upcoming / past
    const upcomingEvents = useMemo(() => filteredEvents.filter(e => isAfter(new Date(e.endTime), now)), [filteredEvents, now]);
    const pastEvents = useMemo(() => filteredEvents.filter(e => isBefore(new Date(e.endTime), now)), [filteredEvents, now]);

    const stats = useMemo(() => computeStats(events), [events]);
    const conflicts = useMemo(() => findConflicts(events.filter(e => isAfter(new Date(e.endTime), now))), [events, now]);

    const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) ?? null : null;

    // ── Handlers ─────────────────────────────────────────────────────
    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const selectAll = () => setSelectedIds(new Set(filteredEvents.map(e => e.id)));
    const deselectAll = () => setSelectedIds(new Set());

    const bulkDelete = () => {
        selectedIds.forEach(id => deleteEvent(id, 'event-page'));
        setSelectedIds(new Set());
    };

    const bulkChangeCategory = (cat: string) => {
        selectedIds.forEach(id => updateEvent(id, { category: cat }, 'event-page'));
        setSelectedIds(new Set());
    };

    const duplicateEvent = (event: Event) => {
        const { id, ...rest } = event;
        addEvent({ ...rest, title: `${rest.title} (copy)` }, 'event-page');
    };

    return (
        <div className="flex flex-1 overflow-hidden">
            {/* Main list area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="border-b border-border bg-background px-4 py-3 space-y-3">
                    {/* Top row */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-foreground">Events</h1>
                            <Badge variant="secondary" className="gap-1 text-xs">
                                <CalendarCheck2 className="w-3 h-3" />
                                {events.length} total
                            </Badge>
                            {stats.today > 0 && (
                                <Badge variant="outline" className="gap-1 text-xs text-blue-600 border-blue-200">
                                    <Clock className="w-3 h-3" />
                                    {stats.today} today
                                </Badge>
                            )}
                            {conflicts.length > 0 && (
                                <button
                                    onClick={() => setShowConflicts(!showConflicts)}
                                    className="inline-flex items-center gap-1"
                                >
                                    <Badge variant="destructive" className="gap-1 text-xs cursor-pointer">
                                        <AlertTriangle className="w-3 h-3" />
                                        {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
                                    </Badge>
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost" size="sm"
                                onClick={() => setShowStats(!showStats)}
                                className={cn("gap-1 text-xs", showStats && "bg-muted")}
                            >
                                <BarChart3 className="w-3.5 h-3.5" /> Stats
                            </Button>
                            <Button
                                variant="ghost" size="sm"
                                onClick={() => setShowLogs(!showLogs)}
                                className={cn("gap-1 text-xs", showLogs && "bg-muted")}
                            >
                                <History className="w-3.5 h-3.5" /> Logs
                            </Button>
                            <Button onClick={() => setShowCreateDialog(true)} size="sm" className="gap-1">
                                <Plus className="w-4 h-4" />
                                Add Event
                            </Button>
                        </div>
                    </div>

                    {/* Conflict banner */}
                    {showConflicts && conflicts.length > 0 && (
                        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-destructive flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Scheduling Conflicts
                                </span>
                                <button onClick={() => setShowConflicts(false)} className="text-muted-foreground hover:text-foreground">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            {conflicts.map(([a, b], i) => (
                                <div key={i} className="text-xs text-muted-foreground bg-background rounded px-2 py-1.5">
                                    <span className="font-medium text-foreground">{a.emoji} {a.title}</span>
                                    {' overlaps with '}
                                    <span className="font-medium text-foreground">{b.emoji} {b.title}</span>
                                    <span className="ml-1 opacity-60">
                                        ({format(new Date(a.startTime), 'HH:mm')}–{format(new Date(a.endTime), 'HH:mm')})
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Statistics Panel */}
                    {showStats && (
                        <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-foreground">Event Statistics</span>
                                <button onClick={() => setShowStats(false)} className="text-muted-foreground hover:text-foreground">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div className="bg-background rounded-lg p-2.5 border border-border text-center">
                                    <div className="text-lg font-bold text-foreground">{stats.upcoming}</div>
                                    <div className="text-[10px] text-muted-foreground">Upcoming</div>
                                </div>
                                <div className="bg-background rounded-lg p-2.5 border border-border text-center">
                                    <div className="text-lg font-bold text-blue-600">{stats.today}</div>
                                    <div className="text-[10px] text-muted-foreground">Today</div>
                                </div>
                                <div className="bg-background rounded-lg p-2.5 border border-border text-center">
                                    <div className="text-lg font-bold text-foreground">{stats.past}</div>
                                    <div className="text-[10px] text-muted-foreground">Past</div>
                                </div>
                                <div className="bg-background rounded-lg p-2.5 border border-border text-center">
                                    <div className="text-lg font-bold text-foreground">{stats.totalHours.toFixed(1)}</div>
                                    <div className="text-[10px] text-muted-foreground">Total Hours</div>
                                </div>
                            </div>
                            {/* Hours by category */}
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Hours by Category</span>
                                {Object.entries(stats.catHours).sort((a, b) => b[1] - a[1]).map(([cat, hours]) => (
                                    <div key={cat} className="flex items-center gap-2">
                                        <div
                                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: getCategoryColor(cat) }}
                                        />
                                        <span className="text-xs text-foreground flex-1">{cat}</span>
                                        <span className="text-xs font-medium text-muted-foreground">{hours.toFixed(1)}h</span>
                                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${Math.min((hours / stats.totalHours) * 100, 100)}%`,
                                                    backgroundColor: getCategoryColor(cat),
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Activity Log Panel */}
                    {showLogs && (
                        <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-foreground">Recent Activity</span>
                                <button onClick={() => setShowLogs(false)} className="text-muted-foreground hover:text-foreground">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            {eventLogs.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No activity yet.</p>
                            ) : (
                                eventLogs.slice(0, 30).map(log => (
                                    <div key={log.id} className="flex items-start gap-2 text-xs">
                                        <span className={cn(
                                            "mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0",
                                            log.action === 'created' && "bg-green-500",
                                            log.action === 'updated' && "bg-blue-500",
                                            log.action === 'deleted' && "bg-red-500",
                                        )} />
                                        <div className="flex-1 min-w-0">
                                            <span className="font-medium text-foreground">{log.eventTitle}</span>
                                            <span className="text-muted-foreground"> {log.action}</span>
                                            {log.changes && (
                                                <span className="text-muted-foreground/60">
                                                    {' — '}
                                                    {Object.keys(log.changes).join(', ')}
                                                </span>
                                            )}
                                            <div className="text-[10px] text-muted-foreground/50">
                                                {format(new Date(log.timestamp), 'MMM d, HH:mm')} · {log.source}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Filter row */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-1 max-w-xs border border-input rounded-lg px-3 h-8 bg-background focus-within:ring-2 focus-within:ring-ring">
                            <Search className="w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search events..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue placeholder="All categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map(c => (
                                    <SelectItem key={c.name} value={c.name}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                                            {c.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Dates</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="this-week">This Week</SelectItem>
                                <SelectItem value="this-month">This Month</SelectItem>
                                <SelectItem value="upcoming">Upcoming</SelectItem>
                                <SelectItem value="past">Past</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={`${sortField}-${sortDir}`} onValueChange={(v) => {
                            const [f, d] = v.split('-') as [SortField, SortDir];
                            setSortField(f); setSortDir(d);
                        }}>
                            <SelectTrigger className="w-[150px] h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="date-asc">Date ↑</SelectItem>
                                <SelectItem value="date-desc">Date ↓</SelectItem>
                                <SelectItem value="title-asc">Title A→Z</SelectItem>
                                <SelectItem value="title-desc">Title Z→A</SelectItem>
                                <SelectItem value="category-asc">Category A→Z</SelectItem>
                                <SelectItem value="duration-desc">Longest first</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Bulk action bar */}
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-2 ml-auto">
                                <Badge variant="secondary" className="text-xs">{selectedIds.size} selected</Badge>
                                <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs h-7">
                                    Clear
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm" className="text-xs h-7 gap-1">
                                            <Trash2 className="w-3 h-3" /> Delete
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete {selectedIds.size} events?</AlertDialogTitle>
                                            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={bulkDelete}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}
                    </div>
                </div>

                {/* Event list */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                    {filteredEvents.length === 0 ? (
                        /* Empty state */
                        <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <CalendarCheck2 className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">No events found</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {search || categoryFilter !== 'all' || dateRange !== 'all'
                                        ? 'Try adjusting your filters'
                                        : 'Create your first event to get started'}
                                </p>
                            </div>
                            {!search && categoryFilter === 'all' && dateRange === 'all' && (
                                <Button onClick={() => setShowCreateDialog(true)} className="gap-1">
                                    <Plus className="w-4 h-4" /> Create your first event
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Upcoming section */}
                            {upcomingEvents.length > 0 && (
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 px-1">
                                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Upcoming ({upcomingEvents.length})
                                        </span>
                                        {filteredEvents.length > 5 && (
                                            <button onClick={selectAll} className="text-[10px] text-primary hover:underline">
                                                Select all
                                            </button>
                                        )}
                                    </div>
                                    {upcomingEvents.map(event => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            isSelected={selectedIds.has(event.id)}
                                            onSelect={() => toggleSelect(event.id)}
                                            onClick={() => setSelectedEventId(event.id)}
                                            onDuplicate={() => duplicateEvent(event)}
                                            onDelete={() => deleteEvent(event.id, 'event-page')}
                                            getCategoryColor={getCategoryColor}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Past section (collapsible) */}
                            {pastEvents.length > 0 && (
                                <div className="space-y-1.5">
                                    <button
                                        onClick={() => setPastCollapsed(!pastCollapsed)}
                                        className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                                    >
                                        {pastCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        Past ({pastEvents.length})
                                    </button>
                                    {!pastCollapsed && pastEvents.map(event => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            isSelected={selectedIds.has(event.id)}
                                            onSelect={() => toggleSelect(event.id)}
                                            onClick={() => setSelectedEventId(event.id)}
                                            onDuplicate={() => duplicateEvent(event)}
                                            onDelete={() => deleteEvent(event.id, 'event-page')}
                                            getCategoryColor={getCategoryColor}
                                            isPast
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Detail panel */}
            {selectedEvent && (
                <EventDetail
                    event={selectedEvent}
                    onClose={() => setSelectedEventId(null)}
                    logs={getEventLogs(selectedEvent.id)}
                />
            )}

            {/* Create dialog */}
            <EventCreateDialog
                open={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
            />
        </div>
    );
};
