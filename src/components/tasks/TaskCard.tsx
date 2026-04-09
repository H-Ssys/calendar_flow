import React from 'react';
import { Task, PRIORITY_CONFIG, getDueLabel, getCompletedPdcaStages, PDCA_STAGES } from '@/types/task';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, GripVertical, AlertCircle, Star } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskCardProps {
    task: Task;
    onClick: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: `task-drag-${task.id}`,
        data: { task },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const priority = PRIORITY_CONFIG[task.priority];
    const doneSubtasks = task.subtasks.filter(st => st.done).length;
    const totalSubtasks = task.subtasks.length;
    const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status !== 'done';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group bg-card rounded-lg border border-border p-3 cursor-pointer",
                "hover:shadow-md hover:border-primary/30 transition-all duration-200",
                "active:shadow-lg",
                isDragging && "shadow-xl ring-2 ring-primary/30",
                task.status === 'done' && "opacity-70"
            )}
            onClick={() => onClick(task)}
        >
            {/* Drag handle + Priority */}
            <div className="flex items-start gap-2 mb-2">
                <button
                    {...attributes}
                    {...listeners}
                    className="mt-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="flex-1 min-w-0">
                    <h3 className={cn(
                        "text-sm font-medium text-foreground leading-tight",
                        task.status === 'done' && "line-through text-muted-foreground"
                    )}>
                        {task.title}
                    </h3>
                </div>
                <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: priority.color }}
                    title={priority.label}
                />
            </div>

            {/* Tags */}
            {task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {task.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                            {tag}
                        </Badge>
                    ))}
                    {task.tags.length > 3 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                            +{task.tags.length - 3}
                        </Badge>
                    )}
                </div>
            )}

            {/* Footer: due date + subtasks */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {task.dueDate && (
                    <div className={cn(
                        "flex items-center gap-1",
                        isOverdue && "text-destructive font-medium"
                    )}>
                        {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                        <span>{getDueLabel(new Date(task.dueDate))}</span>
                    </div>
                )}
                {totalSubtasks > 0 && (
                    <div className="flex items-center gap-1 ml-auto">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{doneSubtasks}/{totalSubtasks}</span>
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${(doneSubtasks / totalSubtasks) * 100}%` }}
                            />
                        </div>
                    </div>
                )}
                {task.linkedEventIds.length > 0 && (
                    <span title="Linked to event"><Calendar className="w-3 h-3 text-primary ml-auto" /></span>
                )}
                {task.actualResult && (
                    <span className="flex items-center gap-0.5 ml-auto" title={task.outcomeRating ? `Rated ${task.outcomeRating}/5` : 'Has outcome'}>
                        {task.outcomeRating ? (
                            <>
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-[10px]">{task.outcomeRating}</span>
                            </>
                        ) : (
                            <span className="text-[10px]">📝</span>
                        )}
                    </span>
                )}

                {/* PDAC dots */}
                <div className="flex items-center gap-0.5 ml-auto" title="PDCA cycle">
                    {PDCA_STAGES.map(stage => {
                        const completed = getCompletedPdcaStages(task);
                        const isComplete = completed.includes(stage.key);
                        return (
                            <div
                                key={stage.key}
                                className={cn(
                                    "w-1.5 h-1.5 rounded-full transition-colors",
                                    isComplete ? "" : "bg-muted-foreground/20"
                                )}
                                style={isComplete ? { backgroundColor: stage.color } : undefined}
                                title={`${stage.label}: ${isComplete ? '✓' : '—'}`}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
