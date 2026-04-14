import React from 'react';
import {
  X, BarChart2, CalendarPlus, ListTodo,
  Calendar, CalendarDays, CalendarRange, Clock, ChevronRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useCalendar, GlobalPopoverState } from '@/context/CalendarContext';
import { useTaskContext } from '@/context/TaskContext';

interface FlowMenuProps {
  popoverState: GlobalPopoverState;
  setPopoverState: (state: GlobalPopoverState) => void;
}

export const FlowMenu: React.FC<FlowMenuProps> = ({ popoverState, setPopoverState }) => {
  const { events, currentView, setView, setDate, setDailyViewVariant } = useCalendar();
  const { tasks } = useTaskContext();

  if (popoverState?.type !== 'menu' || !popoverState.date) return null;

  const date = popoverState.date;

  // ── Shared helpers ────────────────────────────────────────────────
  const close = () => setPopoverState(null);

  const goToday = (targetDate: Date, view: 'daily' | 'weekly' | 'monthly') => {
    setDate(targetDate);
    setView(view);
    close();
  };

  // ── Per-view computed values ──────────────────────────────────────

  // Daily / Weekly: events & tasks for the clicked day
  const dayStr = format(date, 'yyyy-MM-dd');
  const dayEvents = events.filter(e => {
    try {
      const s = format(new Date(e.startTime), 'yyyy-MM-dd');
      const en = format(new Date(e.endTime), 'yyyy-MM-dd');
      return s <= dayStr && en >= dayStr;
    } catch { return false; }
  });
  const dayTasks = tasks.filter(t =>
    t.dueDate && format(new Date(t.dueDate), 'yyyy-MM-dd') === dayStr
  );
  const dayDone = dayTasks.filter(t => t.status === 'done').length;

  // Yearly: events for the clicked month
  const monthStart = startOfMonth(date);
  const monthEnd   = endOfMonth(date);
  const monthEvents = events.filter(e => {
    try {
      const s = new Date(e.startTime);
      const en = new Date(e.endTime);
      return s <= monthEnd && en >= monthStart;
    } catch { return false; }
  });
  const monthTasks = tasks.filter(t =>
    t.dueDate &&
    new Date(t.dueDate) >= monthStart &&
    new Date(t.dueDate) <= monthEnd
  );

  // ── Position ──────────────────────────────────────────────────────
  const menuW = 280;
  const menuH = 360;
  const left = Math.min(popoverState.x, window.innerWidth - menuW - 12);
  const top  = Math.min(popoverState.y, window.innerHeight - menuH - 12);

  // ── Render helper ─────────────────────────────────────────────────
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  const timeLabel = hasTime ? format(date, 'HH:mm') : null;

  // ── View-specific props ───────────────────────────────────────────
  type ViewConfig = {
    header: React.ReactNode;
    stats: { label: string; value: number; color?: string }[];
    navLinks: { icon: React.ElementType; label: string; onClick: () => void }[];
  };

  const configs: Record<string, ViewConfig> = {

    daily: {
      header: (
        <>
          <div className="text-base font-bold text-foreground leading-none">
            {timeLabel ? `${format(date, 'EEEE')} · ${timeLabel}` : format(date, 'EEEE')}
          </div>
          <div className="text-xs text-muted-foreground leading-none mt-0.5">
            {format(date, 'MMMM d, yyyy')}
          </div>
        </>
      ),
      stats: [
        { label: 'Events', value: dayEvents.length },
        { label: 'Tasks', value: dayTasks.length },
        { label: 'Done', value: dayDone, color: 'text-green-500' },
      ],
      navLinks: [
        { icon: CalendarDays, label: 'Weekly View', onClick: () => goToday(date, 'weekly') },
        { icon: CalendarRange, label: 'Monthly View', onClick: () => goToday(date, 'monthly') },
      ],
    },

    weekly: {
      header: (
        <>
          <div className="text-base font-bold text-foreground leading-none">
            {format(date, 'EEEE')}
            {timeLabel && <span className="text-primary ml-1.5">{timeLabel}</span>}
          </div>
          <div className="text-xs text-muted-foreground leading-none mt-0.5">
            {format(date, 'MMMM d, yyyy')}
          </div>
        </>
      ),
      stats: [
        { label: 'Events', value: dayEvents.length },
        { label: 'Tasks', value: dayTasks.length },
        { label: 'Done', value: dayDone, color: 'text-green-500' },
      ],
      navLinks: [
        { icon: Calendar, label: 'Daily View', onClick: () => { setDailyViewVariant('timeline'); goToday(date, 'daily'); } },
        { icon: CalendarRange, label: 'Monthly View', onClick: () => goToday(date, 'monthly') },
      ],
    },

    yearly: {
      header: (
        <>
          <div className="text-base font-bold text-foreground leading-none">
            {format(date, 'MMMM yyyy')}
          </div>
          <div className="text-xs text-muted-foreground leading-none mt-0.5">
            Click to explore this month
          </div>
        </>
      ),
      stats: [
        { label: 'Events', value: monthEvents.length },
        { label: 'Tasks', value: monthTasks.length },
        { label: 'Done', value: monthTasks.filter(t => t.status === 'done').length, color: 'text-green-500' },
      ],
      navLinks: [
        { icon: CalendarRange, label: 'View Month', onClick: () => goToday(date, 'monthly') },
        { icon: CalendarDays, label: 'View Week', onClick: () => goToday(date, 'weekly') },
      ],
    },
  };

  // Fallback to weekly config for any other view
  const cfg = configs[currentView] ?? configs.weekly;

  // ── Event add label ───────────────────────────────────────────────
  const addEventLabel = currentView === 'yearly'
    ? `Add Event in ${format(date, 'MMMM')}`
    : timeLabel
    ? `Add Event at ${timeLabel}`
    : 'Add Event';

  const addTaskLabel = currentView === 'yearly'
    ? `Add Task in ${format(date, 'MMMM')}`
    : timeLabel
    ? `Add Task at ${timeLabel}`
    : 'Add Task';

  return (
    <div className="fixed inset-0 z-[100] h-screen w-screen overflow-hidden pointer-events-none">
      <div
        className="absolute bg-popover/95 backdrop-blur-md shadow-xl border border-border rounded-xl w-[280px] flex flex-col animate-in fade-in zoom-in-95 duration-100 pointer-events-auto"
        style={{ left, top }}
      >
        {/* Header */}
        <div className="p-3.5 pb-3 flex justify-between items-start shrink-0">
          <div className="flex flex-col gap-0.5">{cfg.header}</div>
          <button
            onClick={(e) => { e.stopPropagation(); close(); }}
            className="text-muted-foreground hover:bg-muted p-1 rounded-md transition-colors ml-2 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="h-px bg-border mx-3.5" />

        {/* Stats */}
        <div className="px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {currentView === 'yearly' ? 'Month Summary' : 'Day Summary'}
            </span>
          </div>
          <div className="flex justify-between">
            {cfg.stats.map(stat => (
              <div key={stat.label} className="flex flex-col items-center gap-0.5">
                <div className={`text-lg font-bold leading-none ${stat.color ?? 'text-foreground'}`}>
                  {stat.value}
                </div>
                <div className="text-[10px] text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-border mx-3.5" />

        {/* Add Event / Add Task */}
        <div className="p-2 space-y-0.5">
          <button
            className="w-full flex items-center gap-2.5 p-2 hover:bg-muted rounded-lg transition-colors text-left"
            onClick={(e) => { e.stopPropagation(); setPopoverState({ ...popoverState, type: 'event' }); }}
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 shrink-0">
              <CalendarPlus className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="text-xs font-semibold text-foreground leading-none">{addEventLabel}</div>
              <div className="text-[10px] text-muted-foreground leading-none truncate">Tap to fill details</div>
            </div>
          </button>

          <button
            className="w-full flex items-center gap-2.5 p-2 hover:bg-muted rounded-lg transition-colors text-left"
            onClick={(e) => { e.stopPropagation(); setPopoverState({ ...popoverState, type: 'task' }); }}
          >
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center text-green-600 shrink-0">
              <ListTodo className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="text-xs font-semibold text-foreground leading-none">{addTaskLabel}</div>
              <div className="text-[10px] text-muted-foreground leading-none truncate">Tap to fill details</div>
            </div>
          </button>
        </div>

        <div className="h-px bg-border mx-3.5" />

        {/* Navigation links */}
        <div className="p-2 flex gap-1">
          {cfg.navLinks.map(({ icon: Icon, label, onClick }) => (
            <button
              key={label}
              className="flex-1 flex items-center justify-center gap-1.5 p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onClick(); }}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] font-medium truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
