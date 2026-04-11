// Task Service — pure helpers (query, ID generation).
// Persistence lives in taskSupabaseService.
import { Task, TaskStatus } from '@/types/task';

export const getTasksByStatus = (tasks: Task[], status: TaskStatus): Task[] => {
    return tasks
        .filter(t => t.status === status)
        .sort((a, b) => a.order - b.order);
};

export const getTasksByDate = (tasks: Task[], date: Date): Task[] => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return tasks.filter(t => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d >= start && d <= end;
    });
};

export const getOverdueTasks = (tasks: Task[]): Task[] => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return tasks.filter(t => {
        if (!t.dueDate || t.status === 'done') return false;
        const d = new Date(t.dueDate);
        d.setHours(0, 0, 0, 0);
        return d < now;
    });
};

export const getTasksLinkedToEvent = (tasks: Task[], eventId: string): Task[] => {
    return tasks.filter(t => t.linkedEventIds.includes(eventId));
};

export const generateTaskId = (): string => {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
};

export const generateSubtaskId = (): string => {
    return `st-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
};
