import React, { useState } from 'react';
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar';
import { TaskHeader } from '@/components/tasks/TaskHeader';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { useTaskContext } from '@/context/TaskContext';
import { Task } from '@/types/task';
import { ActivityDashboard } from '@/components/tasks/ActivityDashboard';
import { EventPage } from '@/components/events/EventPage';
import { CalendarCheck2, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeaderRight } from '@/components/PageHeaderRight';
import { AddTaskPopover } from '@/components/tasks/AddTaskPopover';

type ActiveTab = 'events' | 'tasks';

const EventTask = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('events');
    const { viewMode, addTask, tasks } = useTaskContext();
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    const selectedTask = selectedTaskId
        ? tasks.find(t => t.id === selectedTaskId) ?? null
        : null;

    const handleTaskClick = (task: Task) => {
        setSelectedTaskId(task.id);
    };

    const handleCloseDetail = () => {
        setSelectedTaskId(null);
    };

    const [addTaskAnchor, setAddTaskAnchor] = useState<{ x: number; y: number } | null>(null);

    const handleAddTask = (e: React.MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setAddTaskAnchor({ x: rect.left, y: rect.bottom + 8 });
    };

    const tabs: { key: ActiveTab; label: string; icon: React.ElementType }[] = [
        { key: 'events', label: 'Events', icon: CalendarCheck2 },
        { key: 'tasks', label: 'Tasks', icon: ListTodo },
    ];

    return (
        <div className="flex w-full h-screen bg-background overflow-hidden relative">
            <CalendarSidebar />

            <main className="flex flex-col flex-1 overflow-hidden">
                <PageHeaderRight />
                
                {/* Tab Bar */}
                <div className="border-b border-border bg-background px-4">
                    <div className="flex items-center gap-0">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                                        isActive
                                            ? "border-primary text-primary"
                                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'events' ? (
                    <EventPage />
                ) : (
                    <>
                        <TaskHeader onAddTask={handleAddTask} />
                        <div className="px-4 pt-4">
                            <ActivityDashboard />
                        </div>
                        <div className="flex flex-1 overflow-hidden">
                            <div className="flex-1 overflow-hidden">
                                {viewMode === 'board' ? (
                                    <TaskBoard onTaskClick={handleTaskClick} />
                                ) : (
                                    <TaskList onTaskClick={handleTaskClick} />
                                )}
                            </div>
                            {selectedTask && (
                                <TaskDetail
                                    task={selectedTask}
                                    onClose={handleCloseDetail}
                                />
                            )}
                        </div>
                    </>
                )}
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

export default EventTask;
