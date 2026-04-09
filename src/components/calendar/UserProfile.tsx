import React from 'react';
import { LogOut } from 'lucide-react';

export const UserProfile: React.FC = () => {
  return (
    <div className="flex items-center gap-3 self-stretch px-0 py-4 border-t border-border">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
        <span className="text-white font-semibold text-sm">AW</span>
      </div>
      <div className="flex flex-col items-start flex-1">
        <div className="text-foreground text-base font-bold leading-6">
          Anastasia William
        </div>
        <div className="text-muted-foreground text-xs font-medium leading-[18px]">
          anastasia@gmail.com
        </div>
      </div>
      <button className="p-1 hover:bg-[hsl(var(--muted))] rounded">
        <LogOut className="w-5 h-5 text-muted-foreground" />
      </button>
    </div>
  );
};
