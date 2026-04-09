import React, { useMemo } from 'react';
import { useCalendar, Event } from '@/context/CalendarContext';
import { useTaskContext } from '@/context/TaskContext';
import { format, addMinutes, isWithinInterval, isPast, isToday } from 'date-fns';
import {
    Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Bell, Calendar, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NotificationCenter: React.FC = () => {
    const { events, setDate, setView, getCategoryColor, emailNotificationConfig } = useCalendar();
    const { tasks } = useTaskContext();
    const navigate = useNavigate();

    // Upcoming events in next 30 minutes (only if event notifications are enabled)
    const upcomingEvents = useMemo(() => {
        if (!emailNotificationConfig.eventUpdates) return [];
        const now = new Date();
        const soon = addMinutes(now, 30);
        return events.filter(e => {
            const start = new Date(e.startTime);
            return isWithinInterval(start, { start: now, end: soon });
        });
    }, [events, emailNotificationConfig.eventUpdates]);

    // Overdue tasks
    const overdueTasks = useMemo(() => {
        return tasks.filter(t =>
            t.dueDate &&
            t.status !== 'done' &&
            isPast(new Date(t.dueDate)) &&
            !isToday(new Date(t.dueDate))
        );
    }, [tasks]);

    const badgeCount = upcomingEvents.length + overdueTasks.length;

    const handleEventClick = (event: Event) => {
        setDate(new Date(event.startTime));
        setView('daily');
        navigate('/');
    };

    const handleTaskClick = () => {
        navigate('/tasks');
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className="relative p-1.5 hover:bg-[hsl(var(--muted))] rounded outline-none focus:ring-0">
                    <Bell className="w-4 h-4 text-muted-foreground" />
                    {badgeCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                            {badgeCount > 9 ? '9+' : badgeCount}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0 shadow-lg" align="end">
                <div className="px-4 py-3 border-b border-border">
                    <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {badgeCount === 0 ? 'All clear!' : `${badgeCount} item${badgeCount !== 1 ? 's' : ''} need attention`}
                    </p>
                </div>

                <div className="max-h-[360px] overflow-auto">
                    {/* Upcoming events */}
                    {upcomingEvents.length > 0 && (
                        <div className="p-2">
                            <span className="px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Starting soon
                            </span>
                            {upcomingEvents.map(event => (
                                <button
                                    key={event.id}
                                    onClick={() => handleEventClick(event)}
                                    className="flex items-center gap-3 w-full px-2 py-2.5 mt-1 hover:bg-muted rounded-lg transition-colors text-left"
                                >
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                                        style={{ backgroundColor: getCategoryColor(event.category, event.color) }}
                                    >
                                        {event.emoji}
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-sm font-medium text-foreground truncate">
                                            {event.title}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            <Calendar className="w-3 h-3 inline mr-1" />
                                            {format(new Date(event.startTime), 'h:mm a')}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Overdue tasks */}
                    {overdueTasks.length > 0 && (
                        <div className="p-2">
                            <span className="px-2 text-[11px] font-semibold text-destructive uppercase tracking-wider">
                                Overdue tasks
                            </span>
                            {overdueTasks.map(task => (
                                <button
                                    key={task.id}
                                    onClick={handleTaskClick}
                                    className="flex items-center gap-3 w-full px-2 py-2.5 mt-1 hover:bg-muted rounded-lg transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle className="w-4 h-4 text-destructive" />
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-sm font-medium text-foreground truncate">
                                            {task.title}
                                        </span>
                                        <span className="text-xs text-destructive">
                                            Due {format(new Date(task.dueDate!), 'MMM d')}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Empty state */}
                    {badgeCount === 0 && (
                        <div className="px-4 py-10 text-center">
                            <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No notifications</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Upcoming events and overdue tasks will appear here
                            </p>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};
