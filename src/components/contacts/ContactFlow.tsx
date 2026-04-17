import React, { useState } from 'react';
import { CalendarDays, CheckCircle2, FileText, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContactFlowProps {
  contactId: string;
  linkedEventIds: string[];
  linkedTaskIds: string[];
  linkedNoteIds: string[];
  onAddEvent: () => void;
  onAddTask: () => void;
  onAddNote: () => void;
}

type ItemType = 'event' | 'task' | 'note';

interface FlowItem {
  id: string;
  type: ItemType;
  title: string;
  date: string;
  status: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ItemType, { dot: string; icon: React.ElementType; statusBg: string; statusText: string }> = {
  event: { dot: 'bg-blue-500', icon: CalendarDays, statusBg: 'bg-blue-50 dark:bg-blue-950/40', statusText: 'text-blue-700 dark:text-blue-300' },
  task:  { dot: 'bg-amber-500', icon: CheckCircle2, statusBg: 'bg-amber-50 dark:bg-amber-950/40', statusText: 'text-amber-700 dark:text-amber-300' },
  note:  { dot: 'bg-teal-500', icon: FileText, statusBg: 'bg-teal-50 dark:bg-teal-950/40', statusText: 'text-teal-700 dark:text-teal-300' },
};

/** Placeholder items — replaced with real data in D4 */
const PLACEHOLDER_ITEMS: FlowItem[] = [
  { id: 'ph-e1', type: 'event', title: 'Coffee meeting', date: '2026-04-15', status: 'Upcoming' },
  { id: 'ph-e2', type: 'event', title: 'Product demo call', date: '2026-04-10', status: 'Completed' },
  { id: 'ph-t1', type: 'task', title: 'Send proposal draft', date: '2026-04-14', status: 'In Progress' },
  { id: 'ph-t2', type: 'task', title: 'Follow up on invoice', date: '2026-04-12', status: 'Done' },
  { id: 'ph-n1', type: 'note', title: 'Meeting notes — vision & roadmap', date: '2026-04-13', status: 'Note' },
  { id: 'ph-n2', type: 'note', title: 'Key preferences & dietary needs', date: '2026-04-08', status: 'Note' },
];

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
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60">
      <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[13px] font-medium text-neutral-700 dark:text-neutral-200 truncate">
          {item.title}
        </span>
        <span className="text-[11px] text-neutral-400">{item.date}</span>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.statusBg} ${cfg.statusText}`}>
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
  contactId,
  linkedEventIds,
  linkedTaskIds,
  linkedNoteIds,
  onAddEvent,
  onAddTask,
  onAddNote,
}: ContactFlowProps) {
  const [activeTab, setActiveTab] = useState('all');

  const events = PLACEHOLDER_ITEMS.filter((i) => i.type === 'event');
  const tasks = PLACEHOLDER_ITEMS.filter((i) => i.type === 'task');
  const notes = PLACEHOLDER_ITEMS.filter((i) => i.type === 'note');
  const allSorted = [...PLACEHOLDER_ITEMS].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex flex-col gap-3">
      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <StatCard count={linkedEventIds.length} label="Events" />
        <StatCard count={linkedTaskIds.length} label="Tasks" />
        <StatCard count={linkedNoteIds.length} label="Notes" />
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
            <div className="flex flex-col">{allSorted.map((i) => <FlowItemRow key={i.id} item={i} />)}</div>
          )}
        </TabsContent>
        <TabsContent value="events" className="mt-1">
          {events.length === 0 ? <EmptyState label="No events yet" /> : (
            <div className="flex flex-col">{events.map((i) => <FlowItemRow key={i.id} item={i} />)}</div>
          )}
        </TabsContent>
        <TabsContent value="tasks" className="mt-1">
          {tasks.length === 0 ? <EmptyState label="No tasks yet" /> : (
            <div className="flex flex-col">{tasks.map((i) => <FlowItemRow key={i.id} item={i} />)}</div>
          )}
        </TabsContent>
        <TabsContent value="notes" className="mt-1">
          {notes.length === 0 ? <EmptyState label="No notes yet" /> : (
            <div className="flex flex-col">{notes.map((i) => <FlowItemRow key={i.id} item={i} />)}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
