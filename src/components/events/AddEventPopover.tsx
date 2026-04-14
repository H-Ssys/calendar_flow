import React, { useState } from 'react';
import { X, UserPlus, Calendar, Repeat, Video, ListTodo, Plus, ChevronDown, Trash2, Check } from 'lucide-react';
import { useCalendar, PASTEL_COLORS } from '@/context/CalendarContext';

interface AddEventPopoverProps {
  x: number;
  y: number;
  onClose: () => void;
  defaultDate?: Date;
}

export const AddEventPopover: React.FC<AddEventPopoverProps> = ({ x, y, onClose, defaultDate }) => {
  const { addEvent } = useCalendar();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  // Keep popover on-screen (width: 340px, height: ~480px)
  const safeX = Math.min(x, window.innerWidth - 355);
  const safeY = Math.min(y, window.innerHeight - 490);

  const handleCreate = () => {
    if (!title) return;
    const s = defaultDate || new Date();
    const e = new Date(s);
    e.setHours(e.getHours() + 1);
    addEvent({ title, startTime: s, endTime: e, isAllDay: false, color: PASTEL_COLORS[0].value, description: notes });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute animate-in fade-in zoom-in-95 duration-200" style={{ left: `${safeX}px`, top: `${safeY}px` }}>
        <div className="w-[340px] bg-background shadow-2xl border border-border rounded-xl ring-1 ring-black/5 flex flex-col">

          {/* Header */}
          <header className="flex items-center justify-between px-3 py-2 shrink-0">
            <h1 className="text-sm font-bold text-foreground">Add Event</h1>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors" aria-label="Close">
              <X className="w-4 h-4 text-foreground" />
            </button>
          </header>

          <div className="flex-1 px-3 pb-2 space-y-2">
            {/* Title */}
            <input
              className="flex w-full rounded-md bg-background px-2.5 py-1.5 border-2 border-black dark:border-white text-foreground placeholder:text-muted-foreground focus-visible:outline-none text-xs font-medium"
              placeholder="Event title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />

            {/* Color dots */}
            <div className="flex items-center justify-between px-0.5">
              {PASTEL_COLORS.slice(0, 11).map(c => (
                <button type="button" key={c.value} className="w-4 h-4 rounded-full hover:scale-110 transition-transform" style={{ backgroundColor: c.value }} />
              ))}
            </div>

            {/* Participants */}
            <button type="button" className="flex items-center gap-2 w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-foreground hover:bg-muted transition-colors">
              <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="flex-1 text-left text-xs font-medium">Add Participant</span>
            </button>

            {/* Date & Time */}
            <div className="bg-background border border-border rounded-lg overflow-hidden">
              <button type="button" className="flex items-center gap-2 w-full px-2.5 py-1.5 text-foreground hover:bg-muted transition-colors">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="flex-1 text-left text-xs font-medium">Date and Time</span>
                <span className="text-[11px] text-muted-foreground">
                  {(() => {
                    const d = defaultDate || new Date();
                    const isToday = new Date().toDateString() === d.toDateString();
                    const dateLabel = isToday ? 'Today' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const hh = String(d.getHours()).padStart(2, '0');
                    const mm = String(d.getMinutes()).padStart(2, '0');
                    const endH = String(d.getHours() + 1).padStart(2, '0');
                    return `${dateLabel} · ${hh}:${mm} – ${endH}:${mm}`;
                  })()}
                </span>
              </button>
            </div>

            {/* Repeat */}
            <button type="button" className="flex items-center gap-2 w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              <Repeat className="w-3.5 h-3.5 text-muted-foreground/60" />
              <span className="flex-1 text-left text-xs">No repeat</span>
            </button>

            {/* Video */}
            <button type="button" className="flex items-center gap-2 w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              <Video className="w-3.5 h-3.5 text-muted-foreground/60" />
              <span className="flex-1 text-left text-xs truncate">Add or Generate Video Call</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" />
            </button>

            {/* Tasks */}
            <div className="bg-background border border-border rounded-lg overflow-hidden">
              <button type="button" className="flex items-center gap-2 w-full px-2.5 py-1.5 text-foreground hover:bg-muted transition-colors">
                <ListTodo className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="flex-1 text-left text-xs font-medium">Tasks</span>
              </button>
              <div className="px-2.5 pb-2 border-t border-border pt-2 flex gap-1.5">
                <input className="flex-1 rounded-md border border-border bg-background px-2.5 py-1 text-foreground placeholder:text-muted-foreground focus-visible:outline-none text-xs h-7" placeholder="Add a task..." />
                <button className="inline-flex items-center justify-center border border-border bg-background hover:bg-accent rounded-md h-7 w-7 shrink-0" type="button">
                  <Plus className="w-3 h-3 text-foreground/70" />
                </button>
              </div>
            </div>

            {/* Calendar picker */}
            <button type="button" className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg hover:bg-muted text-muted-foreground flex items-center gap-2 justify-start focus:outline-none">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
              <span className="flex-1 text-left">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: 'rgb(150,170,255)' }} />
                  <span className="text-xs">Work Plan</span>
                </span>
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" />
            </button>

            {/* Notes */}
            <textarea
              className="flex w-full rounded-lg border border-border px-2.5 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none min-h-[52px] bg-background resize-none"
              placeholder="Add notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-3 py-2 border-t border-border shrink-0 bg-background rounded-b-xl">
            <button className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-destructive/10 text-destructive h-8 w-8 shrink-0 transition-colors">
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button
              onClick={handleCreate}
              className="inline-flex items-center justify-center rounded-lg text-xs font-semibold h-8 px-4 flex-1 gap-1.5 bg-[#18181b] dark:bg-white hover:bg-primary/90 text-white dark:text-black transition-colors"
            >
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              Add Event
            </button>
          </div>
        </div>
      </div>
      {/* Backdrop */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
};
