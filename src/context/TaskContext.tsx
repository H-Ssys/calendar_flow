import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef, ReactNode } from 'react';
import { Task, TaskStatus, TaskPriority, TaskActivityEntry, ActivitySource } from '@/types/task';
import {
    getTasksByStatus, getTasksByDate,
    getOverdueTasks, generateTaskId, generateSubtaskId
} from '@/services/taskService';
import * as taskSupabaseService from '@/services/supabase/taskSupabaseService';
import { mapV1ToV2, mapV2ToV1, mapV1UpdateToV2 } from '@/utils/taskTypeMapper';
import { useAuthContext } from './AuthContext';
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
    const { user } = useAuthContext();
    const userId = user?.id;

    const [tasks, setTasks] = useState<Task[]>([]);
    const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
    const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

    // Track raw v2 metadata per task ID so update mapper can merge correctly
    const metadataByTaskId = useRef<Record<string, Record<string, unknown>>>({});

    // ── Refetch helper ───────────────────────────────────────────────
    const refetchFromSupabase = useCallback(async () => {
        if (!userId) return;
        try {
            const { tasks: rows, subtasksByTaskId } = await taskSupabaseService.fetchTasks(userId);
            metadataByTaskId.current = {};
            const v1Tasks = rows.map((row) => {
                metadataByTaskId.current[row.id] = row.metadata ?? {};
                return mapV2ToV1(row, subtasksByTaskId[row.id] ?? []);
            });
            setTasks(v1Tasks);
        } catch (err) {
            console.error('[TaskContext] Failed to fetch tasks from Supabase:', err);
        }
    }, [userId]);

    // ── Fetch on mount + realtime subscription ───────────────────────
    useEffect(() => {
        if (!userId) return;
        refetchFromSupabase();
        const unsubscribe = taskSupabaseService.subscribeToTasks(userId, () => {
            refetchFromSupabase();
        });
        return () => { unsubscribe(); };
    }, [userId, refetchFromSupabase]);

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

        // Optimistic local update
        setTasks(prev => [...prev, newTask]);
        toast.success(`Task "${newTask.title}" created`);

        if (userId) {
            const v2Task = mapV1ToV2(newTask, userId);
            const v2Subtasks = newTask.subtasks.map((s, i) => ({
                id: s.id,
                title: s.title,
                is_completed: s.done,
                sort_order: i,
            }));
            taskSupabaseService.createTask(userId, v2Task, v2Subtasks).then(({ task: row }) => {
                metadataByTaskId.current[row.id] = row.metadata ?? {};
            }).catch((err) => {
                console.error('[TaskContext] Supabase createTask failed, rolling back:', err);
                setTasks(prev => prev.filter(t => t.id !== newTask.id));
            });
        }

        return newTask;
    }, [tasks, userId]);

    const updateTask = useCallback((id: string, updates: Partial<Task>) => {
        let previous: Task | undefined;
        setTasks(prev => prev.map(t => {
            if (t.id !== id) return t;
            previous = t;
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

        const existingMeta = metadataByTaskId.current[id] ?? {};
        const v2Updates = mapV1UpdateToV2(updates, existingMeta);
        taskSupabaseService.updateTask(id, v2Updates).then((row) => {
            metadataByTaskId.current[id] = row.metadata ?? {};
        }).catch((err) => {
            console.error('[TaskContext] Supabase updateTask failed, rolling back:', err);
            if (previous) {
                setTasks(prev => prev.map(t => t.id === id ? previous! : t));
            }
        });
    }, []);

    const deleteTask = useCallback((id: string) => {
        let deleted: Task | undefined;
        setTasks(prev => {
            deleted = prev.find(t => t.id === id);
            if (deleted) {
                toast.success('Task deleted', {
                    action: {
                        label: 'Undo',
                        onClick: () => {
                            setTasks(p => [...p, deleted!]);
                            if (userId && deleted) {
                                const v2Task = mapV1ToV2(deleted, userId);
                                const v2Subtasks = deleted.subtasks.map((s, i) => ({
                                    id: s.id,
                                    title: s.title,
                                    is_completed: s.done,
                                    sort_order: i,
                                }));
                                taskSupabaseService.createTask(userId, v2Task, v2Subtasks).catch((err) => {
                                    console.error('[TaskContext] Undo: failed to recreate task in Supabase:', err);
                                });
                            }
                        },
                    },
                    duration: 5000,
                });
            }
            return prev.filter(t => t.id !== id);
        });

        taskSupabaseService.deleteTask(id).then(() => {
            delete metadataByTaskId.current[id];
        }).catch((err) => {
            console.error('[TaskContext] Supabase deleteTask failed, rolling back:', err);
            if (deleted) {
                setTasks(prev => [...prev, deleted!]);
            }
        });
    }, [userId]);

    // Kanban
    const moveTask = useCallback((taskId: string, newStatus: TaskStatus) => {
        let updatedTask: Task | undefined;
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

            return prev.map(t => {
                if (t.id !== taskId) return t;
                updatedTask = { ...t, ...updates };
                return updatedTask;
            });
        });

        if (updatedTask) {
            const existingMeta = metadataByTaskId.current[taskId] ?? {};
            const v2Updates = mapV1UpdateToV2({
                status: updatedTask.status,
                order: updatedTask.order,
                completedAt: updatedTask.completedAt,
            }, existingMeta);
            taskSupabaseService.updateTask(taskId, v2Updates).then((row) => {
                metadataByTaskId.current[taskId] = row.metadata ?? {};
            }).catch((err) => {
                console.error('[TaskContext] Supabase moveTask failed:', err);
            });
        }
    }, []);

    const reorderTasks = useCallback((status: TaskStatus, taskIds: string[]) => {
        setTasks(prev => prev.map(t => {
            if (t.status !== status) return t;
            const newOrder = taskIds.indexOf(t.id);
            if (newOrder === -1) return t;
            return { ...t, order: newOrder };
        }));

        // Push order changes for all reordered tasks (best effort)
        taskIds.forEach((id, newOrder) => {
            const existingMeta = metadataByTaskId.current[id] ?? {};
            const v2Updates = mapV1UpdateToV2({ order: newOrder }, existingMeta);
            taskSupabaseService.updateTask(id, v2Updates).then((row) => {
                metadataByTaskId.current[id] = row.metadata ?? {};
            }).catch((err) => {
                console.error('[TaskContext] Supabase reorderTasks failed for', id, err);
            });
        });
    }, []);

    // Subtasks
    const addSubtask = useCallback((taskId: string, title: string) => {
        const subtaskId = generateSubtaskId();
        let nextSortOrder = 0;
        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            nextSortOrder = t.subtasks.length;
            return {
                ...t,
                subtasks: [...t.subtasks, { id: subtaskId, title, done: false }],
                updatedAt: new Date(),
            };
        }));

        taskSupabaseService.createSubtask(taskId, {
            id: subtaskId,
            title,
            is_completed: false,
            sort_order: nextSortOrder,
        }).catch((err) => {
            console.error('[TaskContext] Supabase createSubtask failed, rolling back:', err);
            setTasks(prev => prev.map(t => t.id === taskId
                ? { ...t, subtasks: t.subtasks.filter(s => s.id !== subtaskId) }
                : t));
        });
    }, []);

    const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
        let nextDone = false;
        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            return {
                ...t,
                subtasks: t.subtasks.map(st => {
                    if (st.id !== subtaskId) return st;
                    nextDone = !st.done;
                    return { ...st, done: nextDone };
                }),
                updatedAt: new Date(),
            };
        }));

        taskSupabaseService.updateSubtask(subtaskId, { is_completed: nextDone }).catch((err) => {
            console.error('[TaskContext] Supabase toggleSubtask failed:', err);
        });
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

        taskSupabaseService.deleteSubtask(subtaskId).catch((err) => {
            console.error('[TaskContext] Supabase deleteSubtask failed:', err);
        });
    }, []);

    // Activity Log
    const addActivityLogEntry = useCallback((taskId: string, text: string, source: ActivitySource) => {
        let newLog: TaskActivityEntry[] | undefined;
        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            const entry: TaskActivityEntry = {
                id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                timestamp: new Date(),
                text,
                source,
            };
            newLog = [...(t.activityLog || []), entry];
            return {
                ...t,
                activityLog: newLog,
                updatedAt: new Date(),
            };
        }));

        if (newLog) {
            const existingMeta = metadataByTaskId.current[taskId] ?? {};
            const v2Updates = mapV1UpdateToV2({ activityLog: newLog }, existingMeta);
            taskSupabaseService.updateTask(taskId, v2Updates).then((row) => {
                metadataByTaskId.current[taskId] = row.metadata ?? {};
            }).catch((err) => {
                console.error('[TaskContext] Supabase addActivityLogEntry failed:', err);
            });
        }
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
