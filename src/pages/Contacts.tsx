import React from 'react';
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar';

const Contacts: React.FC = () => {
  return (
    <div className="flex w-full h-screen bg-background overflow-hidden">
      <CalendarSidebar />
      <main className="flex flex-1 items-center justify-center">
        <h1 className="text-2xl font-semibold text-foreground">Smart Contacts</h1>
      </main>
    </div>
  );
};

export default Contacts;
