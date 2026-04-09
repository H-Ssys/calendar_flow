import React, { useState } from 'react';
import {
    Task, Subtask, PRIORITY_CONFIG, TASK_COLUMNS, TaskStatus, TaskPriority,
    PDCA_STAGES, computePdcaStage, getCompletedPdcaStages,
    OUTCOME_EMOJIS, emojiToRating, OutcomeEmoji,
    generateSubtaskSummary, ActivitySource,
} from '@/types/task';
import { useTaskContext } from '@/context/TaskContext';
import { useCalendar } from '@/context/CalendarContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    X, Trash2, Plus, Calendar, CheckCircle2,
    Tag, Flag, Clock, Link2, Star, FileText,
    Activity, MessageSquare, ArrowRight, Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskDetailProps {
    task: Task;
    onClose: () => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({ task, onClose }) => {
    const { updateTask, deleteTask, addSubtask, toggleSubtask, deleteSubtask, addActivityLogEntry } = useTaskContext();
    const { events } = useCalendar();
    const [newSubtask, setNewSubtask] = useState('');
    const [newTag, setNewTag] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [newLogNote, setNewLogNote] = useState('');

    const priority = PRIORITY_CONFIG[task.priority];
    const doneSubtasks = task.subtasks.filter(st => st.done).length;

    const handleAddSubtask = () => {
        if (newSubtask.trim()) {
            addSubtask(task.id, newSubtask.trim());
            setNewSubtask('');
        }
    };

    const handleAddTag = () => {
        if (newTag.trim() && !task.tags.includes(newTag.trim().toLowerCase())) {
            updateTask(task.id, { tags: [...task.tags, newTag.trim().toLowerCase()] });
            setNewTag('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        updateTask(task.id, { tags: task.tags.filter(t => t !== tag) });
    };

    const handleDelete = () => {
        if (confirmDelete) {
            deleteTask(task.id);
            onClose();
        } else {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background border-l border-border w-[400px] shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: priority.color }} />
                    <span className="text-sm font-medium text-muted-foreground">
                        {TASK_COLUMNS.find(c => c.id === task.status)?.emoji} {TASK_COLUMNS.find(c => c.id === task.status)?.title}
                    </span>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* PDCA Progress Indicator */}
            <div className="px-4 py-2.5 border-b border-border bg-muted/20">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">PDCA Cycle</span>
                    <span className="text-[10px] text-muted-foreground">
                        {getCompletedPdcaStages(task).length}/4 complete
                    </span>
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                    {PDCA_STAGES.map((stage, i) => {
                        const completed = getCompletedPdcaStages(task);
                        const current = computePdcaStage(task);
                        const isCompleted = completed.includes(stage.key);
                        const isCurrent = current === stage.key;
                        return (
                            <React.Fragment key={stage.key}>
                                <div className="flex flex-col items-center flex-1">
                                    <div
                                        className={cn(
                                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all border-2",
                                            isCompleted
                                                ? "border-transparent text-white"
                                                : isCurrent
                                                    ? "border-current bg-background animate-pulse"
                                                    : "border-border bg-muted/40 text-muted-foreground/50"
                                        )}
                                        style={{
                                            backgroundColor: isCompleted ? stage.color : undefined,
                                            borderColor: isCurrent && !isCompleted ? stage.color : undefined,
                                            color: isCurrent && !isCompleted ? stage.color : undefined,
                                        }}
                                        title={`${stage.label}: ${isCompleted ? 'Complete' : isCurrent ? 'Current' : 'Pending'}`}
                                    >
                                        {stage.emoji}
                                    </div>
                                    <span className={cn(
                                        "text-[9px] mt-0.5 font-medium",
                                        isCompleted ? "text-foreground" : "text-muted-foreground/50"
                                    )}>
                                        {stage.label}
                                    </span>
                                </div>
                                {i < PDCA_STAGES.length - 1 && (
                                    <ArrowRight className={cn(
                                        "w-3 h-3 flex-shrink-0 -mt-3",
                                        isCompleted ? "text-foreground/40" : "text-muted-foreground/20"
                                    )} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Title */}
                <Input
                    value={task.title}
                    onChange={(e) => updateTask(task.id, { title: e.target.value })}
                    className="text-lg font-semibold border-none shadow-none px-0 focus-visible:ring-0 h-auto"
                    placeholder="Task title..."
                />

                {/* Description */}
                <Textarea
                    value={task.description}
                    onChange={(e) => updateTask(task.id, { description: e.target.value })}
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
                        <Select
                            value={task.status}
                            onValueChange={(val) => updateTask(task.id, {
                                status: val as TaskStatus,
                                ...(val === 'done' ? { completedAt: new Date() } : { completedAt: undefined })
                            })}
                        >
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
                        <Select
                            value={task.priority}
                            onValueChange={(val) => updateTask(task.id, { priority: val as TaskPriority })}
                        >
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
                        <Calendar className="w-3 h-3" /> Due Date
                    </label>
                    <Input
                        type="date"
                        value={task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''}
                        onChange={(e) => updateTask(task.id, {
                            dueDate: e.target.value ? new Date(e.target.value + 'T23:59:59') : undefined
                        })}
                        className="h-9 text-sm"
                    />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Tags
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {task.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5 gap-1">
                                {tag}
                                <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive">
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                            placeholder="Add tag..."
                            className="h-8 text-sm flex-1"
                        />
                        <Button size="sm" variant="outline" onClick={handleAddTag} className="h-8">
                            <Plus className="w-3 h-3" />
                        </Button>
                    </div>
                </div>

                {/* Subtasks */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Subtasks
                            {task.subtasks.length > 0 && (
                                <span className="text-[10px]">({doneSubtasks}/{task.subtasks.length})</span>
                            )}
                        </label>
                        {task.subtasks.length > 0 && (
                            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all"
                                    style={{ width: `${(doneSubtasks / task.subtasks.length) * 100}%` }}
                                />
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        {task.subtasks.map(st => (
                            <div key={st.id} className="flex items-center gap-2 group py-0.5">
                                <Checkbox
                                    checked={st.done}
                                    onCheckedChange={() => toggleSubtask(task.id, st.id)}
                                    className="w-4 h-4"
                                />
                                <span className={cn(
                                    "flex-1 text-sm",
                                    st.done && "line-through text-muted-foreground"
                                )}>
                                    {st.title}
                                </span>
                                <button
                                    onClick={() => deleteSubtask(task.id, st.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Input
                            value={newSubtask}
                            onChange={(e) => setNewSubtask(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                            placeholder="Add subtask..."
                            className="h-8 text-sm flex-1"
                        />
                        <Button size="sm" variant="outline" onClick={handleAddSubtask} className="h-8">
                            <Plus className="w-3 h-3" />
                        </Button>
                    </div>
                </div>

                {/* Outcome — Simple Emoji + Quick Note (Option B) */}
                {(task.status === 'done' || task.status === 'review') && (
                    <div className="p-3 rounded-lg bg-muted/30 border border-dashed border-border space-y-3">
                        {/* How did it go? */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">How did it go?</label>
                            <div className="flex gap-2">
                                {OUTCOME_EMOJIS.map(oe => {
                                    const isActive = task.outcomeEmoji === oe.key;
                                    return (
                                        <button
                                            key={oe.key}
                                            onClick={() => updateTask(task.id, {
                                                outcomeEmoji: isActive ? undefined : oe.key,
                                                outcomeRating: isActive ? undefined : oe.rating,
                                            })}
                                            className={cn(
                                                "flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg border-2 transition-all hover:scale-105",
                                                isActive
                                                    ? "border-primary bg-primary/10 shadow-sm"
                                                    : "border-border bg-background hover:border-primary/30"
                                            )}
                                        >
                                            <span className="text-xl">{oe.emoji}</span>
                                            <span className={cn(
                                                "text-[10px] font-medium",
                                                isActive ? "text-primary" : "text-muted-foreground"
                                            )}>{oe.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quick note */}
                        <div className="space-y-1">
                            <label className="text-[11px] text-muted-foreground">Quick note <span className="opacity-50">(optional)</span></label>
                            <Input
                                value={task.actualResult || ''}
                                onChange={(e) => updateTask(task.id, { actualResult: e.target.value })}
                                placeholder="One sentence summary..."
                                className="h-8 text-sm"
                            />
                        </div>
                    </div>
                )}

                {/* Linked Events */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Link2 className="w-3 h-3" /> Linked Events
                    </label>
                    {task.linkedEventIds.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            {task.linkedEventIds.map(eid => {
                                const ev = events.find(e => e.id === eid);
                                return ev ? (
                                    <div key={eid} className="flex items-center gap-2 text-xs bg-muted rounded-lg px-2.5 py-1.5 group">
                                        <span>{ev.emoji}</span>
                                        <span className="font-medium truncate flex-1">{ev.title}</span>
                                        <span className="text-muted-foreground whitespace-nowrap">
                                            {format(new Date(ev.startTime), 'MMM d, h:mm a')}
                                        </span>
                                        <button
                                            onClick={() => updateTask(task.id, {
                                                linkedEventIds: task.linkedEventIds.filter(id => id !== eid)
                                            })}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : null;
                            })}
                        </div>
                    )}
                    <Select
                        value=""
                        onValueChange={(eventId) => {
                            if (eventId && !task.linkedEventIds.includes(eventId)) {
                                updateTask(task.id, {
                                    linkedEventIds: [...task.linkedEventIds, eventId]
                                });
                            }
                        }}
                    >
                        <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Link an event..." />
                        </SelectTrigger>
                        <SelectContent>
                            {events
                                .filter(e => !task.linkedEventIds.includes(e.id))
                                .slice(0, 20)
                                .map(e => (
                                    <SelectItem key={e.id} value={e.id}>
                                        {e.emoji} {e.title} — {format(new Date(e.startTime), 'MMM d')}
                                    </SelectItem>
                                ))
                            }
                        </SelectContent>
                    </Select>
                </div>

                {/* Activity Timeline (Option 3) */}
                {(task.activityLog?.length > 0 || true) && (
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Activity className="w-3 h-3" /> Activity Timeline
                            {task.activityLog?.length > 0 && (
                                <span className="text-[10px]">({task.activityLog.length})</span>
                            )}
                        </label>
                        <div className="relative pl-4 space-y-0">
                            {/* Timeline line */}
                            {task.activityLog?.length > 0 && (
                                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                            )}
                            {(task.activityLog || []).slice(-8).map((entry) => {
                                const sourceConfig: Record<string, { icon: React.ReactNode; color: string }> = {
                                    system: { icon: <Zap className="w-2.5 h-2.5" />, color: 'text-muted-foreground' },
                                    status_change: { icon: <ArrowRight className="w-2.5 h-2.5" />, color: 'text-amber-500' },
                                    journal: { icon: <FileText className="w-2.5 h-2.5" />, color: 'text-blue-500' },
                                    manual: { icon: <MessageSquare className="w-2.5 h-2.5" />, color: 'text-foreground' },
                                };
                                const cfg = sourceConfig[entry.source] || sourceConfig.system;
                                return (
                                    <div key={entry.id} className="relative flex items-start gap-2 pb-2">
                                        <div className={cn(
                                            "w-4 h-4 rounded-full bg-background border-2 border-border flex items-center justify-center flex-shrink-0 -ml-[9px]",
                                            cfg.color
                                        )}>
                                            {cfg.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] text-foreground leading-tight">{entry.text}</p>
                                            <p className="text-[9px] text-muted-foreground">
                                                {format(new Date(entry.timestamp), 'MMM d, h:mm a')}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Add manual note */}
                        <div className="flex gap-1.5">
                            <Input
                                value={newLogNote}
                                onChange={(e) => setNewLogNote(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newLogNote.trim()) {
                                        e.preventDefault();
                                        addActivityLogEntry(task.id, newLogNote.trim(), 'manual');
                                        setNewLogNote('');
                                    }
                                }}
                                placeholder="Add a note..."
                                className="h-7 text-[11px] flex-1"
                            />
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2"
                                onClick={() => {
                                    if (newLogNote.trim()) {
                                        addActivityLogEntry(task.id, newLogNote.trim(), 'manual');
                                        setNewLogNote('');
                                    }
                                }}
                            >
                                <Plus className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Metadata */}
                <div className="text-[11px] text-muted-foreground space-y-0.5 pt-2 border-t border-border">
                    <p>Created: {format(new Date(task.createdAt), 'MMM d, yyyy HH:mm')}</p>
                    <p>Updated: {format(new Date(task.updatedAt), 'MMM d, yyyy HH:mm')}</p>
                    {task.completedAt && <p>Completed: {format(new Date(task.completedAt), 'MMM d, yyyy HH:mm')}</p>}
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border p-3 flex justify-between">
                <Button
                    variant={confirmDelete ? "destructive" : "ghost"}
                    size="sm"
                    onClick={handleDelete}
                    className="text-xs"
                >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    {confirmDelete ? 'Confirm Delete' : 'Delete Task'}
                </Button>
                <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                    Close
                </Button>
            </div>
        </div>
    );
};
