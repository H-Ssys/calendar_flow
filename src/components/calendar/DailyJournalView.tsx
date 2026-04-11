/**
 * Daily Journal View (PDAC)
 * 
 * A comprehensive PDAC (Plan-Do-Act-Check) daily journal interface
 * that integrates with calendar events and provides structured daily planning.
 * 
 * Features:
 * - Time-based planning grid (05:00-23:00)
 * - Goal hierarchy (Yearly → Monthly → Daily)
 * - Reflection sections
 * - Calendar event integration
 * - Autosave with visual feedback
 * - Copy yesterday's plan
 * 
 * Developer Notes:
 * - Data model: src/types/dailyJournal.ts
 * - Service: src/services/dailyJournalService.ts
 * - Hook: src/hooks/useDailyJournal.ts
 * - Storage: Supabase journal_entries table (one row per user+date)
 */

import React, { useState, useMemo, useCallback } from 'react';
import { format, isSameDay } from 'date-fns';
import { useCalendar, Event } from '@/context/CalendarContext';
import { useTaskContext } from '@/context/TaskContext';
import { Task, TaskStatus, TaskPriority, TASK_COLUMNS, PRIORITY_CONFIG } from '@/types/task';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { useDailyJournal } from '@/hooks/useDailyJournal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Clock,
  Copy,
  Save,
  CheckCircle2,
  Calendar as CalendarIcon,
  Target,
  BookOpen,
  ChevronRight,
  Plus,
  AlertCircle,
  Trash2,
  Flame,
  ChevronDown,
  Pencil,
  Tag,
  Flag,
  X,
  Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyJournalViewProps {
  onEventClick?: (event: Event) => void;
}

// Helper function to parse event time to 24-hour format (outside component)
const parseEventTime = (timeStr: string): string | null => {
  try {
    const [startStr] = timeStr.split(' - ');
    const match = startStr.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const period = match[3]?.toUpperCase();

      // Convert to 24-hour format if AM/PM is present
      if (period === 'PM' && hours < 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }

      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
  } catch (e) {
    console.error('Error parsing event time:', timeStr, e);
  }
  return null;
};

export const DailyJournalView: React.FC<DailyJournalViewProps> = ({ onEventClick }) => {
  const { currentDate, events, timeConfig, addEvent } = useCalendar();
  const { addTask, tasks, updateTask, deleteTask, addSubtask, toggleSubtask, deleteSubtask } = useTaskContext();
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);

  // Add Task dialog state
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [addTaskSlotId, setAddTaskSlotId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('New Task');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('todo');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskTags, setNewTaskTags] = useState<string[]>([]);
  const [newTaskTagInput, setNewTaskTagInput] = useState('');
  const [newTaskSubtasks, setNewTaskSubtasks] = useState<{ id: string; title: string; done: boolean }[]>([]);
  const [newTaskSubtaskInput, setNewTaskSubtaskInput] = useState('');

  const openAddTaskDialog = (slotId: string, slotStartTime: string) => {
    setAddTaskSlotId(slotId);
    setNewTaskTitle('New Task');
    setNewTaskDescription('');
    setNewTaskStatus('todo');
    setNewTaskPriority('medium');
    setNewTaskDueDate(format(currentDate, 'yyyy-MM-dd'));
    setNewTaskTags([]);
    setNewTaskTagInput('');
    setNewTaskSubtasks([]);
    setNewTaskSubtaskInput('');
    setIsAddTaskOpen(true);
  };

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;
    const task = addTask({
      title: newTaskTitle.trim(),
      description: newTaskDescription,
      status: newTaskStatus,
      priority: newTaskPriority,
      dueDate: newTaskDueDate ? new Date(newTaskDueDate + 'T23:59:59') : undefined,
      tags: newTaskTags,
      category: '',
      color: PRIORITY_CONFIG[newTaskPriority].color,
      subtasks: newTaskSubtasks,
      linkedEventIds: [],
      linkedTaskIds: [],
      actualResult: '',
      scheduledDate: format(currentDate, 'yyyy-MM-dd'),
      scheduledSlotId: addTaskSlotId || undefined,
    } as any);
    // Link task to the journal time slot
    if (addTaskSlotId) {
      updateTimeSlot(addTaskSlotId, {
        linkedTaskIds: [...(entry?.timeSlots.find(s => s.id === addTaskSlotId)?.linkedTaskIds || []), task.id],
      });
    }
    setIsAddTaskOpen(false);
  };

  const handleAddNewTag = () => {
    const t = newTaskTagInput.trim().toLowerCase();
    if (t && !newTaskTags.includes(t)) {
      setNewTaskTags(prev => [...prev, t]);
      setNewTaskTagInput('');
    }
  };

  const handleAddNewSubtask = () => {
    const t = newTaskSubtaskInput.trim();
    if (t) {
      setNewTaskSubtasks(prev => [...prev, { id: `st-${Date.now()}`, title: t, done: false }]);
      setNewTaskSubtaskInput('');
    }
  };

  // Custom event form state
  const [customEventTitle, setCustomEventTitle] = useState('');
  const [customEventTime, setCustomEventTime] = useState('09:00');
  const [customEventDuration, setCustomEventDuration] = useState('1');
  const [customEventEmoji, setCustomEventEmoji] = useState('📅');

  // Quick event template states
  const [isQuickEventDialogOpen, setIsQuickEventDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<{ emoji: string; title: string; duration: string; color: string } | null>(null);
  const [quickEventTime, setQuickEventTime] = useState('09:00');

  // Edit template states
  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
  const [editingTemplateIndex, setEditingTemplateIndex] = useState<number | null>(null);
  const [editTemplateEmoji, setEditTemplateEmoji] = useState('');
  const [editTemplateTitle, setEditTemplateTitle] = useState('');
  const [editTemplateDuration, setEditTemplateDuration] = useState('');
  const [editTemplateColor, setEditTemplateColor] = useState('');

  // Quick event templates (now stateful)
  const [quickEventTemplates, setQuickEventTemplates] = useState([
    { emoji: '💼', title: 'Meeting', duration: '1', color: '#93C5FD' },
    { emoji: '📞', title: 'Phone Call', duration: '0.5', color: '#86EFAC' },
    { emoji: '✅', title: 'Task', duration: '1', color: '#FCA5A5' },
  ]);

  const {
    entry,
    isLoading,
    isSaving,
    lastSaved,
    updateTitle,
    updateTimeSlot,
    toggleSlotDone,
    updateGoals,
    updateReflections,
    addUrgentTask,
    updateUrgentTask,
    deleteUrgentTask,
    toggleUrgentTaskDone,
    copyYesterdayPlan,
    forceSave,
  } = useDailyJournal({ date: currentDate, timeConfig });

  // Link existing event state
  const [linkEventSlotId, setLinkEventSlotId] = useState<string | null>(null);
  const [linkEventSearch, setLinkEventSearch] = useState('');

  // Selected task for detail modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Sync actualText → linked tasks' actualResult
  const syncActualResultToTasks = useCallback((slotId: string, text: string) => {
    const slot = entry?.timeSlots.find(s => s.id === slotId);
    if (!slot?.linkedTaskIds?.length) return;
    slot.linkedTaskIds.forEach(taskId => {
      updateTask(taskId, { actualResult: text });
    });
  }, [entry, updateTask]);

  const handleActualTextChange = useCallback((slotId: string, text: string) => {
    updateTimeSlot(slotId, { actualText: text });
    // Sync to linked tasks
    syncActualResultToTasks(slotId, text);
  }, [updateTimeSlot, syncActualResultToTasks]);

  // Status color map for task badges
  const statusColors: Record<string, string> = {
    'todo': '#94a3b8',      // slate
    'in-progress': '#3b82f6', // blue
    'review': '#f59e0b',    // amber
    'done': '#22c55e',      // green
  };

  // Get events for current date
  const todayEvents = useMemo(() => {
    if (!events) return [];
    return events.filter(event => {
      return isSameDay(new Date(event.startTime), currentDate);
    });
  }, [events, currentDate]);

  // Use regular time slots (temporarily disabled event merging to debug)
  const mergedTimeSlots = entry?.timeSlots || [];

  const handleCopyYesterday = () => {
    const success = copyYesterdayPlan();
    if (!success) {
      alert('No task from yesterday to copy');
    }
  };

  const handleAddQuickEvent = () => {
    if (!selectedTemplate) return;

    const startHour = parseInt(quickEventTime.split(':')[0]);
    const startMinute = parseInt(quickEventTime.split(':')[1]);
    const durationHours = parseFloat(selectedTemplate.duration);
    const totalMinutes = Math.floor(durationHours * 60);
    const endMinutes = startMinute + totalMinutes;
    const endHour = startHour + Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60;

    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

    // Build proper startTime/endTime
    const startDate = new Date(currentDate);
    startDate.setHours(startHour, startMinute, 0, 0);
    const totalMin = Math.floor(durationHours * 60);
    const endDate = new Date(startDate.getTime() + totalMin * 60 * 1000);

    addEvent({
      title: selectedTemplate.title,
      startTime: startDate,
      endTime: endDate,
      isAllDay: false,
      emoji: selectedTemplate.emoji,
      color: selectedTemplate.color,
      description: `${selectedTemplate.title} created from Daily Journal`,
    });

    setIsQuickEventDialogOpen(false);
    setSelectedTemplate(null);
  };

  const handleAddCustomEvent = () => {
    if (!customEventTitle.trim()) {
      alert('Please enter an event title');
      return;
    }

    const endHour = parseInt(customEventTime.split(':')[0]) + parseInt(customEventDuration);
    const endTime = `${endHour.toString().padStart(2, '0')}:${customEventTime.split(':')[1]}`;

    // Build proper startTime/endTime
    const customStartDate = new Date(currentDate);
    const customStartH = parseInt(customEventTime.split(':')[0]);
    const customStartM = parseInt(customEventTime.split(':')[1]);
    customStartDate.setHours(customStartH, customStartM, 0, 0);
    const customEndDate = new Date(customStartDate.getTime() + parseInt(customEventDuration) * 60 * 60 * 1000);

    addEvent({
      title: customEventTitle,
      startTime: customStartDate,
      endTime: customEndDate,
      isAllDay: false,
      emoji: customEventEmoji,
      color: '#93C5FD',
      description: 'Custom event created from Daily Journal',
    });

    // Reset form
    setCustomEventTitle('');
    setCustomEventTime('09:00');
    setCustomEventDuration('1');
    setCustomEventEmoji('📅');
    setIsAddEventOpen(false);
  };

  const handleEditTemplate = (index: number) => {
    const template = quickEventTemplates[index];
    setEditingTemplateIndex(index);
    setEditTemplateEmoji(template.emoji);
    setEditTemplateTitle(template.title);
    setEditTemplateDuration(template.duration);
    setEditTemplateColor(template.color);
    setIsEditTemplateOpen(true);
  };

  const handleSaveTemplate = () => {
    if (editingTemplateIndex === null) return;
    if (!editTemplateTitle.trim()) {
      alert('Please enter a template title');
      return;
    }

    const updatedTemplates = [...quickEventTemplates];
    updatedTemplates[editingTemplateIndex] = {
      emoji: editTemplateEmoji,
      title: editTemplateTitle,
      duration: editTemplateDuration,
      color: editTemplateColor,
    };
    setQuickEventTemplates(updatedTemplates);
    setIsEditTemplateOpen(false);
    setEditingTemplateIndex(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading journal...</p>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <p className="text-sm text-destructive">Failed to load journal entry</p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="flex flex-1 overflow-hidden bg-background h-full w-full">
        {/* Main Journal Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="w-full max-w-[1600px] mx-auto p-3 space-y-3">
            {/* Header Section */}
            <Card>
              <CardHeader className="p-3 space-y-2">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                  <div className="space-y-0.5">
                    <h1 className="text-xl font-bold text-foreground">
                      {format(currentDate, 'EEEE, MMMM d, yyyy')}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(), 'HH:mm')} • Daily Journal
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="text-sm whitespace-nowrap">
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          <span className="hidden sm:inline">Today Events ({todayEvents.length})</span>
                          <span className="sm:hidden">Events ({todayEvents.length})</span>
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64">
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Quick Add Events
                        </div>
                        {quickEventTemplates.map((template, index) => (
                          <div key={index} className="flex items-center group">
                            <DropdownMenuItem
                              className="flex-1"
                              onClick={() => {
                                setSelectedTemplate(template);
                                setQuickEventTime('09:00');
                                setIsQuickEventDialogOpen(true);
                              }}
                            >
                              <span className="mr-2">{template.emoji}</span>
                              {template.title}
                              <span className="ml-auto text-xs text-muted-foreground">
                                {template.duration}h
                              </span>
                            </DropdownMenuItem>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTemplate(index);
                              }}
                              className="p-2 hover:bg-muted rounded-md opacity-0 group-hover:opacity-100 transition-opacity mr-2"
                              title="Edit template"
                            >
                              <Pencil className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsAddEventOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Custom Event
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyYesterday}
                      className="text-sm whitespace-nowrap"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Copy yesterday's task</span>
                      <span className="sm:hidden">Copy</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={forceSave}
                      disabled={isSaving}
                      className="text-sm whitespace-nowrap"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>

                    {lastSaved && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        Saved {format(lastSaved, 'HH:mm')}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Title Input */}
                <Input
                  placeholder="Dreams and Hopes for This Year"
                  value={entry.title}
                  onChange={(e) => updateTitle(e.target.value)}
                  className="text-sm font-medium border-dashed h-8 w-full"
                />
              </CardHeader>
            </Card>

            {/* Goals Section - Compact */}
            <Card>
              <CardContent className="p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Target className="w-4 h-4 text-yellow-600" />
                      Month
                    </label>
                    <Textarea
                      placeholder="Month's goal..."
                      value={entry.goals.monthlyGoalText}
                      onChange={(e) => updateGoals({ monthlyGoalText: e.target.value })}
                      rows={1}
                      className="text-sm resize-none min-h-[32px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Target className="w-4 h-4 text-green-600" />
                      Today
                    </label>
                    <Textarea
                      placeholder="Today's goal..."
                      value={entry.goals.dailyGoalText}
                      onChange={(e) => updateGoals({ dailyGoalText: e.target.value })}
                      rows={1}
                      className="text-sm resize-none min-h-[32px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      Result
                    </label>
                    <Textarea
                      placeholder="Result..."
                      value={entry.goals.dailyGoalResult}
                      onChange={(e) => updateGoals({ dailyGoalResult: e.target.value })}
                      rows={1}
                      className="text-sm resize-none min-h-[32px]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Urgent Tasks Section - Compact */}
            <Card className="border-l-4 border-l-red-500 bg-gradient-to-r from-red-50/50 to-transparent dark:from-red-950/20">
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-1.5 text-base text-red-700 dark:text-red-400">
                    <Flame className="w-5 h-5" />
                    Urgent Tasks
                  </CardTitle>
                  <Button
                    onClick={addUrgentTask}
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 h-8 text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {!entry.urgentTasks || entry.urgentTasks.length === 0 ? (
                  <div className="text-center py-3 text-muted-foreground">
                    <p className="text-sm">No urgent tasks</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {entry.urgentTasks.map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          "flex flex-col sm:flex-row items-start sm:items-center gap-2 p-1.5 rounded border transition-all",
                          task.done
                            ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                            : "bg-red-50/50 border-red-200 dark:bg-red-950/10 dark:border-red-800"
                        )}
                      >
                        <div className="flex items-center gap-2 w-full sm:flex-1">
                          <Checkbox
                            checked={task.done}
                            onCheckedChange={() => toggleUrgentTaskDone(task.id)}
                            className="flex-shrink-0"
                          />
                          <Input
                            placeholder="Enter urgent task..."
                            value={task.taskText}
                            onChange={(e) => updateUrgentTask(task.id, { taskText: e.target.value })}
                            className={cn(
                              "flex-1 border-none shadow-none focus-visible:ring-0 h-7 text-sm",
                              task.done && "line-through text-muted-foreground"
                            )}
                          />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Input
                            type="date"
                            value={task.deadline}
                            onChange={(e) => updateUrgentTask(task.id, { deadline: e.target.value })}
                            className="flex-1 sm:w-32 text-sm h-7"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteUrgentTask(task.id)}
                            className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-100 h-7 w-7 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Time Grid Section - Compact */}
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="w-5 h-5" />
                  Hourly Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="overflow-x-auto -mx-3 px-3">
                  <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="p-1.5 text-left text-xs font-semibold w-16">Time</th>
                        <th className="p-1.5 text-left text-xs font-semibold w-24">Deadline</th>
                        <th className="p-1.5 text-left text-xs font-semibold min-w-[200px]">Today's Task/Event</th>
                        <th className="p-1.5 text-left text-xs font-semibold min-w-[200px]">Actual Result</th>
                        <th className="p-1.5 text-center text-xs font-semibold w-12">✓</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mergedTimeSlots.map((slot, index) => {
                        // Find events that start within this time slot's range
                        const slotEvents = todayEvents.filter(event => {
                          try {
                            const eventHour = new Date(event.startTime).getHours();
                            const eventMinute = new Date(event.startTime).getMinutes();
                            const [slotStartH] = slot.startTime.split(':').map(Number);
                            const [slotEndH] = slot.endTime.split(':').map(Number);
                            const eventMinutes = eventHour * 60 + eventMinute;
                            const slotStartMinutes = slotStartH * 60;
                            const slotEndMinutes = slotEndH * 60;
                            return eventMinutes >= slotStartMinutes && eventMinutes < slotEndMinutes;
                          } catch (e) {
                            return false;
                          }
                        });

                        return (
                          <tr
                            key={slot.id}
                            className={cn(
                              "border-b border-border hover:bg-muted/30 transition-colors",
                              slot.done && "bg-green-50/50 dark:bg-green-950/20",
                              slotEvents.length > 0 && "bg-blue-50/20 dark:bg-blue-950/10"
                            )}
                          >
                            <td className="p-1.5 text-xs font-medium text-muted-foreground align-top">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold">{slot.startTime}</span>
                                {slotEvents.length > 0 && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0 w-fit h-4">
                                    {slotEvents.length}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-1.5">
                              <Input
                                type="time"
                                value={slot.deadline}
                                onChange={(e) => updateTimeSlot(slot.id, { deadline: e.target.value })}
                                className="text-xs h-7"
                              />
                            </td>
                            <td className="p-1.5">
                              {/* Calendar events for this slot */}
                              {slotEvents.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {slotEvents.map(ev => (
                                    <span
                                      key={ev.id}
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer hover:opacity-80"
                                      style={{ backgroundColor: ev.color || '#93c5fd', color: '#1e293b' }}
                                      onClick={() => onEventClick?.(ev)}
                                    >
                                      {ev.emoji} {ev.title} ({format(new Date(ev.startTime), 'HH:mm')}-{format(new Date(ev.endTime), 'HH:mm')})
                                    </span>
                                  ))}
                                </div>
                              )}
                              {/* Linked tasks for this slot */}
                              {(() => {
                                const linkedIds = slot.linkedTaskIds || [];
                                const linkedTasks = tasks.filter(t => linkedIds.includes(t.id));
                                return linkedTasks.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 mb-1">
                                    {linkedTasks.map(t => {
                                      const doneCount = t.subtasks.filter(st => st.done).length;
                                      const totalCount = t.subtasks.length;
                                      return (
                                        <span
                                          key={t.id}
                                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer hover:opacity-80 transition-opacity"
                                          style={{
                                            backgroundColor: (statusColors[t.status] || '#94a3b8') + '20',
                                            color: statusColors[t.status] || '#94a3b8',
                                            borderLeft: `2px solid ${statusColors[t.status] || '#94a3b8'}`,
                                          }}
                                          onClick={() => setSelectedTask(t)}
                                        >
                                          {PRIORITY_CONFIG[t.priority].emoji} {t.title}
                                          {totalCount > 0 && (
                                            <span className="opacity-70 ml-0.5">{doneCount}/{totalCount}✓</span>
                                          )}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateTimeSlot(slot.id, {
                                                linkedTaskIds: linkedIds.filter(id => id !== t.id),
                                              });
                                            }}
                                            className="ml-0.5 hover:text-destructive"
                                          >
                                            <X className="w-2.5 h-2.5" />
                                          </button>
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : null;
                              })()}
                              {/* Add Task + Link Existing */}
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openAddTaskDialog(slot.id, slot.startTime)}
                                  className="h-7 text-xs text-muted-foreground hover:text-foreground flex-1 justify-start px-2 gap-1"
                                >
                                  <Plus className="w-3 h-3" /> New
                                </Button>
                                <div className="relative">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setLinkEventSlotId(linkEventSlotId === slot.id ? null : slot.id)}
                                    className="h-7 text-xs text-muted-foreground hover:text-foreground px-2 gap-1"
                                    title="Link calendar event"
                                  >
                                    <Link2 className="w-3 h-3" /> Link Events
                                  </Button>
                                  {linkEventSlotId === slot.id && (
                                    <div className="absolute z-50 top-8 left-0 w-60 bg-popover border border-border rounded-lg shadow-lg p-2 space-y-1">
                                      <Input
                                        placeholder="Search events..."
                                        value={linkEventSearch}
                                        onChange={(e) => setLinkEventSearch(e.target.value)}
                                        className="h-7 text-xs mb-1"
                                        autoFocus
                                      />
                                      <div className="max-h-32 overflow-y-auto space-y-0.5">
                                        {todayEvents
                                          .filter(ev => !(slot.linkedEventIds || []).includes(ev.id))
                                          .filter(ev => !linkEventSearch || ev.title.toLowerCase().includes(linkEventSearch.toLowerCase()))
                                          .slice(0, 8)
                                          .map(ev => (
                                            <button
                                              key={ev.id}
                                              className="w-full text-left px-2 py-1 rounded text-xs hover:bg-accent flex items-center gap-1.5 transition-colors"
                                              onClick={() => {
                                                updateTimeSlot(slot.id, {
                                                  linkedEventIds: [...(slot.linkedEventIds || []), ev.id],
                                                });
                                                setLinkEventSlotId(null);
                                                setLinkEventSearch('');
                                              }}
                                            >
                                              <span
                                                className="w-2 h-2 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: ev.color || '#60a5fa' }}
                                              />
                                              <span className="truncate">{ev.title}</span>
                                              <span className="text-[10px] text-muted-foreground ml-auto">
                                                {ev.startTime ? format(new Date(ev.startTime), 'HH:mm') : ''}
                                              </span>
                                            </button>
                                          ))}
                                        {todayEvents.filter(ev => !(slot.linkedEventIds || []).includes(ev.id)).length === 0 && (
                                          <p className="text-xs text-muted-foreground text-center py-2">No events to link</p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-1.5">
                              <div className="relative">
                                <Input
                                  placeholder="Actual..."
                                  value={slot.actualText}
                                  onChange={(e) => handleActualTextChange(slot.id, e.target.value)}
                                  className={cn(
                                    "text-xs h-8",
                                    (slot.linkedTaskIds || []).length > 0 && "pr-6"
                                  )}
                                />
                                {(slot.linkedTaskIds || []).length > 0 && (
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-400" title="Synced to linked tasks">
                                    🔗
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-1.5 text-center align-top pt-2">
                              <Checkbox
                                checked={slot.done}
                                onCheckedChange={() => toggleSlotDone(slot.id)}
                                className="w-4 h-4"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Reflections Section - Compact */}
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="w-5 h-5" />
                  Reflections
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">✨ Done Well</label>
                    <Textarea
                      placeholder="Good..."
                      value={entry.reflections.gratitudeGood}
                      onChange={(e) => updateReflections({ gratitudeGood: e.target.value })}
                      rows={1}
                      className="text-xs resize-none min-h-[32px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">📋 Standardize</label>
                    <Textarea
                      placeholder="Standardize..."
                      value={entry.reflections.standardizeRules}
                      onChange={(e) => updateReflections({ standardizeRules: e.target.value })}
                      rows={1}
                      className="text-xs resize-none min-h-[32px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">⚠️ Not Well</label>
                    <Textarea
                      placeholder="Issues..."
                      value={entry.reflections.notGood}
                      onChange={(e) => updateReflections({ notGood: e.target.value })}
                      rows={1}
                      className="text-xs resize-none min-h-[32px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">💡 Improve</label>
                    <Textarea
                      placeholder="Improve..."
                      value={entry.reflections.improvements}
                      onChange={(e) => updateReflections({ improvements: e.target.value })}
                      rows={1}
                      className="text-xs resize-none min-h-[32px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">💪 Encourage</label>
                    <Textarea
                      placeholder="Encourage..."
                      value={entry.reflections.selfEncouragement}
                      onChange={(e) => updateReflections({ selfEncouragement: e.target.value })}
                      rows={1}
                      className="text-xs resize-none min-h-[32px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">📝 Notes</label>
                    <Textarea
                      placeholder="Notes..."
                      value={entry.reflections.notes}
                      onChange={(e) => updateReflections({ notes: e.target.value })}
                      rows={1}
                      className="text-xs resize-none min-h-[32px]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>


        {/* Quick Event Time Picker Dialog */}
        <Dialog open={isQuickEventDialogOpen} onOpenChange={setIsQuickEventDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-2xl">{selectedTemplate?.emoji}</span>
                Add {selectedTemplate?.title}
              </DialogTitle>
              <DialogDescription>
                Select a time for {format(currentDate, 'MMMM d, yyyy')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="quickEventTime">Start Time</Label>
                <Input
                  id="quickEventTime"
                  type="time"
                  value={quickEventTime}
                  onChange={(e) => setQuickEventTime(e.target.value)}
                  className="text-lg h-12"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="text-sm font-semibold">{selectedTemplate?.duration} hour(s)</span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsQuickEventDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddQuickEvent}>
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Template Dialog */}
        <Dialog open={isEditTemplateOpen} onOpenChange={setIsEditTemplateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Event Template</DialogTitle>
              <DialogDescription>
                Customize your quick event template
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editEmoji">Emoji</Label>
                <Input
                  id="editEmoji"
                  value={editTemplateEmoji}
                  onChange={(e) => setEditTemplateEmoji(e.target.value)}
                  placeholder="💼"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editTitle">Template Title</Label>
                <Input
                  id="editTitle"
                  value={editTemplateTitle}
                  onChange={(e) => setEditTemplateTitle(e.target.value)}
                  placeholder="Meeting, Task, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDuration">Default Duration (hours)</Label>
                <Input
                  id="editDuration"
                  type="number"
                  min="0.5"
                  max="8"
                  step="0.5"
                  value={editTemplateDuration}
                  onChange={(e) => setEditTemplateDuration(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editColor">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="editColor"
                    type="color"
                    value={editTemplateColor}
                    onChange={(e) => setEditTemplateColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={editTemplateColor}
                    onChange={(e) => setEditTemplateColor(e.target.value)}
                    placeholder="#93C5FD"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditTemplateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate}>
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Custom Event Dialog */}
        <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Event</DialogTitle>
              <DialogDescription>
                Create a custom event for {format(currentDate, 'MMMM d, yyyy')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="emoji">Emoji</Label>
                <Input
                  id="emoji"
                  value={customEventEmoji}
                  onChange={(e) => setCustomEventEmoji(e.target.value)}
                  placeholder="📅"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  value={customEventTitle}
                  onChange={(e) => setCustomEventTitle(e.target.value)}
                  placeholder="Meeting, Task, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time">Start Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={customEventTime}
                    onChange={(e) => setCustomEventTime(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (hours)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="0.5"
                    max="8"
                    step="0.5"
                    value={customEventDuration}
                    onChange={(e) => setCustomEventDuration(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddEventOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCustomEvent}>
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Add Task Dialog ── */}
        <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
          <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto p-0">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: PRIORITY_CONFIG[newTaskPriority].color }}
                />
                <span className="text-sm font-medium text-muted-foreground">
                  {TASK_COLUMNS.find(c => c.id === newTaskStatus)?.emoji}{' '}
                  {TASK_COLUMNS.find(c => c.id === newTaskStatus)?.title}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsAddTaskOpen(false)} className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-5">
              {/* Title */}
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="text-lg font-semibold border-none shadow-none px-0 focus-visible:ring-0 h-auto"
                placeholder="Task title..."
              />

              {/* Description */}
              <Textarea
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Add a description..."
                className="min-h-[80px] text-sm resize-none border-dashed"
                rows={3}
              />

              {/* Status + Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Flag className="w-3 h-3" /> Status
                  </label>
                  <Select value={newTaskStatus} onValueChange={(val) => setNewTaskStatus(val as TaskStatus)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_COLUMNS.map(col => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.emoji} {col.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Priority
                  </label>
                  <Select value={newTaskPriority} onValueChange={(val) => setNewTaskPriority(val as TaskPriority)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          {cfg.emoji} {cfg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" /> Due Date
                </label>
                <Input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Tags
                </label>
                {newTaskTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {newTaskTags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5 gap-1">
                        {tag}
                        <button onClick={() => setNewTaskTags(prev => prev.filter(t => t !== tag))} className="hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={newTaskTagInput}
                    onChange={(e) => setNewTaskTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewTag(); } }}
                    placeholder="Add tag..."
                    className="h-8 text-sm flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={handleAddNewTag} className="h-8">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Subtasks */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Subtasks
                  {newTaskSubtasks.length > 0 && (
                    <span className="text-[10px]">({newTaskSubtasks.filter(s => s.done).length}/{newTaskSubtasks.length})</span>
                  )}
                </label>
                {newTaskSubtasks.length > 0 && (
                  <div className="space-y-1">
                    {newTaskSubtasks.map(st => (
                      <div key={st.id} className="flex items-center gap-2 group py-0.5">
                        <Checkbox
                          checked={st.done}
                          onCheckedChange={() => setNewTaskSubtasks(prev => prev.map(s => s.id === st.id ? { ...s, done: !s.done } : s))}
                          className="w-4 h-4"
                        />
                        <span className={cn("flex-1 text-sm", st.done && "line-through text-muted-foreground")}>
                          {st.title}
                        </span>
                        <button
                          onClick={() => setNewTaskSubtasks(prev => prev.filter(s => s.id !== st.id))}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={newTaskSubtaskInput}
                    onChange={(e) => setNewTaskSubtaskInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewSubtask(); } }}
                    placeholder="Add subtask..."
                    className="h-8 text-sm flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={handleAddNewSubtask} className="h-8">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border p-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddTaskOpen(false)}>
                Close
              </Button>
              <Button size="sm" onClick={handleCreateTask}>
                <Plus className="w-4 h-4 mr-1" /> Create Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Task Detail Modal (opens when clicking a linked task badge) */}
        {selectedTask && (
          <Dialog open={!!selectedTask} onOpenChange={(open) => { if (!open) setSelectedTask(null); }}>
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto p-0">
              <TaskDetail
                task={tasks.find(t => t.id === selectedTask.id) || selectedTask}
                onClose={() => setSelectedTask(null)}
              />
            </DialogContent>
          </Dialog>
        )}

      </div>
    );
  } catch (error) {
    console.error('Error rendering DailyJournalView:', error);
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold text-destructive">Something went wrong</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <div className="space-x-2">
            <Button onClick={() => window.location.reload()}>Reload Page</Button>
            <Button variant="outline" onClick={() => console.log('Error details:', error)}>
              Show Details
            </Button>
          </div>
        </div>
      </div>
    );
  }
};
