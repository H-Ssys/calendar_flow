import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Plus,
} from 'lucide-react';
import {
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  format,
} from 'date-fns';
import { useCalendar, ViewType } from '@/context/CalendarContext';

interface TopActionBarProps {
  onAddEvent?: () => void;
}

const viewOptions: ViewType[] = ['daily', 'weekly', 'monthly', 'yearly'];

export const TopActionBar: React.FC<TopActionBarProps> = ({ onAddEvent }) => {
  const { currentView, setView, currentDate, setDate } = useCalendar();

  const handlePrev = () => {
    if (currentView === 'daily') setDate(subDays(currentDate, 1));
    else if (currentView === 'weekly') setDate(subWeeks(currentDate, 1));
    else if (currentView === 'monthly') setDate(subMonths(currentDate, 1));
    else if (currentView === 'yearly')
      setDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1));
  };

  const handleNext = () => {
    if (currentView === 'daily') setDate(addDays(currentDate, 1));
    else if (currentView === 'weekly') setDate(addWeeks(currentDate, 1));
    else if (currentView === 'monthly') setDate(addMonths(currentDate, 1));
    else if (currentView === 'yearly')
      setDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1));
  };

  return (
    <header className="flex w-full h-10 justify-between items-center px-4 border-b border-border bg-background">
      {/* Month / Year + navigation */}
      <div className="flex items-center gap-2">
        <div className="text-center">
          <div className="text-foreground text-sm font-semibold leading-tight">
            {format(currentDate, 'MMMM')}
          </div>
          <div className="text-muted-foreground text-xs font-medium leading-tight">
            {format(currentDate, 'yyyy')}
          </div>
        </div>
        <div className="flex items-start gap-0.5 ml-2">
          <button
            onClick={handlePrev}
            aria-label="Previous"
            className="p-1 hover:bg-muted rounded"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Next"
            className="p-1 hover:bg-muted rounded"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* View switcher */}
      <div className="flex items-center gap-2">
        <div className="flex items-center border bg-muted p-0.5 rounded-lg border-border">
          {viewOptions.map((view) => (
            <button
              key={view}
              onClick={() => setView(view)}
              className={`flex h-7 justify-center items-center gap-2 flex-1 text-xs font-medium leading-none px-2 rounded-md transition-all capitalize
                ${
                  currentView === view
                    ? 'shadow-sm text-primary font-bold bg-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          aria-label="Search"
          className="p-1.5 hover:bg-muted rounded"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          aria-label="Notifications"
          className="p-1.5 hover:bg-muted rounded"
        >
          <Bell className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={onAddEvent}
          className="flex h-8 items-center gap-1.5 text-white text-xs font-semibold bg-primary px-3 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add event</span>
        </button>
      </div>
    </header>
  );
};

export default TopActionBar;
