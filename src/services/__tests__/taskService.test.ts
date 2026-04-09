import { describe, it, expect } from 'vitest';
import { getTasksByStatus, getOverdueTasks, generateTaskId } from '@/services/taskService';
import type { Task } from '@/types/task';

// Minimal task factory
const makeTask = (overrides: Partial<Task> = {}): Task => ({
    id: 'task-1',
    title: 'Test',
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    order: 0,
    tags: [],
    category: 'default',
    subtasks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
} as Task);

// ─── getTasksByStatus ───
describe('getTasksByStatus', () => {
    it('filters tasks by status', () => {
        const tasks = [
            makeTask({ id: 't1', status: 'todo', order: 1 }),
            makeTask({ id: 't2', status: 'done', order: 2 }),
            makeTask({ id: 't3', status: 'todo', order: 0 }),
        ];

        const todos = getTasksByStatus(tasks, 'todo');
        expect(todos).toHaveLength(2);
        expect(todos.every(t => t.status === 'todo')).toBe(true);
    });

    it('sorts by order', () => {
        const tasks = [
            makeTask({ id: 't1', status: 'todo', order: 2 }),
            makeTask({ id: 't2', status: 'todo', order: 0 }),
            makeTask({ id: 't3', status: 'todo', order: 1 }),
        ];

        const sorted = getTasksByStatus(tasks, 'todo');
        expect(sorted[0].id).toBe('t2');
        expect(sorted[1].id).toBe('t3');
        expect(sorted[2].id).toBe('t1');
    });

    it('returns empty for non-matching status', () => {
        const tasks = [makeTask({ status: 'todo' })];
        expect(getTasksByStatus(tasks, 'done')).toHaveLength(0);
    });
});

// ─── getOverdueTasks ───
describe('getOverdueTasks', () => {
    it('returns tasks with past due dates', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const tasks = [
            makeTask({ id: 't1', dueDate: yesterday, status: 'todo' }),
            makeTask({ id: 't2', dueDate: null, status: 'todo' }),
        ];

        const overdue = getOverdueTasks(tasks);
        expect(overdue).toHaveLength(1);
        expect(overdue[0].id).toBe('t1');
    });

    it('excludes done tasks even if overdue', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const tasks = [makeTask({ dueDate: yesterday, status: 'done' })];
        expect(getOverdueTasks(tasks)).toHaveLength(0);
    });

    it('excludes tasks without due dates', () => {
        const tasks = [makeTask({ dueDate: null })];
        expect(getOverdueTasks(tasks)).toHaveLength(0);
    });

    it('excludes tasks with future due dates', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const tasks = [makeTask({ dueDate: tomorrow, status: 'todo' })];
        expect(getOverdueTasks(tasks)).toHaveLength(0);
    });
});

// ─── generateTaskId ───
describe('generateTaskId', () => {
    it('returns a string starting with "task-"', () => {
        const id = generateTaskId();
        expect(id).toMatch(/^task-\d+-[a-z0-9]+$/);
    });

    it('generates unique IDs', () => {
        const ids = new Set(Array.from({ length: 50 }, () => generateTaskId()));
        expect(ids.size).toBe(50);
    });
});
