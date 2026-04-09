import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { useCalendar } from '@/context/CalendarContext';

export const MiniCalendar: React.FC = () => {
  const { currentDate, setDate } = useCalendar();

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <Calendar
        mode="single"
        selected={currentDate}
        onSelect={(date) => date && setDate(date)}
        className="rounded-md border-none p-0 w-full"
        classNames={{
          month: "w-full space-y-4",
          head_cell: "text-muted-foreground w-8 font-normal text-[0.8rem]",
          cell: "h-8 w-8 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
          day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 rounded-lg hover:bg-muted",
          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-lg",
          day_today: "bg-muted text-foreground font-bold",
          nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-muted rounded-md",
        }}
      />
    </div>
  );
};
