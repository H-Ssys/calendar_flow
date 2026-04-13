import React, { useState } from 'react';
import { Search, Plus, LayoutPanelLeft, Calendar as CalendarIcon, CalendarCheck2, ListTodo, FileText, CheckCircle2, AlertCircle, Clock, Menu, Users, UserPlus, ChevronDown, User, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MiniCalendar } from './MiniCalendar';
import { UserProfile } from './UserProfile';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

import { useCalendar } from '@/context/CalendarContext';
import { useTaskContext } from '@/context/TaskContext';
import { useIsMobile } from '@/hooks/useMediaQuery';

export const CalendarSidebar: React.FC = () => {
  const { searchQuery, setSearchQuery, activeCategories, toggleCategory, categories } = useCalendar();
  const { tasks, overdueTasks, todayTasks } = useTaskContext();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'My Calendar', icon: CalendarIcon },
    { path: '/tasks', label: 'Event / Task', icon: CalendarCheck2 },
    { path: '/notes', label: 'Notes', icon: FileText },
    { path: '/contacts', label: 'Smart Contacts', icon: Users },
    { path: '/teams', label: 'Team', icon: UserPlus },
  ];

  // Task stats
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;

  const getSearchPlaceholder = () => {
    if (location.pathname === '/tasks') return 'Search events & tasks...';
    if (location.pathname === '/notes') return 'Search notes...';
    return 'Find calendar or room...';
  };

  // ── Page-specific sidebar content ──

  const CalendarSidebarContent = () => (
    <>
      <h2 className="self-stretch text-muted-foreground text-sm font-semibold uppercase tracking-wider">My Calendar</h2>
      <div className="flex flex-col items-start gap-1 self-stretch">
        {categories.map((category, index) => (
          <div
            key={index}
            onClick={() => toggleCategory(category.name)}
            className={`flex items-center gap-2 self-stretch px-3.5 py-2 rounded-lg cursor-pointer transition-colors
              ${activeCategories.includes(category.name) ? 'bg-muted border border-border' : 'hover:bg-muted border border-transparent'}
            `}
          >
            <div className="w-3.5 h-3.5 rounded border-2" style={{ borderColor: category.color, backgroundColor: `${category.color}20` }} />
            <span className="flex-1 text-foreground text-sm font-medium leading-[21px]">
              {category.name}
            </span>
          </div>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 self-stretch px-3.5 py-2 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors group">
              <Plus className="w-5 h-5 text-primary group-hover:text-primary/80" />
              <span className="flex-1 text-left text-primary text-sm font-medium leading-[21px] group-hover:text-primary/80 transition-colors">
                Add calendar account
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-muted-foreground px-2 py-1 mb-1 uppercase tracking-wider">Connect Account</h3>
              {[
                { name: 'Google Calendar', icon: 'G', color: 'text-red-500' },
                { name: 'Outlook Calendar', icon: 'O', color: 'text-blue-500' },
                { name: 'iCloud Calendar', icon: 'i', color: 'text-blue-400' },
                { name: 'Exchange', icon: 'E', color: 'text-blue-600' }
              ].map((provider) => (
                <button
                  key={provider.name}
                  className="flex items-center gap-3 w-full p-2 hover:bg-muted rounded-md transition-colors text-left group"
                >
                  <div className={`w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center font-bold ${provider.color}`}>
                    {provider.icon}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground block">{provider.name}</span>
                    <span className="text-xs text-muted-foreground block group-hover:text-foreground/80">Connect</span>
                  </div>
                  <Plus className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );

  const TaskSidebarContent = () => (
    <>
      <h2 className="self-stretch text-muted-foreground text-sm font-semibold uppercase tracking-wider">Task Overview</h2>
      <div className="flex flex-col gap-2 self-stretch">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/50">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-sm text-foreground font-medium flex-1">Completed</span>
          <span className="text-xs text-muted-foreground font-semibold bg-muted px-2 py-0.5 rounded-full">{doneTasks}</span>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/50">
          <Clock className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-foreground font-medium flex-1">In Progress</span>
          <span className="text-xs text-muted-foreground font-semibold bg-muted px-2 py-0.5 rounded-full">{inProgressTasks}</span>
        </div>
        {overdueTasks.length > 0 && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-destructive/5 border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive font-medium flex-1">Overdue</span>
            <span className="text-xs text-destructive font-semibold bg-destructive/10 px-2 py-0.5 rounded-full">{overdueTasks.length}</span>
          </div>
        )}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/50">
          <CalendarIcon className="w-4 h-4 text-primary" />
          <span className="text-sm text-foreground font-medium flex-1">Due Today</span>
          <span className="text-xs text-muted-foreground font-semibold bg-muted px-2 py-0.5 rounded-full">{todayTasks.length}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-col gap-1.5 self-stretch mt-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Overall Progress</span>
          <span className="text-xs font-semibold text-foreground">{tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${tasks.length > 0 ? (doneTasks / tasks.length) * 100 : 0}%` }}
          />
        </div>
      </div>
    </>
  );

  const NoteSidebarContent = () => (
    <>
      <h2 className="self-stretch text-muted-foreground text-sm font-semibold uppercase tracking-wider">Notes</h2>
      <div className="flex flex-col gap-1 self-stretch">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground font-medium">All Notes</span>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
          <span className="text-sm">⭐</span>
          <span className="text-sm text-foreground font-medium">Favorites</span>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
          <span className="text-sm">📌</span>
          <span className="text-sm text-foreground font-medium">Pinned</span>
        </div>
      </div>
    </>
  );

  // ── Shared sidebar inner content ──
  const SidebarInner = (
    <>
      <header className="flex h-20 justify-center items-center gap-4 self-stretch p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 flex-1 self-stretch">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#4052FF] to-[#2532B0] flex items-center justify-center flex-shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="2" fill="none"></circle>
              <circle cx="12" cy="12" r="4" fill="white"></circle>
            </svg>
          </div>
          <h1 className="text-foreground text-xl font-bold flex-1 tracking-tight">Ofative</h1>
          <button className="flex items-center gap-2.5 border p-1.5 rounded-lg border-sidebar-border hover:bg-muted transition-colors" title="Collapse sidebar">
            <LayoutPanelLeft className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </header>

      <div className="px-3 py-2 border-b border-sidebar-border w-full">
        <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left" type="button">
          <div className="w-5 h-5 rounded-full bg-muted-foreground/20 flex items-center justify-center shrink-0">
            <User className="w-3 h-3 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium text-foreground truncate flex-1">Personal</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </div>

      {/* Mini Calendar */}
      <section className="flex flex-col justify-center items-center gap-3.5 self-stretch p-4 border-b border-sidebar-border w-full">
        <div className="flex flex-col items-center justify-center w-full">
          <MiniCalendar />
        </div>
      </section>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 self-stretch px-3 pt-3 pb-1 w-full">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => { navigate(path); setSheetOpen(false); }}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Main Content — Empty to match design */}
      <main className="flex flex-col items-center gap-4 flex-1 self-stretch p-4 overflow-hidden w-full">
        <div className="flex flex-col items-center gap-3 flex-1 self-stretch overflow-auto">
        </div>

        {/* User Profile */}
        <UserProfile />
      </main>
    </>
  );

  // ── Mobile: Sheet drawer ──
  if (isMobile) {
    return (
      <>
        {/* Floating hamburger button */}
        <button
          onClick={() => setSheetOpen(true)}
          className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border shadow-md hover:bg-muted transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="left" className="w-[238px] p-0 flex flex-col bg-sidebar-background">
            {SidebarInner}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // ── Desktop: Fixed sidebar ──
  return (
    <aside className="flex h-screen flex-col items-center bg-sidebar-background border-r border-sidebar-border flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden w-[238px]">
      {SidebarInner}
    </aside>
  );
};

