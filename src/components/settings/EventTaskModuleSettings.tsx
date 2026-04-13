import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Bell, Zap, RefreshCw, Tag, Layers, Clock } from 'lucide-react';

interface SettingRow {
  id: string;
  title: string;
  description: string;
  defaultOn?: boolean;
}

const EVENT_SETTINGS: SettingRow[] = [
  { id: 'reminders', title: 'Default reminders', description: 'Automatically add reminders to new events', defaultOn: true },
  { id: 'smart-detect', title: 'Smart event detection', description: 'Detect events from emails and messages automatically', defaultOn: true },
  { id: 'auto-duration', title: 'Smart duration', description: 'Suggest durations based on event type and past behavior', defaultOn: false },
  { id: 'location-suggest', title: 'Location suggestions', description: 'Suggest meeting locations based on participant preferences', defaultOn: false },
];

const TASK_SETTINGS: SettingRow[] = [
  { id: 'auto-priority', title: 'Auto-priority scoring', description: 'Automatically score and rank tasks by urgency and importance', defaultOn: true },
  { id: 'due-nudge', title: 'Due date nudges', description: 'Remind you to set due dates for tasks without them', defaultOn: true },
  { id: 'link-events', title: 'Link tasks to events', description: 'Automatically suggest linking tasks to relevant calendar events', defaultOn: false },
  { id: 'subtask-ai', title: 'AI subtask breakdown', description: 'Suggest subtasks when creating new tasks', defaultOn: false },
];

function SettingToggleRow({ row }: { row: SettingRow }) {
  const [on, setOn] = useState(row.defaultOn ?? false);
  return (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{row.title}</p>
        <p className="text-xs text-muted-foreground">{row.description}</p>
      </div>
      <Switch checked={on} onCheckedChange={setOn} />
    </div>
  );
}

export const EventTaskModuleSettings: React.FC = () => {
  const [defaultView, setDefaultView] = useState('board');
  const [defaultPriority, setDefaultPriority] = useState('medium');
  const [reminderTime, setReminderTime] = useState('30');

  return (
    <div className="max-w-2xl w-full p-8 pb-32 overflow-auto">
      <h1 className="text-2xl font-bold mb-1 text-foreground">Event &amp; Task</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Configure how events and tasks behave across the platform.
      </p>

      <div className="space-y-8">
        {/* Events section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Events</h2>
          </div>

          {/* Default reminder time */}
          <div className="flex items-center justify-between pb-4 border-b border-border mb-1">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-foreground">Default reminder time</Label>
              <p className="text-xs text-muted-foreground">How far in advance to remind you of events</p>
            </div>
            <Select value={reminderTime} onValueChange={setReminderTime}>
              <SelectTrigger className="w-[130px] bg-background border-border text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  { value: '5', label: '5 minutes' },
                  { value: '10', label: '10 minutes' },
                  { value: '15', label: '15 minutes' },
                  { value: '30', label: '30 minutes' },
                  { value: '60', label: '1 hour' },
                  { value: '1440', label: '1 day' },
                ].map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="divide-y divide-border">
            {EVENT_SETTINGS.map(row => <SettingToggleRow key={row.id} row={row} />)}
          </div>
        </section>

        <Separator />

        {/* Tasks section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Tasks</h2>
          </div>

          {/* Default task view */}
          <div className="flex items-center justify-between pb-4 border-b border-border mb-1">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-foreground">Default task view</Label>
              <p className="text-xs text-muted-foreground">How tasks are displayed when you open the Task section</p>
            </div>
            <Select value={defaultView} onValueChange={setDefaultView}>
              <SelectTrigger className="w-[130px] bg-background border-border text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="board">Board</SelectItem>
                <SelectItem value="list">List</SelectItem>
                <SelectItem value="calendar">Calendar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Default priority */}
          <div className="flex items-center justify-between pb-4 border-b border-border mb-1">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-foreground">Default priority</Label>
              <p className="text-xs text-muted-foreground">Priority assigned to new tasks by default</p>
            </div>
            <Select value={defaultPriority} onValueChange={setDefaultPriority}>
              <SelectTrigger className="w-[130px] bg-background border-border text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="divide-y divide-border">
            {TASK_SETTINGS.map(row => <SettingToggleRow key={row.id} row={row} />)}
          </div>
        </section>
      </div>
    </div>
  );
};
