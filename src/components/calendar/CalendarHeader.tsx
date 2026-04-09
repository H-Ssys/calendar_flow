import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, ChevronRight, Search, MoreHorizontal, Zap, Plus,
  MessageCircle, Rocket, HelpCircle, Mail, Settings2, Terminal, LogOut,
  MousePointerClick
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useCalendar, ViewType, DailyViewVariant } from '@/context/CalendarContext';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { SearchCommand } from './SearchCommand';
import { NotificationCenter } from './NotificationCenter';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, BookOpen } from 'lucide-react';

interface CalendarHeaderProps {
  onAddEvent?: () => void;
}

const viewI18nMap: Record<ViewType, string> = {
  daily: 'calendar.daily',
  weekly: 'calendar.weekly',
  monthly: 'calendar.monthly',
  yearly: 'calendar.yearly',
};

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({ onAddEvent }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentView, setView, dailyViewVariant, setDailyViewVariant, currentDate, setDate } = useCalendar();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handlePrev = () => {
    if (currentView === 'daily') setDate(subDays(currentDate, 1));
    if (currentView === 'weekly') setDate(subWeeks(currentDate, 1));
    if (currentView === 'monthly') setDate(subMonths(currentDate, 1));
    if (currentView === 'yearly') setDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1));
  };

  const handleNext = () => {
    if (currentView === 'daily') setDate(addDays(currentDate, 1));
    if (currentView === 'weekly') setDate(addWeeks(currentDate, 1));
    if (currentView === 'monthly') setDate(addMonths(currentDate, 1));
    if (currentView === 'yearly') setDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1));
  };

  // Capitalize for display
  const viewOptions: ViewType[] = ['daily', 'weekly', 'monthly', 'yearly'];

  return (
    <header className="flex w-full h-10 justify-between items-center px-4 border-b border-border bg-background">
      <div className="flex items-center gap-2">
        <div className="text-center">
          <div className="text-foreground text-sm font-semibold leading-tight">{format(currentDate, 'MMMM')}</div>
          <div className="text-muted-foreground text-xs font-medium leading-tight">{format(currentDate, 'yyyy')}</div>
        </div>
        <div className="flex items-start gap-0.5 ml-2">
          <button onClick={handlePrev} className="p-1 hover:bg-muted rounded">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={handleNext} className="p-1 hover:bg-muted rounded">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex items-center border bg-muted p-0.5 rounded-lg border-border">
          {viewOptions.map((view) => (
            <button
              key={view}
              onClick={() => setView(view)}
              className={`flex h-7 justify-center items-center gap-2 flex-1 text-xs font-medium leading-none px-2 rounded-md transition-all capitalize
                ${currentView === view
                  ? 'shadow-sm text-primary font-bold bg-background'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {t(viewI18nMap[view])}
            </button>
          ))}
        </div>

        {/* Daily View Variant Selector - Only visible when in daily view */}
        {currentView === 'daily' && (
          <div className="flex w-[180px] items-start border bg-muted p-0.5 rounded-lg border-border">
            <button
              onClick={() => setDailyViewVariant('timeline')}
              className={`flex h-7 justify-center items-center gap-1.5 flex-1 text-xs font-medium leading-none px-2 rounded-md transition-all
                ${dailyViewVariant === 'timeline'
                  ? 'shadow-sm text-primary font-bold bg-background'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <CalendarIcon className="w-3 h-3" />
              Timeline
            </button>
            <button
              onClick={() => setDailyViewVariant('journal')}
              className={`flex h-7 justify-center items-center gap-1.5 flex-1 text-xs font-medium leading-none px-2 rounded-md transition-all
                ${dailyViewVariant === 'journal'
                  ? 'shadow-sm text-primary font-bold bg-background'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <BookOpen className="w-3 h-3" />
              Journal
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="p-1.5 hover:bg-[hsl(var(--muted))] rounded"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
        </button>
        <SearchCommand open={isSearchOpen} onOpenChange={setIsSearchOpen} />

        <NotificationCenter />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 hover:bg-[hsl(var(--muted))] rounded outline-none focus:ring-0">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2 bg-background border border-border shadow-md rounded-lg">
            <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 cursor-pointer text-foreground text-sm font-medium hover:bg-muted rounded-md outline-none">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              <span>Join Telegram community</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="flex items-center justify-between gap-3 px-3 py-2 cursor-pointer text-foreground text-sm font-medium hover:bg-muted rounded-md outline-none">
              <div className="flex items-center gap-3">
                <Rocket className="w-4 h-4 text-muted-foreground" />
                <span>Get started using Ofative</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </DropdownMenuItem>

            <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 cursor-pointer text-foreground text-sm font-medium hover:bg-muted rounded-md outline-none">
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
              <span>Help</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 cursor-pointer text-foreground text-sm font-medium hover:bg-muted rounded-md outline-none">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>Invite others to Ofative</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1 border-t border-border" />

            <DropdownMenuItem
              onClick={() => navigate('/settings')}
              className="flex items-center justify-between px-3 py-2 cursor-pointer text-foreground text-sm font-medium hover:bg-muted rounded-md outline-none"
            >
              <div className="flex items-center gap-3">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                <span>Settings</span>
              </div>
              <span className="text-xs text-muted-foreground">G then S</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="flex items-center justify-between px-3 py-2 cursor-pointer text-foreground text-sm font-medium hover:bg-muted rounded-md outline-none">
              <div className="flex items-center gap-3">
                <Terminal className="w-4 h-4 text-muted-foreground" />
                <span>Open command line</span>
              </div>
              <span className="text-xs text-muted-foreground">⌘ K</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 cursor-pointer text-foreground text-sm font-medium hover:bg-muted rounded-md outline-none mt-1">
              <LogOut className="w-4 h-4 text-muted-foreground" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 p-1.5 hover:bg-[hsl(var(--muted))] rounded outline-none focus:ring-0 cursor-pointer">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground text-center text-xs font-semibold">
                Availability
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0 shadow-lg" align="end">
            <div className="p-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-3 px-1">Scheduling links</h4>

              <div className="group flex gap-3 cursor-pointer hover:bg-muted p-2 rounded-lg transition-colors">
                <div className="w-1 bg-blue-500 rounded-full h-auto min-h-[32px] self-stretch"></div>
                <div>
                  <div className="text-sm font-semibold text-foreground leading-none mb-1.5">30–min meeting</div>
                  <div className="text-xs text-muted-foreground font-medium">30 mins <span className="mx-0.5 text-border">|</span> Google Meet</div>
                </div>
              </div>
            </div>

            <div className="h-[1px] bg-border w-full"></div>

            <div className="p-2">
              <button className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-muted rounded-md text-sm font-medium text-foreground transition-colors text-left outline-none">
                <Plus className="w-4 h-4 text-muted-foreground" />
                <span>Add scheduling link</span>
              </button>

              <button className="flex items-center justify-between w-full px-2 py-1.5 hover:bg-muted rounded-md text-sm font-medium text-foreground transition-colors text-left outline-none">
                <div className="flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4 text-muted-foreground" />
                  <span>Share specific times</span>
                </div>
                <span className="text-xs text-muted-foreground">S</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
        <button
          onClick={onAddEvent}
          className="flex h-8 items-center gap-1.5 text-white text-xs font-semibold bg-primary px-3 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('calendar.addEvent')}</span>
        </button>
      </div>
    </header>
  );
};
