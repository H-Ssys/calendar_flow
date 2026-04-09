import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, ReactNode } from 'react';
import { Task, TaskStatus, TaskPriority, TaskActivityEntry, ActivitySource } from '@/types/task';
import {
    loadTasks, saveTasks, getTasksByStatus, getTasksByDate,
    getOverdueTasks, generateTaskId, generateSubtaskId
} from '@/services/taskService';
import { toast } from 'sonner';

// ========== Context Type ==========

interface TaskContextType {
    tasks: Task[];

    // CRUD
    addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => Task;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;

    // Kanban
    moveTask: (taskId: string, newStatus: TaskStatus) => void;
    reorderTasks: (status: TaskStatus, taskIds: string[]) => void;

    // Subtasks
    addSubtask: (taskId: string, title: string) => void;
    toggleSubtask: (taskId: string, subtaskId: string) => void;
    deleteSubtask: (taskId: string, subtaskId: string) => void;

    // Activity Log
    addActivityLogEntry: (taskId: string, text: string, source: ActivitySource) => void;

    // Queries
    tasksByStatus: (status: TaskStatus) => Task[];
    tasksByDate: (date: Date) => Task[];
    overdueTasks: Task[];
    todayTasks: Task[];

    // Filters
    filterStatus: TaskStatus | 'all';
    setFilterStatus: (status: TaskStatus | 'all') => void;
    filterPriority: TaskPriority | 'all';
    setFilterPriority: (priority: TaskPriority | 'all') => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;

    // View
    viewMode: 'board' | 'list';
    setViewMode: (mode: 'board' | 'list') => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTaskContext = () => {
    const ctx = useContext(TaskContext);
    if (!ctx) throw new Error('useTaskContext must be used within TaskProvider');
    return ctx;
};

// ========== Provider ==========

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
    const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
    const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

    // Persist on change
    useEffect(() => {
        saveTasks(tasks);
    }, [tasks]);

    // CRUD
    const addTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => {
        const now = new Date();
        const statusTasks = tasks.filter(t => t.status === taskData.status);
        const taskId = generateTaskId();
        const newTask: Task = {
            // Provide defaults for optional/new fields
            actualResult: '',
            linkedTaskIds: [],
            linkedEventIds: [],
            tags: [],
            category: '',
            color: '#D3D3FF',
            subtasks: [],
            description: '',
            activityLog: [],
            // Spread caller's data (overrides any defaults above)
            ...taskData,
            // Auto-generated — always override
            id: taskId,
            createdAt: now,
            updatedAt: now,
            order: statusTasks.length,
        };
        // Auto-log creation
        newTask.activityLog = [{
            id: `log-${Date.now()}`,
            timestamp: now,
            text: 'Task created',
            source: 'system',
        }];
        setTasks(prev => [...prev, newTask]);
        toast.success(`Task "${newTask.title}" created`);
        return newTask;
    }, [tasks]);

    const updateTask = useCallback((id: string, updates: Partial<Task>) => {
        setTasks(prev => prev.map(t => {
            if (t.id !== id) return t;
            const updated = { ...t, ...updates, updatedAt: new Date() };
            // Auto-log status changes
            if (updates.status && updates.status !== t.status) {
                const logEntry: TaskActivityEntry = {
                    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                    timestamp: new Date(),
                    text: `Status changed: ${t.status} → ${updates.status}`,
                    source: 'status_change',
                };
                updated.activityLog = [...(updated.activityLog || []), logEntry];
            }
            return updated;
        }));
    }, []);

    const deleteTask = useCallback((id: string) => {
        setTasks(prev => {
            const taskToDelete = prev.find(t => t.id === id);
            if (taskToDelete) {
                toast.success('Task deleted', {
                    action: {
                        label: 'Undo',
                        onClick: () => setTasks(p => [...p, taskToDelete]),
                    },
                    duration: 5000,
                });
            }
            return prev.filter(t => t.id !== id);
        });
    }, []);

    // Kanban
    const moveTask = useCallback((taskId: string, newStatus: TaskStatus) => {
        setTasks(prev => {
            const task = prev.find(t => t.id === taskId);
            if (!task || task.status === newStatus) return prev;

            const targetTasks = prev.filter(t => t.status === newStatus);
            const updates: Partial<Task> = {
                status: newStatus,
                order: targetTasks.length,
                updatedAt: new Date(),
            };

            if (newStatus === 'done' && !task.completedAt) {
                updates.completedAt = new Date();
            } else if (newStatus !== 'done') {
                updates.completedAt = undefined;
            }

            return prev.map(t => t.id === taskId ? { ...t, ...updates } : t);
        });
    }, []);

    const reorderTasks = useCallback((status: TaskStatus, taskIds: string[]) => {
        setTasks(prev => prev.map(t => {
            if (t.status !== status) return t;
            const newOrder = taskIds.indexOf(t.id);
            if (newOrder === -1) return t;
            return { ...t, order: newOrder };
        }));
    }, []);

    // Subtasks
    const addSubtask = useCallback((taskId: string, title: string) => {
        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            return {
                ...t,
                subtasks: [...t.subtasks, { id: generateSubtaskId(), title, done: false }],
                updatedAt: new Date(),
            };
        }));
    }, []);

    const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            return {
                ...t,
                subtasks: t.subtasks.map(st => st.id === subtaskId ? { ...st, done: !st.done } : st),
                updatedAt: new Date(),
            };
        }));
    }, []);

    const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            return {
                ...t,
                subtasks: t.subtasks.filter(st => st.id !== subtaskId),
                updatedAt: new Date(),
            };
        }));
    }, []);

    // Activity Log
    const addActivityLogEntry = useCallback((taskId: string, text: string, source: ActivitySource) => {
        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            const entry: TaskActivityEntry = {
                id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                timestamp: new Date(),
                text,
                source,
            };
            return {
                ...t,
                activityLog: [...(t.activityLog || []), entry],
                updatedAt: new Date(),
            };
        }));
    }, []);

    // Queries
    const tasksByStatusFn = useCallback((status: TaskStatus) => getTasksByStatus(tasks, status), [tasks]);
    const tasksByDateFn = useCallback((date: Date) => getTasksByDate(tasks, date), [tasks]);
    const overdueTasks = useMemo(() => getOverdueTasks(tasks), [tasks]);
    const todayTasks = useMemo(() => getTasksByDate(tasks, new Date()), [tasks]);

    const value: TaskContextType = {
        tasks,
        addTask,
        updateTask,
        deleteTask,
        moveTask,
        reorderTasks,
        addSubtask,
        toggleSubtask,
        deleteSubtask,
        addActivityLogEntry,
        tasksByStatus: tasksByStatusFn,
        tasksByDate: tasksByDateFn,
        overdueTasks,
        todayTasks,
        filterStatus,
        setFilterStatus,
        filterPriority,
        setFilterPriority,
        searchQuery,
        setSearchQuery,
        viewMode,
        setViewMode,
    };

    return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};
