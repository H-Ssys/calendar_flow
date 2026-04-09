import React, { useState } from 'react';
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar';
import { TaskHeader } from '@/components/tasks/TaskHeader';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { useTaskContext } from '@/context/TaskContext';
import { Task } from '@/types/task';
import { ActivityDashboard } from '@/components/tasks/ActivityDashboard';

const Tasks = () => {
    const { viewMode, addTask, tasks } = useTaskContext();
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    // Derive live task from context — always fresh
    const selectedTask = selectedTaskId
        ? tasks.find(t => t.id === selectedTaskId) ?? null
        : null;

    const handleTaskClick = (task: Task) => {
        setSelectedTaskId(task.id);
    };

    const handleCloseDetail = () => {
        setSelectedTaskId(null);
    };

    const handleAddTask = () => {
        const newTask = addTask({
            title: 'New Task',
            description: '',
            status: 'todo',
            priority: 'medium',
            linkedEventIds: [],
            tags: [],
            category: '',
            color: '#D3D3FF',
            subtasks: [],
        });
        setSelectedTaskId(newTask.id);
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
        </div>
    );
};

export default Tasks;
