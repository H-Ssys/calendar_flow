import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalendar } from '@/context/CalendarContext';
import { cn } from '@/lib/utils';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const MiniCalendar: React.FC = () => {
  const { currentDate, setDate } = useCalendar();
  const [viewDate, setViewDate] = useState(() => startOfMonth(currentDate));

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Chunk days into rows of 7
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="w-full select-none px-1">
      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4 mb-4 pt-1">
        <button
          onClick={() => setViewDate(prev => subMonths(prev, 1))}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[15px] font-semibold text-foreground min-w-[110px] text-center">
          {format(viewDate, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => setViewDate(prev => addMonths(prev, 1))}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(label => (
          <div
            key={label}
            className="flex items-center justify-center h-8 text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="flex flex-col gap-0.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map(day => {
              const selected = isSameDay(day, currentDate);
              const today = isToday(day);
              const inMonth = isSameMonth(day, viewDate);

              return (
                <div key={day.toISOString()} className="flex items-center justify-center">
                  <button
                    onClick={() => { setDate(day); setViewDate(startOfMonth(day)); }}
                    className={cn(
                      'w-9 h-9 rounded-xl text-sm transition-colors',
                      selected
                        ? 'bg-foreground text-background font-semibold'
                        : today
                        ? 'bg-muted text-foreground font-medium'
                        : inMonth
                        ? 'text-foreground hover:bg-muted'
                        : 'text-muted-foreground/40 hover:bg-muted/50'
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
