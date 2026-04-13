import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Plus,
  MoreHorizontal,
  Zap,
  BookOpen,
  Calendar,
  MessageCircle,
  Rocket,
  HelpCircle,
  Mail,
  Settings,
  Terminal,
  LogOut,
  ChevronRight as ChevronRightIcon,
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
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface TopActionBarProps {
  onAddEvent?: () => void;
}

const viewOptions: ViewType[] = ['daily', 'weekly', 'monthly', 'yearly'];

export const TopActionBar: React.FC<TopActionBarProps> = ({ onAddEvent }) => {
  const { currentView, setView, currentDate, setDate, setPopoverState, dailyViewVariant, setDailyViewVariant } = useCalendar();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

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

  const topItems = [
    { icon: MessageCircle, label: 'Join Telegram community',   action: () => { window.open('https://t.me/', '_blank'); closeMenu(); } },
    { icon: Rocket,        label: 'Get started using Ofative', arrow: true, action: closeMenu },
    { icon: HelpCircle,    label: 'Help',                      action: closeMenu },
    { icon: Mail,          label: 'Invite others to Ofative',  action: closeMenu },
  ];
  const bottomItems = [
    { icon: Settings,  label: 'Settings',          shortcut: 'G then S', action: () => { navigate('/settings'); closeMenu(); } },
    { icon: Terminal,  label: 'Open command line', shortcut: '⌘ K',      action: closeMenu },
    { icon: LogOut,    label: 'Log out',                                  action: () => { navigate('/login'); closeMenu(); }, danger: true },
  ];

  return (
    <div>
      <header className="flex items-center justify-between px-4 h-12 border-b border-border bg-background shrink-0">

        {/* Left — date nav */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-foreground">
              {format(currentDate, currentView === 'yearly' ? 'yyyy' : currentView === 'monthly' ? 'MMMM yyyy' : 'MMMM')}
            </span>
            {currentView !== 'yearly' && currentView !== 'monthly' && (
              <span className="text-sm text-muted-foreground">{format(currentDate, 'yyyy')}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handlePrev} className="p-1 hover:bg-muted rounded transition-colors">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={handleNext} className="p-1 hover:bg-muted rounded transition-colors">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Centre — view switcher */}
        <div className="flex items-center bg-muted border border-border p-0.5 rounded-lg gap-0.5">
          {viewOptions.map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 h-7 text-xs font-medium rounded-md capitalize transition-all',
                currentView === v
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-2">
          <button className="p-1.5 hover:bg-muted rounded">
            <Search className="w-[18px] h-[18px] text-muted-foreground" />
          </button>
          <button className="p-1.5 hover:bg-muted rounded relative">
            <Bell className="w-[18px] h-[18px] text-muted-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* ··· menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className={cn('p-1.5 rounded transition-colors', menuOpen ? 'bg-muted' : 'hover:bg-muted')}
            >
              <MoreHorizontal className="w-[18px] h-[18px] text-muted-foreground" />
            </button>

            {menuOpen && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-[498]" onClick={closeMenu} />
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-1.5 z-[499] w-[270px] bg-background border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="py-1">
                    {topItems.map(({ icon: Icon, label, arrow, action }) => (
                      <button key={label} onClick={action} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left">
                        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="flex-1">{label}</span>
                        {arrow && <ChevronRightIcon className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-border py-1">
                    {bottomItems.map(({ icon: Icon, label, shortcut, action, danger }: any) => (
                      <button key={label} onClick={action} className={cn('w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left', danger ? 'text-destructive' : 'text-foreground')}>
                        <Icon className={cn('w-4 h-4 flex-shrink-0', danger ? 'text-destructive/70' : 'text-muted-foreground')} />
                        <span className="flex-1">{label}</span>
                        {shortcut && <span className="text-xs text-muted-foreground font-mono">{shortcut}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button className="flex h-8 items-center gap-1 text-muted-foreground text-xs font-medium mx-1 px-2 hover:bg-muted bg-background border border-border shadow-sm rounded-md transition-colors">
            <Zap className="w-3.5 h-3.5" />
            Availability
          </button>

          <button
            onClick={(e) => {
              if (onAddEvent) {
                onAddEvent();
              } else {
                const rect = e.currentTarget.getBoundingClientRect();
                setPopoverState({ type: 'event', x: rect.left - 200, y: rect.bottom + 10, date: new Date() });
              }
            }}
            className="flex h-8 items-center gap-1.5 text-white text-xs font-semibold bg-primary px-3 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Event
          </button>
        </div>
      </header>

      {currentView === 'daily' && (
        <div className="flex justify-center border-b border-border bg-background py-1.5">
          <div className="flex items-center border bg-muted p-0.5 rounded-lg border-border">
            <button
              onClick={() => setDailyViewVariant('timeline')}
              className={cn('flex h-7 justify-center items-center gap-1.5 min-w-[100px] text-xs font-medium px-3 rounded-md transition-all',
                dailyViewVariant === 'timeline' ? 'shadow-sm text-foreground font-semibold bg-background' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              Timeline
            </button>
            <button
              onClick={() => setDailyViewVariant('journal')}
              className={cn('flex h-7 justify-center items-center gap-1.5 min-w-[100px] text-xs font-medium px-3 rounded-md transition-all',
                dailyViewVariant === 'journal' ? 'shadow-sm text-foreground font-semibold bg-background' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Journal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopActionBar;
