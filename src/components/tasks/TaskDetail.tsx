import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority, TASK_COLUMNS, PRIORITY_CONFIG } from '@/types/task';
import { useTaskContext } from '@/context/TaskContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    X, Trash2, Flag, Calendar, Clock, Tag, CheckCircle2,
    Link2, Plus, ChevronDown, ChevronRight, History, Check
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TaskDetailProps {
    task: Task;
    onClose: () => void;
}

const COLORS = [
    '#cbd5e1', '#fca5a5', '#86efac', '#93c5fd', '#a78bfa',
    '#c084fc', '#f472b6', '#fb923c', '#facc15', '#fef08a', '#a7f3d0'
];

export const TaskDetail: React.FC<TaskDetailProps> = ({ task, onClose }) => {
    const { updateTask, deleteTask, addSubtask, toggleSubtask, deleteSubtask } = useTaskContext();
    const [tagInput, setTagInput] = useState('');
    const [subtaskInput, setSubtaskInput] = useState('');
    const [showActivityLog, setShowActivityLog] = useState(false);

    const update = (field: Partial<Task>) => {
        updateTask(task.id, field);
    };

    const handleDelete = () => {
        deleteTask(task.id);
        onClose();
    };

    const handleAddSubtask = () => {
        const t = subtaskInput.trim();
        if (!t) return;
        addSubtask(task.id, t);
        setSubtaskInput('');
    };

    const handleAddTag = () => {
        const t = tagInput.trim().toLowerCase();
        if (!t || task.tags?.includes(t)) return;
        update({ tags: [...(task.tags || []), t] });
        setTagInput('');
    };

    const removeTag = (tag: string) => {
        update({ tags: (task.tags || []).filter(t => t !== tag) });
    };

    const priorityConfig = PRIORITY_CONFIG[task.priority];

    return (
        <div
            className="w-[420px] bg-background shadow-2xl border border-border rounded-xl ring-1 ring-black/5 flex flex-col"
            style={{ maxHeight: 'calc(100vh - 80px)' }}
        >
            {/* Header */}
            <header className="flex items-center justify-between p-4 pb-3 shrink-0 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: priorityConfig?.color || '#94a3b8' }}
                    />
                    <h1 className="text-xl font-bold text-foreground">Task Details</h1>
                </div>
                <div className="flex items-center gap-1">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <button className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{task.title}"?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently remove the task.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md transition-colors">
                        <X className="w-5 h-5 text-foreground" />
                    </button>
                </div>
            </header>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 pt-3">

                {/* Title */}
                <input
                    value={task.title}
                    onChange={e => update({ title: e.target.value })}
                    className="flex w-full rounded-md bg-background px-3 py-2 border-2 text-foreground font-medium placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary"
                    placeholder="Task title..."
                />

                {/* Color swatches */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => update({ color: c })}
                            className={cn(
                                "w-6 h-6 rounded-full transition-transform hover:scale-110",
                                task.color === c ? "ring-2 ring-primary ring-offset-1" : ""
                            )}
                            style={{ backgroundColor: c }}
                            title={c}
                        />
                    ))}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Flag className="w-3.5 h-3.5" /> Description
                    </div>
                    <Textarea
                        value={task.description || ''}
                        onChange={e => update({ description: e.target.value })}
                        placeholder="Add description..."
                        className="min-h-[70px] text-sm resize-none border-dashed"
                    />
                </div>

                {/* Status & Priority */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Flag className="w-3.5 h-3.5" /> Status
                        </div>
                        <Select value={task.status} onValueChange={v => update({ status: v as TaskStatus })}>
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
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" /> Priority
                        </div>
                        <Select value={task.priority} onValueChange={v => update({ priority: v as TaskPriority })}>
                            <SelectTrigger className="h-9 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                                    <SelectItem key={key} value={key}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                                            {cfg.emoji} {cfg.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Due Date */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" /> Due Date
                    </div>
                    <div className="border border-border rounded-md px-3 py-2 bg-background">
                        <input
                            type="date"
                            value={task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''}
                            onChange={e => update({ dueDate: e.target.value ? new Date(e.target.value + 'T23:59:59') : undefined })}
                            className="w-full text-sm bg-transparent focus:outline-none text-foreground"
                        />
                    </div>
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Tag className="w-3.5 h-3.5" /> Tags
                    </div>
                    {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {task.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5 gap-1">
                                    {tag}
                                    <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <div className="border border-border rounded-md bg-background flex-1">
                            <input
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                                placeholder="Add tag..."
                                className="w-full h-9 px-3 text-sm focus:outline-none bg-transparent placeholder:text-muted-foreground"
                            />
                        </div>
                        <button onClick={handleAddTag} className="h-9 w-9 border border-border rounded-md flex items-center justify-center hover:bg-muted bg-background shrink-0">
                            <Plus className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Subtasks */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Subtasks
                        {task.subtasks && task.subtasks.length > 0 && (
                            <span className="text-[10px] ml-auto">
                                {task.subtasks.filter(s => s.done).length}/{task.subtasks.length}
                            </span>
                        )}
                    </div>
                    {task.subtasks && task.subtasks.length > 0 && (
                        <div className="space-y-1">
                            {task.subtasks.map(sub => (
                                <div key={sub.id} className="flex items-center gap-2 group rounded-md px-2 py-1 hover:bg-muted/30">
                                    <Checkbox
                                        checked={sub.done}
                                        onCheckedChange={() => toggleSubtask(task.id, sub.id)}
                                        className="w-4 h-4 flex-shrink-0"
                                    />
                                    <span className={cn("flex-1 text-sm", sub.done && "line-through text-muted-foreground")}>
                                        {sub.title}
                                    </span>
                                    <button
                                        onClick={() => deleteSubtask(task.id, sub.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <div className="border border-border rounded-md bg-background flex-1">
                            <input
                                value={subtaskInput}
                                onChange={e => setSubtaskInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                                placeholder="Add subtask..."
                                className="w-full h-9 px-3 text-sm focus:outline-none bg-transparent placeholder:text-muted-foreground"
                            />
                        </div>
                        <button onClick={handleAddSubtask} className="h-9 w-9 border border-border rounded-md flex items-center justify-center hover:bg-muted bg-background shrink-0">
                            <Plus className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Actual Result */}
                {task.actualResult !== undefined && (
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Actual Result / Notes
                        </div>
                        <Textarea
                            value={task.actualResult || ''}
                            onChange={e => update({ actualResult: e.target.value })}
                            placeholder="What was the outcome?"
                            className="min-h-[60px] text-sm resize-none border-dashed"
                        />
                    </div>
                )}

                {/* Activity Log */}
                {task.activityLog && task.activityLog.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border">
                        <button
                            onClick={() => setShowActivityLog(!showActivityLog)}
                            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                        >
                            <History className="w-3.5 h-3.5" />
                            Activity ({task.activityLog.length})
                            {showActivityLog ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
                        </button>
                        {showActivityLog && (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                {task.activityLog.map(log => (
                                    <div key={log.id} className="flex items-start gap-2 text-[11px]">
                                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-foreground">{log.description}</span>
                                            <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                                                {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border shrink-0 bg-background rounded-b-xl">
                <button
                    onClick={onClose}
                    className="w-full inline-flex items-center justify-center rounded-lg text-sm font-semibold h-10 px-4 gap-2 bg-[#18181b] dark:bg-white hover:opacity-90 text-white dark:text-black transition-colors"
                >
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                    Save & Close
                </button>
            </div>
        </div>
    );
};
