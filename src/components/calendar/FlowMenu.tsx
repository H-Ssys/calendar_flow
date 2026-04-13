import React from 'react';
import { X, BarChart2, CalendarPlus, ListTodo, Calendar, CalendarDays } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { useCalendar, GlobalPopoverState } from '@/context/CalendarContext';
import { useTaskContext } from '@/context/TaskContext';

interface FlowMenuProps {
  popoverState: GlobalPopoverState;
  setPopoverState: (state: GlobalPopoverState) => void;
}

export const FlowMenu: React.FC<FlowMenuProps> = ({ popoverState, setPopoverState }) => {
  const { events, setView, setDate } = useCalendar();
  const { tasks } = useTaskContext();

  if (popoverState?.type !== 'menu' || !popoverState.date) return null;

  const getEventsForDay = (day: Date) => {
    return events.filter(e => {
        const start = new Date(e.startTime);
        const end = new Date(e.endTime);
        // Normalize time to compare just the dates safely
        const dayStr = format(day, 'yyyy-MM-dd');
        return format(start, 'yyyy-MM-dd') <= dayStr && format(end, 'yyyy-MM-dd') >= dayStr;
    });
  };

  return (
    <div className="fixed inset-0 z-[100] h-screen w-screen overflow-hidden pointer-events-none">
      <div 
          className="absolute bg-popover/95 backdrop-blur-md shadow-xl border border-border rounded-xl w-[280px] flex flex-col animate-in fade-in zoom-in-95 duration-100 pointer-events-auto max-w-[calc(100vw-32px)]" 
          style={{ 
              left: Math.min(popoverState.x, window.innerWidth - 290), 
              top: Math.min(popoverState.y, window.innerHeight - 380) 
          }}
      >
          {/* Header */}
          <div className="p-4 pb-3 flex justify-between items-start">
              <div className="flex flex-col gap-0.5">
                  <h3 className="text-base font-bold text-foreground leading-none">
                      {format(popoverState.date, 'EEEE')}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-none">
                      {format(popoverState.date, 'MMMM d, yyyy')}
                  </p>
              </div>
              <button 
                  onClick={(e) => { e.stopPropagation(); setPopoverState(null); }}
                  className="text-muted-foreground hover:bg-muted p-1 rounded-md transition-colors"
                  aria-label="Close menus"
              >
                  <X className="w-4 h-4" />
              </button>
          </div>
          
          <div className="h-[1px] bg-border mx-4" />

          {/* Day Summary */}
          <div className="p-4 pt-3 pb-3">
              <div className="flex items-center gap-2 mb-3">
                  <BarChart2 className="w-[18px] h-[18px] text-muted-foreground" />
                  <span className="text-sm font-medium">Day Summary</span>
              </div>
              <div className="flex justify-between px-2 text-center">
                  <div className="flex flex-col gap-0.5">
                      <div className="text-xl font-bold leading-none">{getEventsForDay(popoverState.date).length}</div>
                      <div className="text-xs text-muted-foreground">Events</div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                      <div className="text-xl font-bold leading-none">
                          {tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), popoverState.date!)).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Tasks</div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                      <div className="text-xl font-bold text-green-500 leading-none">
                          {tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), popoverState.date!) && t.status === 'done').length}
                      </div>
                      <div className="text-xs text-muted-foreground">Done</div>
                  </div>
              </div>
          </div>

          <div className="h-[1px] bg-border mx-4" />

          {/* Menu Items */}
          <div className="p-2 space-y-0.5">
              <button 
                  className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors text-left" 
                  onClick={(e) => { e.stopPropagation(); setPopoverState({ ...popoverState, type: 'event' }); }}
              >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                      <CalendarPlus className="w-5 h-5" />
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5">
                      <div className="text-sm font-medium text-foreground leading-none">Add Event</div>
                      <div className="text-xs text-muted-foreground leading-none">Add a new event on this day</div>
                  </div>
              </button>
              
              <button 
                  className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors text-left" 
                  onClick={(e) => { e.stopPropagation(); setPopoverState({ ...popoverState, type: 'task' }); }}
              >
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                      <ListTodo className="w-5 h-5" />
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5">
                      <div className="text-sm font-medium text-foreground leading-none">Add Task</div>
                      <div className="text-xs text-muted-foreground leading-none">Add a task due on this day</div>
                  </div>
              </button>
          </div>

          <div className="h-[1px] bg-border mx-4" />

          {/* View Links */}
          <div className="p-2 flex gap-1">
              <button 
                  className="flex-1 flex items-center justify-center gap-2 p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  onClick={(e) => { 
                      e.stopPropagation(); 
                      setDate(popoverState.date!); 
                      setView('daily'); 
                      setPopoverState(null);
                  }}
              >
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium">Daily View</span>
              </button>
              <button 
                  className="flex-1 flex items-center justify-center gap-2 p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  onClick={(e) => { 
                      e.stopPropagation(); 
                      setDate(popoverState.date!); 
                      setView('weekly'); 
                      setPopoverState(null);
                  }}
              >
                  <CalendarDays className="w-4 h-4" />
                  <span className="text-xs font-medium">Weekly View</span>
              </button>
          </div>
      </div>
    </div>
  );
};
