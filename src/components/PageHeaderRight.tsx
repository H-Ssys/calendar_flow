import React, { useState } from 'react';
import { Search, Bell, MoreHorizontal, Zap, MessageCircle, Rocket, HelpCircle, Mail, Settings, Terminal, LogOut, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const PageHeaderRight: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const close = () => setOpen(false);

  const topItems = [
    { icon: MessageCircle, label: 'Join Telegram community',      action: () => { window.open('https://t.me/', '_blank'); close(); } },
    { icon: Rocket,        label: 'Get started using Ofative',    arrow: true, action: close },
    { icon: HelpCircle,    label: 'Help',                         action: close },
    { icon: Mail,          label: 'Invite others to Ofative',     action: close },
  ];

  const bottomItems = [
    { icon: Settings,  label: 'Settings',          shortcut: 'G then S', action: () => { navigate('/settings'); close(); } },
    { icon: Terminal,  label: 'Open command line', shortcut: '⌘ K',      action: close },
    { icon: LogOut,    label: 'Log out',                                  action: () => { navigate('/login'); close(); }, danger: true },
  ];

  return (
    <div className="flex items-center gap-3 justify-end px-4 py-2 border-b border-border bg-background shrink-0">

      {/* Search */}
      <button className="p-1.5 hover:bg-muted rounded">
        <Search className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Bell */}
      <button className="relative p-1.5 hover:bg-muted rounded">
        <Bell className="w-4 h-4 text-muted-foreground" />
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">5</span>
      </button>

      {/* ··· button */}
      <div className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          className={cn('p-1.5 rounded transition-colors', open ? 'bg-muted' : 'hover:bg-muted')}
        >
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </button>

        {open && (
          <>
            {/* Full-screen backdrop — click anywhere outside to close */}
            <div
              className="fixed inset-0 z-[498]"
              onClick={close}
            />

            {/* Dropdown — sits above backdrop */}
            <div className="absolute right-0 top-full mt-1.5 z-[499] w-[270px] bg-background border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="py-1">
                {topItems.map(({ icon: Icon, label, arrow, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                    {arrow && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                ))}
              </div>

              <div className="border-t border-border py-1">
                {bottomItems.map(({ icon: Icon, label, shortcut, action, danger }) => (
                  <button
                    key={label}
                    onClick={action}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left',
                      danger ? 'text-destructive' : 'text-foreground'
                    )}
                  >
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

      {/* Availability */}
      <button className="flex items-center gap-1.5 p-1.5 hover:bg-muted rounded cursor-pointer">
        <Zap className="w-4 h-4 text-muted-foreground" />
        <span className="text-foreground text-xs font-semibold">Availability</span>
      </button>
    </div>
  );
};
