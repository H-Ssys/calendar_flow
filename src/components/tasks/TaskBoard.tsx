import React, { useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useTaskContext } from '@/context/TaskContext';
import { TaskColumnComponent } from './TaskColumn';
import { TaskCard } from './TaskCard';
import { Task, TaskStatus, TASK_COLUMNS } from '@/types/task';

interface TaskBoardProps {
    onTaskClick: (task: Task) => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ onTaskClick }) => {
    const { tasks, tasksByStatus, moveTask, reorderTasks } = useTaskContext();
    const [activeTask, setActiveTask] = React.useState<Task | null>(null);

    const columns = useMemo(() => {
        return TASK_COLUMNS.map(col => ({
            ...col,
            tasks: tasksByStatus(col.id),
        }));
    }, [tasks, tasksByStatus]);

    const handleDragStart = (event: DragStartEvent) => {
        const taskData = event.active.data.current?.task as Task | undefined;
        if (taskData) setActiveTask(taskData);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveTask(null);
        const { active, over } = event;
        if (!over) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        // Extract raw task IDs
        const activeTaskId = activeId.replace('task-drag-', '');
        const activeTask = tasks.find(t => t.id === activeTaskId);
        if (!activeTask) return;

        // Case 1: Dropped on a column header
        if (overId.startsWith('column-')) {
            const newStatus = overId.replace('column-', '') as TaskStatus;
            if (activeTask.status !== newStatus) {
                moveTask(activeTaskId, newStatus);
            }
            return;
        }

        // Case 2: Dropped on another task card
        if (overId.startsWith('task-drag-')) {
            const overTaskId = overId.replace('task-drag-', '');
            const overTask = tasks.find(t => t.id === overTaskId);
            if (!overTask) return;

            if (activeTask.status === overTask.status) {
                // Same column — reorder
                const columnTasks = tasksByStatus(activeTask.status);
                const oldIndex = columnTasks.findIndex(t => t.id === activeTaskId);
                const newIndex = columnTasks.findIndex(t => t.id === overTaskId);
                if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                    const reordered = arrayMove(columnTasks, oldIndex, newIndex);
                    reorderTasks(activeTask.status, reordered.map(t => t.id));
                }
            } else {
                // Different column — move to target column at the position of the over task
                moveTask(activeTaskId, overTask.status);
            }
        }
    };


    return (
        <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 p-4 overflow-x-auto h-full">
                {columns.map(col => (
                    <TaskColumnComponent
                        key={col.id}
                        status={col.id}
                        tasks={col.tasks}
                        onTaskClick={onTaskClick}
                    />
                ))}
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
                {activeTask && (
                    <div className="w-[280px] opacity-90 rotate-2 shadow-2xl">
                        <TaskCard task={activeTask} onClick={() => { }} />
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
};
