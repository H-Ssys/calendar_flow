import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskStatus, TASK_COLUMNS } from '@/types/task';
import { Task } from '@/types/task';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddTaskPopover } from './AddTaskPopover';

interface TaskColumnProps {
    status: TaskStatus;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
}

export const TaskColumnComponent: React.FC<TaskColumnProps> = ({ status, tasks, onTaskClick }) => {
    const [addAnchor, setAddAnchor] = useState<{ x: number; y: number } | null>(null);

    const { isOver, setNodeRef } = useDroppable({
        id: `column-${status}`,
        data: { status },
    });

    const column = TASK_COLUMNS.find(c => c.id === status)!;
    const sortableIds = tasks.map(t => `task-drag-${t.id}`);

    return (
        <div className="flex flex-col min-w-[280px] max-w-[320px] flex-1">
            {/* Column Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 mb-2">
                <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: column.color }}
                />
                <h3 className="text-sm font-semibold text-foreground">{column.emoji} {column.title}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-medium">
                    {tasks.length}
                </span>
            </div>

            {/* Drop Zone */}
            <div
                ref={setNodeRef}
                className={cn(
                    "flex-1 flex flex-col gap-2 p-2 rounded-lg min-h-[200px] transition-colors",
                    "bg-muted/30 border border-transparent",
                    isOver && "bg-primary/5 border-primary/20 ring-1 ring-primary/20"
                )}
            >
                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                    {tasks.map(task => (
                        <TaskCard key={task.id} task={task} onClick={onTaskClick} />
                    ))}
                </SortableContext>

                {/* Add Task — opens global popover */}
                <button
                    onClick={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setAddAnchor({ x: rect.left, y: rect.bottom + 8 });
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add task
                </button>
            </div>

            {addAnchor && (
                <AddTaskPopover
                    x={addAnchor.x}
                    y={addAnchor.y}
                    onClose={() => setAddAnchor(null)}
                />
            )}
        </div>
    );
};
