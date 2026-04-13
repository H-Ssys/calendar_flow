import React, { useState } from 'react';
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar';
import { TaskHeader } from '@/components/tasks/TaskHeader';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { useTaskContext } from '@/context/TaskContext';
import { Task } from '@/types/task';
import { ActivityDashboard } from '@/components/tasks/ActivityDashboard';
import { AddTaskPopover } from '@/components/tasks/AddTaskPopover';

const Tasks = () => {
    const { viewMode, tasks } = useTaskContext();
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [addTaskAnchor, setAddTaskAnchor] = useState<{ x: number; y: number } | null>(null);

    const selectedTask = selectedTaskId
        ? tasks.find(t => t.id === selectedTaskId) ?? null
        : null;

    const handleTaskClick = (task: Task) => {
        setSelectedTaskId(task.id);
    };

    const handleCloseDetail = () => {
        setSelectedTaskId(null);
    };

    const handleAddTask = (e: React.MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setAddTaskAnchor({ x: rect.left, y: rect.bottom + 8 });
    };

    return (
        <div className="flex w-full h-screen bg-background overflow-hidden relative">
            {/* Left Sidebar */}
            <CalendarSidebar />

            {/* Main Content Area */}
            <main className="flex flex-col flex-1 overflow-hidden">
                <TaskHeader onAddTask={handleAddTask} />

                {/* Activity Dashboard */}
                <div className="px-4 pt-4">
                    <ActivityDashboard />
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Board or List */}
                    <div className="flex-1 overflow-hidden">
                        {viewMode === 'board' ? (
                            <TaskBoard onTaskClick={handleTaskClick} />
                        ) : (
                            <TaskList onTaskClick={handleTaskClick} />
                        )}
                    </div>

                    {/* Task Detail Panel */}
                    {selectedTask && (
                        <TaskDetail
                            task={selectedTask}
                            onClose={handleCloseDetail}
                        />
                    )}
                </div>
            </main>

            {addTaskAnchor && (
                <AddTaskPopover
                    x={addTaskAnchor.x}
                    y={addTaskAnchor.y}
                    onClose={() => setAddTaskAnchor(null)}
                />
            )}
        </div>
    );
};

export default Tasks;
