import React from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { Task, PRIORITY_CONFIG, TASK_COLUMNS, TaskStatus } from '@/types/task';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskListProps {
    onTaskClick: (task: Task) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ onTaskClick }) => {
    const { tasks, filterStatus, filterPriority, searchQuery, moveTask } = useTaskContext();

    // Filter and sort
    const filteredTasks = React.useMemo(() => {
        let result = [...tasks];

        if (filterStatus !== 'all') {
            result = result.filter(t => t.status === filterStatus);
        }
        if (filterPriority !== 'all') {
            result = result.filter(t => t.priority === filterPriority);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(t =>
                t.title.toLowerCase().includes(q) ||
                t.tags.some(tag => tag.toLowerCase().includes(q))
            );
        }

        // Sort: overdue first, then by priority, then by due date
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const statusOrder = { 'in-progress': 0, 'todo': 1, 'review': 2, 'done': 3 };

        result.sort((a, b) => {
            // Done items at end
            if (a.status === 'done' && b.status !== 'done') return 1;
            if (a.status !== 'done' && b.status === 'done') return -1;
            // Priority
            const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (pDiff !== 0) return pDiff;
            // Status
            return statusOrder[a.status] - statusOrder[b.status];
        });

        return result;
    }, [tasks, filterStatus, filterPriority, searchQuery]);

    const handleToggleDone = (task: Task) => {
        if (task.status === 'done') {
            moveTask(task.id, 'todo');
        } else {
            moveTask(task.id, 'done');
        }
    };

    if (filteredTasks.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center space-y-2">
                    <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">No tasks found</p>
                    <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <table className="w-full">
                <thead className="sticky top-0 bg-background z-10">
                    <tr className="border-b border-border">
                        <th className="w-10 p-3"></th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Status</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Priority</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Due Date</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">Tags</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredTasks.map(task => {
                        const priority = PRIORITY_CONFIG[task.priority];
                        const statusCol = TASK_COLUMNS.find(c => c.id === task.status);
                        const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status !== 'done';
                        const doneSubtasks = task.subtasks.filter(st => st.done).length;

                        return (
                            <tr
                                key={task.id}
                                className={cn(
                                    "border-b border-border hover:bg-muted/30 cursor-pointer transition-colors",
                                    task.status === 'done' && "opacity-60"
                                )}
                                onClick={() => onTaskClick(task)}
                            >
                                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                        checked={task.status === 'done'}
                                        onCheckedChange={() => handleToggleDone(task)}
                                    />
                                </td>
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-sm font-medium",
                                            task.status === 'done' && "line-through text-muted-foreground"
                                        )}>
                                            {task.title}
                                        </span>
                                        {task.subtasks.length > 0 && (
                                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {doneSubtasks}/{task.subtasks.length}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-3">
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] font-normal"
                                        style={{ borderColor: statusCol?.color, color: statusCol?.color }}
                                    >
                                        {statusCol?.emoji} {statusCol?.title}
                                    </Badge>
                                </td>
                                <td className="p-3">
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: priority.color }}
                                        />
                                        <span className="text-xs text-muted-foreground">{priority.label}</span>
                                    </div>
                                </td>
                                <td className="p-3">
                                    {task.dueDate ? (
                                        <div className={cn(
                                            "flex items-center gap-1 text-xs",
                                            isOverdue && "text-destructive font-medium"
                                        )}>
                                            {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3 text-muted-foreground" />}
                                            <span>{format(new Date(task.dueDate), 'MMM d')}</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                </td>
                                <td className="p-3">
                                    <div className="flex flex-wrap gap-1">
                                        {task.tags.slice(0, 2).map(tag => (
                                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                                {tag}
                                            </Badge>
                                        ))}
                                        {task.tags.length > 2 && (
                                            <span className="text-[10px] text-muted-foreground">+{task.tags.length - 2}</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
