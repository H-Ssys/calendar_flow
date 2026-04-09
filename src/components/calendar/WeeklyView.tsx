
import React, { useEffect, useState } from 'react';
import { EventCard } from './EventCard';
import { ResizableEvent } from './ResizableEvent';
import { DroppableCell } from './DroppableCell';
import { MultiDayEventBar } from './MultiDayEventBar';
import { layoutOverlappingEvents } from '@/utils/layoutOverlappingEvents';
import { startOfWeek, addDays, format, isSameDay, differenceInMinutes, setHours, setMinutes } from 'date-fns';
import { useCalendar, Event, isMultiDayEvent } from '@/context/CalendarContext';
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable, DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface WeeklyViewProps {
  onEventClick?: (event: Event) => void;
  onCellClick?: (date: Date) => void;
}

export const WeeklyView: React.FC<WeeklyViewProps> = ({ onEventClick, onCellClick }) => {
  const { events, currentDate, searchQuery, timeConfig, updateEvent } = useCalendar();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate all-day/multi-day events from timed events
  const allDayEvents = filteredEvents.filter(event => event.isAllDay || isMultiDayEvent(event));
  const timedEvents = filteredEvents.filter(event => !event.isAllDay && !isMultiDayEvent(event));

  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(startDate, i);
    return {
      date: format(date, 'd'),
      day: format(date, 'EEE'),
      fullDate: date,
      isToday: isSameDay(date, new Date())
    };
  });

  // Use time configuration from context
  const START_HOUR = timeConfig.startHour;
  const END_HOUR = timeConfig.endHour;
  const HOUR_INTERVAL = timeConfig.hourInterval;
  const NUM_ROWS = (END_HOUR - START_HOUR) / HOUR_INTERVAL;
  const ROW_HEIGHT_REM = 10; // 10rem per interval row (160px)

  const hours = Array.from({ length: NUM_ROWS }, (_, i) => {
    const hour = START_HOUR + (i * HOUR_INTERVAL);
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const getCurrentTimePosition = () => {
    const now = currentTime;
    // Grid starts at START_HOUR
    const startOfDay = setMinutes(setHours(now, START_HOUR), 0);
    const diff = differenceInMinutes(now, startOfDay);
    const totalMinutes = (END_HOUR - START_HOUR) * 60;

    // Calculate percentage
    const percentage = (diff / totalMinutes) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Parse drop zone ID: "drop-day-{dayIndex}-hour-{hourIndex}"
    const dropId = over.id as string;
    const match = dropId.match(/drop-day-(\d+)-hour-(\d+)/);

    if (!match) return;

    const newDay = parseInt(match[1], 10);
    const newHourIndex = parseInt(match[2], 10);
    const newStartHour = START_HOUR + (newHourIndex * HOUR_INTERVAL);

    // Find the event being dragged
    const draggedEvent = events.find(e => e.id === active.id);
    if (!draggedEvent) return;

    // Calculate new startTime/endTime using the drop target
    const newStartDate = new Date(weekDays[newDay].fullDate);
    newStartDate.setHours(newStartHour, 0, 0, 0);
    const oldDurationMs = new Date(draggedEvent.endTime).getTime() - new Date(draggedEvent.startTime).getTime();
    const newEndDate = new Date(newStartDate.getTime() + oldDurationMs);

    updateEvent(draggedEvent.id, {
      startTime: newStartDate,
      endTime: newEndDate,
    });
  };

  const activeEvent = activeId ? events.find(e => e.id === activeId) : null;

  const handleResize = (eventId: string, newDurationHours: number) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    // Use startTime to calculate new endTime
    const start = new Date(event.startTime);
    const newEnd = new Date(start.getTime() + newDurationHours * 60 * 60 * 1000);

    updateEvent(eventId, {
      endTime: newEnd,
    });
  };

  // Group timed events by day index and compute overlap layout per day
  const eventsByDay = new Map<number, typeof timedEvents>();
  for (const event of timedEvents) {
    const jsDay = new Date(event.startTime).getDay();
    const dayIdx = jsDay === 0 ? 6 : jsDay - 1;
    if (!eventsByDay.has(dayIdx)) eventsByDay.set(dayIdx, []);
    eventsByDay.get(dayIdx)!.push(event);
  }
  const layoutMaps = new Map<number, ReturnType<typeof layoutOverlappingEvents>>();
  for (const [dayIdx, dayEvents] of eventsByDay) {
    layoutMaps.set(dayIdx, layoutOverlappingEvents(dayEvents));
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col flex-1 overflow-hidden bg-background h-full">
        {/* Week Days Header */}
        <div className="flex w-full items-start h-10 border-b border-border flex-shrink-0 bg-background z-10">
          {/* GMT Timezone */}
          <div className="flex w-16 flex-shrink-0 flex-col justify-center items-center gap-0.5 self-stretch border-r border-border">
            <div className="flex justify-center items-center text-foreground text-center text-[8px] font-semibold bg-muted px-1.5 py-0.5 rounded-md">
              GMT+7
            </div>
          </div>

          {/* Days */}
          {weekDays.map((dayObj, index) => (
            <div
              key={index}
              className={`flex flex-col items-center justify-center flex-1 h-full border-r border-border last:border-r-0 ${dayObj.isToday ? 'bg-blue-50/50' : ''}`}
            >
              <span className="text-[8px] font-medium text-muted-foreground uppercase">{dayObj.day}</span>
              <span className={`text-[11px] font-semibold ${dayObj.isToday ? 'text-primary' : 'text-foreground'}`}>
                {dayObj.date}
              </span>
            </div>
          ))}
        </div>

        {/* All-day / Multi-day Events Section */}
        {allDayEvents.length > 0 && (
          <div className="flex w-full border-b border-border bg-muted/30 min-h-[3rem] max-h-[8rem] overflow-y-auto">
            {/* Time column spacer */}
            <div className="w-16 flex-shrink-0 border-r border-border bg-background flex items-center justify-center">
              <span className="text-[9px] text-muted-foreground font-medium uppercase writing-mode-vertical transform rotate-180">
                All Day
              </span>
            </div>

            {/* All-day events container */}
            <div className="flex-1 relative py-2" style={{ minHeight: '3rem' }}>
              {allDayEvents.map((event, index) => {
                // Calculate which day this event starts on
                const eventStartDay = (new Date(event.startTime).getDay() + 6) % 7; // Monday = 0

                return (
                  <MultiDayEventBar
                    key={event.id}
                    event={event}
                    startDayIndex={eventStartDay}
                    visibleDays={7}
                    onClick={onEventClick}
                  />
                );
              })}
            </div>

            {/* Scrollbar spacer */}
            <div className="w-4 flex-shrink-0" />
          </div>
        )}

        {/* Grid — fills available viewport height, no scroll */}
        <div className="flex flex-1 min-h-0 overflow-hidden w-full relative">
          {/* Time Column */}
          <div className="w-16 flex-shrink-0 border-r border-border bg-background z-10 flex flex-col h-full pt-2">
            {hours.map((time, index) => (
              <div key={index} className="border-b border-border relative flex-1">
                {/* Label positioned at top line of the cell */}
                <span className="absolute -top-2 left-0 right-0 text-center text-[10px] text-muted-foreground font-medium bg-background px-1">
                  {time}
                </span>
              </div>
            ))}
          </div>

          {/* Event Grid */}
          <div className="flex-1 relative min-w-0 h-full">
            {/* Combined Grid - fills available height */}
            <div className="absolute inset-0 z-0 flex pt-2">
              {weekDays.map((dayObj, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`flex-1 flex flex-col border-r border-border last:border-r-0 ${dayObj.isToday ? 'bg-blue-50/50' : ''}`}
                >
                  {hours.map((_, rowIndex) => (
                    <DroppableCell
                      key={`${dayIndex}-${rowIndex}`}
                      id={`drop-day-${dayIndex}-hour-${rowIndex}`}
                      className="border-b border-border pointer-events-auto cursor-pointer hover:bg-primary/5 transition-colors flex-1"
                      onClick={() => {
                        if (onCellClick) {
                          const cellDate = new Date(dayObj.date);
                          cellDate.setHours(rowIndex, 0, 0, 0);
                          onCellClick(cellDate);
                        }
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Global Events Overlay — top offset matches grid's pt-2 so % positions align */}
            <div className="absolute left-0 right-0 bottom-0 z-10 pointer-events-none" style={{ top: '0.5rem' }}>
              {timedEvents.map(event => {
                try {
                  // Use startTime/endTime Date objects for positioning
                  const start = new Date(event.startTime);
                  const end = new Date(event.endTime);

                  const startHour = start.getHours();
                  const startMinute = start.getMinutes();
                  const endHour = end.getHours();
                  const endMinute = end.getMinutes();

                  // Grid starts at START_HOUR
                  const startMinutesFromStart = (startHour - START_HOUR) * 60 + startMinute;
                  const endMinutesFromStart = (endHour - START_HOUR) * 60 + endMinute;
                  const durationMinutes = endMinutesFromStart - startMinutesFromStart;

                  // Position as percentage of total grid height
                  const totalMinutes = (END_HOUR - START_HOUR) * 60;
                  const topPercent = (startMinutesFromStart / totalMinutes) * 100;
                  const heightPercent = Math.max((durationMinutes / totalMinutes) * 100, 2);

                  if (startMinutesFromStart < 0) return null;

                  // Calculate HORIZONTAL position with overlap layout
                  const jsDay = start.getDay(); // 0=Sun, 6=Sat
                  const dayIdx = jsDay === 0 ? 6 : jsDay - 1; // Convert to 0=Mon, 6=Sun
                  const dayWidth = 100 / 7;
                  const baseLeft = dayIdx * dayWidth;

                  const dayLayout = layoutMaps.get(dayIdx);
                  const layout = dayLayout?.get(event.id);
                  const col = layout?.column ?? 0;
                  const totalCols = layout?.totalColumns ?? 1;

                  let leftPercent: number;
                  let eventWidth: number;
                  let contentPaddingRight: string | undefined;

                  if (totalCols <= 2) {
                    // STACKED OFFSET — matching reference design
                    // col 0: full width, col 1: offset 30% right, width 70%
                    const offsetFraction = col === 0 ? 0 : 0.3;
                    const offsetPercent = offsetFraction * dayWidth;
                    leftPercent = baseLeft + offsetPercent;
                    eventWidth = dayWidth - offsetPercent - 0.2;
                    // Keep col-0 text in uncovered left area
                    contentPaddingRight = (col === 0 && totalCols > 1)
                      ? '35%'
                      : undefined;
                  } else {
                    // EQUAL COLUMNS — side-by-side for 3+ events
                    const gap = 0.02;
                    const colWidth = dayWidth / totalCols;
                    leftPercent = baseLeft + col * colWidth;
                    eventWidth = colWidth - gap;
                    contentPaddingRight = undefined;
                  }

                  // z-index based on start time: later events render ON TOP
                  const eventZIndex = 10 + Math.round(startMinutesFromStart / 15);

                  return (
                    <ResizableEvent
                      key={event.id}
                      event={event}
                      style={{
                        top: `${topPercent}%`,
                        height: `${heightPercent}%`,
                        left: `${leftPercent}%`,
                        width: `${eventWidth}%`,
                        zIndex: eventZIndex,
                      }}
                      contentPaddingRight={contentPaddingRight}
                      onClick={onEventClick}
                      onResize={handleResize}
                      hourInterval={HOUR_INTERVAL}
                      rowHeightRem={ROW_HEIGHT_REM}
                    />
                  );
                } catch (e) {
                  console.error("Error rendering event:", event.id);
                  return null;
                }
              })}
            </div>

            {/* Current Time Indicator — offset matches grid's pt-2 */}
            <div className="absolute left-0 right-0 bottom-0 z-20 pointer-events-none" style={{ top: '0.5rem' }}>
              {weekDays.map((dayObj, dayIndex) => (
                dayObj.isToday && (
                  <div
                    key={`time-${dayIndex}`}
                    className="absolute border-t-2 border-green-500 pointer-events-none"
                    style={{
                      top: `${getCurrentTimePosition()}%`,
                      left: `${(dayIndex / 7) * 100}%`,
                      width: `${100 / 7}%`
                    }}
                  >
                    <div className="absolute -left-1 -top-[5px] w-2 h-2 bg-green-500 rounded-full" />
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay - shows ghost of dragged event */}
      <DragOverlay>
        {activeEvent ? (
          <div className="opacity-80">
            <EventCard event={activeEvent} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
