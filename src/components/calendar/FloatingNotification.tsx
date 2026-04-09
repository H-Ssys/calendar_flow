import React, { useState } from 'react';
import { X } from 'lucide-react';

export const FloatingNotification: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="flex items-center gap-3 shadow-lg fixed z-50 bg-background border border-border p-4 rounded-xl bottom-8 right-8">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
        <span className="text-white font-semibold text-sm">AW</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="text-xl">📅</div>
        <div className="flex flex-col gap-0.5">
          <div className="text-foreground text-sm font-semibold leading-[21px]">
            Weekly Meeting
          </div>
          <div className="text-muted-foreground text-xs font-medium leading-[18px]">
            Upcoming event
          </div>
        </div>
      </div>
      
      <div className="flex items-center">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border border-white -ml-1 first:ml-0 flex items-center justify-center"
          >
            <span className="text-white text-[6px] font-semibold">
              {String.fromCharCode(65 + index)}
            </span>
          </div>
        ))}
        <div className="w-4 h-4 rounded-full bg-[hsl(var(--muted))] border border-white -ml-1 flex items-center justify-center">
          <span className="text-[hsl(var(--primary-blue))] text-[6px] font-semibold">+1</span>
        </div>
      </div>
      
      <button
        onClick={() => setIsVisible(false)}
        className="ml-2 p-1 hover:bg-[hsl(var(--muted))] rounded"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
};
