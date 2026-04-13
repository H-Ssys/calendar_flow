import React, { useState } from 'react';
import { X, Calendar, Flag, ChevronDown, Check, Clock, Tag, CheckCircle2, Link2, Plus } from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import { cn } from '@/lib/utils';

interface AddTaskPopoverProps {
  x: number;
  y: number;
  onClose: () => void;
  defaultDate?: Date;
}

const COLORS = [
  '#cbd5e1', '#fca5a5', '#86efac', '#93c5fd', '#a78bfa',
  '#c084fc', '#f472b6', '#fb923c', '#facc15', '#fef08a', '#a7f3d0'
];

export const AddTaskPopover: React.FC<AddTaskPopoverProps> = ({ x, y, onClose, defaultDate }) => {
  const { addTask } = useTaskContext();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [status, setStatus] = useState('todo');

  // Keep popover on-screen (width: 340px, height: ~460px)
  const safeX = Math.min(x, window.innerWidth - 355);
  const safeY = Math.min(y, window.innerHeight - 470);

  const handleCreate = () => {
    if (!title) return;
    addTask({
      title,
      description,
      status: status as any,
      priority,
      dueDate: defaultDate?.toISOString() || new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute animate-in fade-in zoom-in-95 duration-200" style={{ left: `${safeX}px`, top: `${safeY}px` }}>
        <div className="w-[340px] bg-background shadow-2xl border border-border rounded-xl ring-1 ring-black/5 flex flex-col">

          {/* Header */}
          <header className="flex items-center justify-between px-3 py-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#facc15]" />
              <h1 className="text-sm font-bold text-foreground">Add Task</h1>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
              <X className="w-4 h-4 text-foreground" />
            </button>
          </header>

          <div className="flex-1 px-3 pb-2 space-y-2">
            {/* Title */}
            <input
              className="flex w-full rounded-md bg-background px-2.5 py-1.5 border-2 border-black dark:border-white text-foreground text-xs font-medium placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary"
              placeholder="Task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />

            {/* Description */}
            <textarea
              className="flex w-full rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none min-h-[48px] bg-background resize-none"
              placeholder="Add description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {/* Colors */}
            <div className="flex gap-1.5">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn('w-4 h-4 rounded-full transition-transform hover:scale-110', color === c ? 'ring-2 ring-primary ring-offset-1' : '')}
                  style={{ backgroundColor: c, border: c === '#cbd5e1' ? '2px solid #0f172a' : 'none' }}
                />
              ))}
            </div>

            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Flag className="w-3 h-3" /> Status
                </div>
                <div className="border border-border rounded-md px-2.5 py-1.5 flex justify-between items-center bg-background cursor-pointer hover:bg-muted/30">
                  <span className="text-xs flex items-center gap-1.5">📋 To Do</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" /> Priority
                </div>
                <div className="border border-border rounded-md px-2.5 py-1.5 flex justify-between items-center bg-background cursor-pointer hover:bg-muted/30">
                  <span className="text-xs flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#facc15] inline-block" /> Medium
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Due Date & Time */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Calendar className="w-3 h-3" /> Due Date &amp; Time
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-1.5">
                <div className="border border-border rounded-md px-2.5 py-1.5 flex justify-between items-center bg-background cursor-pointer hover:bg-muted/30">
                  <span className="text-xs text-foreground">
                    {defaultDate ? defaultDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                  </span>
                  <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                </div>
                <div className="border border-border rounded-md px-2 py-1.5 flex items-center gap-1.5 bg-background cursor-pointer hover:bg-muted/30 w-[90px]">
                  <span className="text-xs text-foreground flex-1 text-center">06:00 AM</span>
                  <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Tag className="w-3 h-3" /> Tags
              </div>
              <div className="flex gap-1.5">
                <input type="text" placeholder="Add tag..." className="flex-1 border border-border rounded-md h-7 px-2.5 text-xs focus:outline-none bg-background placeholder:text-muted-foreground" />
                <button className="h-7 w-7 border border-border rounded-md flex items-center justify-center hover:bg-muted bg-background shrink-0">
                  <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Subtasks */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <CheckCircle2 className="w-3 h-3" /> Subtasks
              </div>
              <div className="flex gap-1.5">
                <input type="text" placeholder="Add subtask..." className="flex-1 border border-border rounded-md h-7 px-2.5 text-xs focus:outline-none bg-background placeholder:text-muted-foreground" />
                <button className="h-7 w-7 border border-border rounded-md flex items-center justify-center hover:bg-muted bg-background shrink-0">
                  <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Linked Events */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link2 className="w-3 h-3" /> Linked Events
              </div>
              <div className="border border-border rounded-md px-2.5 py-1.5 flex justify-between items-center bg-background cursor-pointer hover:bg-muted/30">
                <span className="text-xs text-muted-foreground">Link an event...</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-border shrink-0 bg-background rounded-b-xl">
            <button
              onClick={handleCreate}
              className="w-full inline-flex items-center justify-center rounded-lg text-xs font-semibold h-8 px-4 gap-1.5 bg-[#18181b] dark:bg-white hover:bg-primary/90 text-white dark:text-black transition-colors"
            >
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              Create Task
            </button>
          </div>
        </div>
      </div>
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
};
