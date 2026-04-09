import React from 'react';
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { WeeklyView } from '@/components/calendar/WeeklyView';
import { FloatingNotification } from '@/components/calendar/FloatingNotification';
import { AddEventForm } from '@/components/calendar/AddEventForm';
import { DailyView } from '@/components/calendar/DailyView';
import { DailyJournalView } from '@/components/calendar/DailyJournalView';
import { MonthlyView } from '@/components/calendar/MonthlyView';
import { YearlyView } from '@/components/calendar/YearlyView';
import { Event as CalendarEvent, useCalendar } from '@/context/CalendarContext';
import { useCalendarKeyboard } from '@/hooks/useCalendarKeyboard';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { FocusMode } from '@/components/calendar/FocusMode';

const Index = () => {
  const { currentView, dailyViewVariant } = useCalendar();
  const [isAddEventOpen, setIsAddEventOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);
  const [prefillEvent, setPrefillEvent] = React.useState<Partial<CalendarEvent> | null>(null);
  const isMobile = useIsMobile();

  // Keyboard shortcuts: ←→ navigate, t=today, 1-4=views, n=new event
  useCalendarKeyboard(() => setIsAddEventOpen(true));

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setPrefillEvent(null);
    setIsAddEventOpen(true);
  };

  const handleCellClick = (date: Date) => {
    const endDate = new Date(date);
    endDate.setHours(date.getHours() + 1);
    setPrefillEvent({
      startTime: date,
      endTime: endDate,
      isAllDay: false,
    });
    setSelectedEvent(null);
    setIsAddEventOpen(true);
  };

  const handleClose = () => {
    setIsAddEventOpen(false);
    setSelectedEvent(null);
    setPrefillEvent(null);
  };

  return (
    <div className="flex w-full h-screen bg-background overflow-hidden relative">
      {/* Left Sidebar */}
      <CalendarSidebar />

      {/* Main Content Area */}
      <main className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <CalendarHeader onAddEvent={() => setIsAddEventOpen(true)} />

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
          <WeeklyView onEventClick={handleEventClick} onCellClick={handleCellClick} />
        )}
      </main>

      {/* Floating Notification */}
      <FloatingNotification />

      {/* Focus Mode Widget */}
      <FocusMode />

      {/* Add Event Sidebar Overlay */}
      {isAddEventOpen && (
        <div
          className="absolute inset-0 bg-black/20 z-50 flex justify-end"
          onClick={handleClose}
        >
          <div
            className="animate-in slide-in-from-right duration-300 h-full shadow-2xl [&_button:has(svg.lucide-refresh-cw)]:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <AddEventForm
              onClose={handleClose}
              initialEvent={selectedEvent || (prefillEvent as CalendarEvent) || null}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;

