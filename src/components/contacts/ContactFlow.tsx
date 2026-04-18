import React, { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import type { Event } from '@/context/CalendarContext';
import type { Task, TaskPriority } from '@/types/task';
import type { Note } from '@/types/note';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContactFlowProps {
  contactId: string;
  linkedEvents: Event[];
  linkedTasks: Task[];
  linkedNotes: Note[];
  onAddEvent: () => void;
  onAddTask: () => void;
  onAddNote: () => void;
}

type ItemType = 'event' | 'task' | 'note';

interface FlowItem {
  id: string;
  type: ItemType;
  title: string;
  /** Display date string */
  dateLabel: string;
  /** Date used for sorting (ms since epoch). */
  sortKey: number;
  status: string;
  /** Optional per-item status tint override (used for task priority). */
  tint?: { bg: string; text: string };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ItemType, { dot: string; icon: React.ElementType; statusBg: string; statusText: string }> = {
  event: { dot: 'bg-blue-500', icon: CalendarDays, statusBg: 'bg-blue-50 dark:bg-blue-950/40', statusText: 'text-blue-700 dark:text-blue-300' },
  task:  { dot: 'bg-amber-500', icon: CheckCircle2, statusBg: 'bg-amber-50 dark:bg-amber-950/40', statusText: 'text-amber-700 dark:text-amber-300' },
  note:  { dot: 'bg-teal-500', icon: FileText, statusBg: 'bg-teal-50 dark:bg-teal-950/40', statusText: 'text-teal-700 dark:text-teal-300' },
};

const PRIORITY_TINT: Record<TaskPriority, { bg: string; text: string }> = {
  urgent: { bg: 'bg-red-50 dark:bg-red-950/40',    text: 'text-red-700 dark:text-red-300' },
  high:   { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300' },
  medium: { bg: 'bg-amber-50 dark:bg-amber-950/40',   text: 'text-amber-700 dark:text-amber-300' },
  low:    { bg: 'bg-slate-50 dark:bg-slate-900/40',   text: 'text-slate-600 dark:text-slate-300' },
};

// ─── Adapters: domain → FlowItem ─────────────────────────────────────────────

function eventToFlowItem(e: Event): FlowItem {
  const start = new Date(e.startTime);
  const now = Date.now();
  const status = start.getTime() >= now ? 'Upcoming' : 'Past';
  return {
    id: e.id,
    type: 'event',
    title: e.title,
    dateLabel: format(start, 'MMM d, yyyy'),
    sortKey: start.getTime(),
    status,
  };
}

function taskToFlowItem(t: Task): FlowItem {
  const due = t.dueDate ? new Date(t.dueDate) : undefined;
  const sortKey = due?.getTime() ?? new Date(t.updatedAt).getTime();
  return {
    id: t.id,
    type: 'task',
    title: t.title,
    dateLabel: due ? format(due, 'MMM d, yyyy') : 'No due date',
    sortKey,
    status: t.priority,
    tint: PRIORITY_TINT[t.priority],
  };
}

function noteToFlowItem(n: Note): FlowItem {
  const updated = new Date(n.updatedAt);
  return {
    id: n.id,
    type: 'note',
    title: n.title,
    dateLabel: format(updated, 'MMM d, yyyy'),
    sortKey: updated.getTime(),
    status: 'Note',
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ count, label }: { count: number; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-lg bg-neutral-50 py-2.5 dark:bg-neutral-900/60">
      <span className="text-xl font-medium text-neutral-800 dark:text-neutral-100 tabular-nums">
        {count}
      </span>
      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wide font-medium">
        {label}
      </span>
    </div>
  );
}

function FlowItemRow({ item }: { item: FlowItem }) {
  const cfg = TYPE_CONFIG[item.type];
  const tint = item.tint ?? { bg: cfg.statusBg, text: cfg.statusText };
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60">
      <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[13px] font-medium text-neutral-700 dark:text-neutral-200 truncate">
          {item.title}
        </span>
        <span className="text-[11px] text-neutral-400">{item.dateLabel}</span>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${tint.bg} ${tint.text}`}>
        {item.status}
      </span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="py-6 text-center text-sm text-neutral-400 italic">{label}</p>
  );
}

// ─── Add Button ──────────────────────────────────────────────────────────────

function AddButton({
  tab,
  onAddEvent,
  onAddTask,
  onAddNote,
}: {
  tab: string;
  onAddEvent: () => void;
  onAddTask: () => void;
  onAddNote: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  if (tab === 'events') {
    return (
      <Button id="flow-add-event" variant="ghost" size="sm" className="gap-1.5 text-neutral-500 hover:text-blue-600" onClick={onAddEvent}>
        <Plus size={14} /> Add event
      </Button>
    );
  }
  if (tab === 'tasks') {
    return (
      <Button id="flow-add-task" variant="ghost" size="sm" className="gap-1.5 text-neutral-500 hover:text-amber-600" onClick={onAddTask}>
        <Plus size={14} /> Add task
      </Button>
    );
  }
  if (tab === 'notes') {
    return (
      <Button id="flow-add-note" variant="ghost" size="sm" className="gap-1.5 text-neutral-500 hover:text-teal-600" onClick={onAddNote}>
        <Plus size={14} /> Add note
      </Button>
    );
  }

  // "All" tab — quick picker
  return (
    <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
      <PopoverTrigger asChild>
        <Button id="flow-add-all" variant="ghost" size="sm" className="gap-1.5 text-neutral-500 hover:text-indigo-600">
          <Plus size={14} /> Add
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 p-1.5">
        <button type="button" onClick={() => { onAddEvent(); setPickerOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> Event
        </button>
        <button type="button" onClick={() => { onAddTask(); setPickerOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Task
        </button>
        <button type="button" onClick={() => { onAddNote(); setPickerOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
          <span className="h-2 w-2 rounded-full bg-teal-500" /> Note
        </button>
      </PopoverContent>
    </Popover>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ContactFlow({
  linkedEvents,
  linkedTasks,
  linkedNotes,
  onAddEvent,
  onAddTask,
  onAddNote,
}: ContactFlowProps) {
  const [activeTab, setActiveTab] = useState('all');

  const eventItems = useMemo(() => linkedEvents.map(eventToFlowItem), [linkedEvents]);
  const taskItems  = useMemo(() => linkedTasks.map(taskToFlowItem),  [linkedTasks]);
  const noteItems  = useMemo(() => linkedNotes.map(noteToFlowItem),  [linkedNotes]);

  const allSorted = useMemo(
    () => [...eventItems, ...taskItems, ...noteItems].sort((a, b) => b.sortKey - a.sortKey),
    [eventItems, taskItems, noteItems],
  );
  const eventsSorted = useMemo(() => [...eventItems].sort((a, b) => b.sortKey - a.sortKey), [eventItems]);
  const tasksSorted  = useMemo(() => [...taskItems].sort((a, b) => b.sortKey - a.sortKey),  [taskItems]);
  const notesSorted  = useMemo(() => [...noteItems].sort((a, b) => b.sortKey - a.sortKey),  [noteItems]);

  return (
    <div className="flex flex-col gap-3">
      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <StatCard count={linkedEvents.length} label="Events" />
        <StatCard count={linkedTasks.length} label="Tasks" />
        <StatCard count={linkedNotes.length} label="Notes" />
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList className="h-8 bg-transparent p-0 gap-1">
            <TabsTrigger value="all" className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-neutral-900 data-[state=active]:text-white dark:data-[state=active]:bg-neutral-100 dark:data-[state=active]:text-neutral-900">
              All
            </TabsTrigger>
            <TabsTrigger value="events" className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-950 dark:data-[state=active]:text-blue-300">
              Events
            </TabsTrigger>
            <TabsTrigger value="tasks" className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 dark:data-[state=active]:bg-amber-950 dark:data-[state=active]:text-amber-300">
              Tasks
            </TabsTrigger>
            <TabsTrigger value="notes" className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950 dark:data-[state=active]:text-teal-300">
              Notes
            </TabsTrigger>
          </TabsList>
          <AddButton tab={activeTab} onAddEvent={onAddEvent} onAddTask={onAddTask} onAddNote={onAddNote} />
        </div>

        <TabsContent value="all" className="mt-1">
          {allSorted.length === 0 ? <EmptyState label="No activity yet" /> : (
            <div className="flex flex-col">{allSorted.map((i) => <FlowItemRow key={`${i.type}:${i.id}`} item={i} />)}</div>
          )}
        </TabsContent>
        <TabsContent value="events" className="mt-1">
          {eventsSorted.length === 0 ? <EmptyState label="No events yet" /> : (
            <div className="flex flex-col">{eventsSorted.map((i) => <FlowItemRow key={i.id} item={i} />)}</div>
          )}
        </TabsContent>
        <TabsContent value="tasks" className="mt-1">
          {tasksSorted.length === 0 ? <EmptyState label="No tasks yet" /> : (
            <div className="flex flex-col">{tasksSorted.map((i) => <FlowItemRow key={i.id} item={i} />)}</div>
          )}
        </TabsContent>
        <TabsContent value="notes" className="mt-1">
          {notesSorted.length === 0 ? <EmptyState label="No notes yet" /> : (
            <div className="flex flex-col">{notesSorted.map((i) => <FlowItemRow key={i.id} item={i} />)}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
