// Task Service — localStorage persistence + mock data
import { Task, TaskStatus } from '@/types/task';

const STORAGE_KEY = 'ofative-tasks';

// ========== Mock Data ==========

const createMockTasks = (): Task[] => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    return [
        {
            id: 'task-1',
            title: 'Design review for landing page',
            description: 'Review the new landing page mockups and provide feedback on color scheme and layout.',
            status: 'todo',
            priority: 'high',
            dueDate: tomorrow,
            linkedEventIds: [],
            linkedTaskIds: [],
            tags: ['design', 'review'],
            category: 'Work Plan',
            color: '#FCA5A5',
            actualResult: '',
            activityLog: [],
            subtasks: [
                { id: 'st-1', title: 'Review hero section', done: true },
                { id: 'st-2', title: 'Check responsive layout', done: false },
                { id: 'st-3', title: 'Verify color contrast', done: false },
            ],
            createdAt: new Date(now.getTime() - 86400000 * 2),
            updatedAt: now,
            order: 0,
        },
        {
            id: 'task-2',
            title: 'Implement API authentication',
            description: 'Set up JWT-based auth for the REST API endpoints.',
            status: 'in-progress',
            priority: 'urgent',
            dueDate: tomorrow,
            linkedEventIds: ['3'],
            linkedTaskIds: [],
            tags: ['backend', 'security'],
            category: 'Project',
            color: '#93C5FD',
            actualResult: '',
            activityLog: [],
            subtasks: [
                { id: 'st-4', title: 'Create auth middleware', done: true },
                { id: 'st-5', title: 'Add token refresh logic', done: true },
                { id: 'st-6', title: 'Write unit tests', done: false },
            ],
            createdAt: new Date(now.getTime() - 86400000 * 3),
            updatedAt: now,
            order: 0,
        },
        {
            id: 'task-3',
            title: 'Update user documentation',
            description: 'Update the user guide with new features from the latest sprint.',
            status: 'todo',
            priority: 'medium',
            dueDate: nextWeek,
            linkedEventIds: [],
            linkedTaskIds: [],
            tags: ['docs', 'content'],
            category: 'Work Plan',
            color: '#D3D3FF',
            actualResult: '',
            activityLog: [],
            subtasks: [],
            createdAt: new Date(now.getTime() - 86400000),
            updatedAt: now,
            order: 1,
        },
        {
            id: 'task-4',
            title: 'Fix navigation bug on mobile',
            description: 'The hamburger menu doesn\'t close when clicking outside on iOS Safari.',
            status: 'in-progress',
            priority: 'high',
            dueDate: now,
            linkedEventIds: [],
            linkedTaskIds: [],
            tags: ['bug', 'mobile'],
            category: 'Project',
            color: '#FCA5A5',
            actualResult: '',
            activityLog: [],
            subtasks: [
                { id: 'st-7', title: 'Reproduce on iOS Safari', done: true },
                { id: 'st-8', title: 'Add click-outside handler', done: false },
            ],
            createdAt: new Date(now.getTime() - 86400000),
            updatedAt: now,
            order: 1,
        },
        {
            id: 'task-5',
            title: 'Code review: PR #147',
            description: 'Review the database migration PR and ensure backward compatibility.',
            status: 'review',
            priority: 'high',
            dueDate: now,
            linkedEventIds: [],
            linkedTaskIds: [],
            tags: ['review', 'backend'],
            category: 'Project',
            color: '#FBBF24',
            actualResult: '',
            activityLog: [],
            subtasks: [],
            createdAt: new Date(now.getTime() - 86400000 * 2),
            updatedAt: now,
            order: 0,
        },
        {
            id: 'task-6',
            title: 'Set up CI/CD pipeline',
            description: 'Configure GitHub Actions for automated testing and deployment.',
            status: 'done',
            priority: 'medium',
            dueDate: yesterday,
            linkedEventIds: [],
            linkedTaskIds: [],
            tags: ['devops', 'automation'],
            category: 'Project',
            color: '#93E9BE',
            actualResult: 'Pipeline configured and running. All tests pass on every push.',
            outcomeRating: 5,
            lessonsLearned: 'YAML config was tricky — documented the setup for future reference.',
            activityLog: [
                { id: 'log-m1', timestamp: new Date(now.getTime() - 86400000 * 5), text: 'Task created', source: 'system' as const },
                { id: 'log-m2', timestamp: new Date(now.getTime() - 86400000 * 3), text: 'Status changed: todo → in-progress', source: 'status_change' as const },
                { id: 'log-m3', timestamp: new Date(now.getTime() - 86400000 * 1), text: 'Status changed: in-progress → done', source: 'status_change' as const },
                { id: 'log-m4', timestamp: yesterday, text: 'Outcome recorded: Pipeline configured and running.', source: 'manual' as const },
            ],
            subtasks: [
                { id: 'st-9', title: 'Create workflow YAML', done: true },
                { id: 'st-10', title: 'Add test step', done: true },
                { id: 'st-11', title: 'Add deploy step', done: true },
            ],
            createdAt: new Date(now.getTime() - 86400000 * 5),
            updatedAt: yesterday,
            completedAt: yesterday,
            order: 0,
        },
        {
            id: 'task-7',
            title: 'Plan team offsite activities',
            description: 'Organize team building activities for the quarterly offsite event.',
            status: 'todo',
            priority: 'low',
            dueDate: nextWeek,
            linkedEventIds: [],
            linkedTaskIds: [],
            tags: ['team', 'planning'],
            category: 'Holiday',
            color: '#93E9BE',
            actualResult: '',
            activityLog: [],
            subtasks: [
                { id: 'st-12', title: 'Book venue', done: false },
                { id: 'st-13', title: 'Plan agenda', done: false },
            ],
            createdAt: now,
            updatedAt: now,
            order: 2,
        },
        {
            id: 'task-8',
            title: 'Prepare sprint demo',
            description: 'Create slides and demo script for the end-of-sprint presentation.',
            status: 'done',
            priority: 'medium',
            linkedEventIds: ['1'],
            linkedTaskIds: [],
            tags: ['presentation', 'sprint'],
            category: 'Work Plan',
            color: '#D3D3FF',
            actualResult: 'Demo went well. Got positive feedback from stakeholders.',
            outcomeRating: 4,
            activityLog: [
                { id: 'log-m5', timestamp: new Date(now.getTime() - 86400000 * 4), text: 'Task created', source: 'system' as const },
                { id: 'log-m6', timestamp: new Date(now.getTime() - 86400000 * 2), text: 'Status changed: todo → in-progress', source: 'status_change' as const },
                { id: 'log-m7', timestamp: new Date(now.getTime() - 86400000 * 1), text: 'Status changed: in-progress → done', source: 'status_change' as const },
            ],
            subtasks: [
                { id: 'st-14', title: 'Create slides', done: true },
                { id: 'st-15', title: 'Record demo video', done: true },
            ],
            createdAt: new Date(now.getTime() - 86400000 * 4),
            updatedAt: new Date(now.getTime() - 86400000),
            completedAt: new Date(now.getTime() - 86400000),
            order: 1,
        },
    ];
};

// ========== Service Functions ==========

const reviveDates = (task: any): Task => ({
    ...task,
    // Ensure new fields have defaults for backward compatibility with existing localStorage data
    actualResult: task.actualResult ?? '',
    linkedTaskIds: task.linkedTaskIds ?? [],
    activityLog: (task.activityLog ?? []).map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
    })),
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
    completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
});

export const loadTasks = (): Task[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return parsed.map(reviveDates);
        }
    } catch (e) {
        console.error('Failed to load tasks:', e);
    }
    // First-time load: use mock data
    const mocks = createMockTasks();
    saveTasks(mocks);
    return mocks;
};

export const saveTasks = (tasks: Task[]): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
        console.error('Failed to save tasks:', e);
    }
};

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
