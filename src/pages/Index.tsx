import React from 'react';
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar';
import { TopActionBar } from '@/components/TopActionBar';
import { WeeklyView } from '@/components/calendar/WeeklyView';
import { FloatingNotification } from '@/components/calendar/FloatingNotification';
import { DailyView } from '@/components/calendar/DailyView';
import { DailyJournalView } from '@/components/calendar/DailyJournalView';
import { MonthlyView } from '@/components/calendar/MonthlyView';
import { YearlyView } from '@/components/calendar/YearlyView';
import { Event as CalendarEvent, useCalendar } from '@/context/CalendarContext';
import { useCalendarKeyboard } from '@/hooks/useCalendarKeyboard';
import { FocusMode } from '@/components/calendar/FocusMode';
import { AddEventPopover } from '@/components/events/AddEventPopover';
import { AddTaskPopover } from '@/components/tasks/AddTaskPopover';
import { FlowMenu } from '@/components/calendar/FlowMenu';
import { EventDetail } from '@/components/events/EventDetail';
import { TaskDetail } from '@/components/tasks/TaskDetail';

const Index = () => {
  const {
    currentView,
    dailyViewVariant,
    popoverState,
    setPopoverState,
    selectedEventForDetail,
    setSelectedEventForDetail,
    selectedTaskForDetail,
    setSelectedTaskForDetail,
    getEventLogs,
  } = useCalendar();

  // Keyboard shortcuts: ←→ navigate, t=today, 1-4=views, n=new event
  useCalendarKeyboard(() => setPopoverState({ type: 'event', x: window.innerWidth / 2, y: window.innerHeight / 2 }));

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEventForDetail(event);
  };



  return (
    <div className="flex w-full h-screen bg-background overflow-hidden relative">
      {/* Left Sidebar */}
      <CalendarSidebar />

      {/* Main Content Area */}
      <main className="flex flex-col flex-1 overflow-hidden relative">
        {/* Header */}
        <TopActionBar />

        {/* Calendar Views */}
        {currentView === 'daily' ? (
          dailyViewVariant === 'journal' ? (
            <DailyJournalView onEventClick={handleEventClick} />
          ) : (
            <DailyView onEventClick={handleEventClick} />
          )
        ) : currentView === 'monthly' ? (
          <MonthlyView onEventClick={handleEventClick} />
        ) : currentView === 'yearly' ? (
          <YearlyView />
        ) : (
          <WeeklyView onEventClick={handleEventClick} />
        )}
      </main>

      {/* Floating Notification */}
      <FloatingNotification />

      {/* Focus Mode Widget */}
      <FocusMode />

      {/* ── Event Detail Popover Card ── */}
      {selectedEventForDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <EventDetail
              event={selectedEventForDetail}
              onClose={() => setSelectedEventForDetail(null)}
              logs={getEventLogs(selectedEventForDetail.id)}
            />
          </div>
          <div className="fixed inset-0 -z-10 bg-black/20" onClick={() => setSelectedEventForDetail(null)} />
        </div>
      )}

      {/* ── Task Detail Popover Card ── */}
      {selectedTaskForDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <TaskDetail
              task={selectedTaskForDetail}
              onClose={() => setSelectedTaskForDetail(null)}
            />
          </div>
          <div className="fixed inset-0 -z-10 bg-black/20" onClick={() => setSelectedTaskForDetail(null)} />
        </div>
      )}

      {/* ── Global Popover Layer ── */}
      {popoverState && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <FlowMenu popoverState={popoverState} setPopoverState={setPopoverState} />

          {popoverState.type === 'event' && (
            <div className="pointer-events-auto">
              <AddEventPopover
                x={popoverState.x}
                y={popoverState.y}
                defaultDate={popoverState.date}
                onClose={() => setPopoverState(null)}
              />
            </div>
          )}

          {popoverState.type === 'task' && (
            <div className="pointer-events-auto">
              <AddTaskPopover
                x={popoverState.x}
                y={popoverState.y}
                defaultDate={popoverState.date}
                onClose={() => setPopoverState(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Index;
