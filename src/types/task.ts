// Types for Task Management Module

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type PdcaStage = 'plan' | 'do' | 'check' | 'act';
export type ActivitySource = 'journal' | 'manual' | 'status_change' | 'system';
export type OutcomeEmoji = 'great' | 'ok' | 'rough';

// ── Activity Timeline Entry ──
export interface TaskActivityEntry {
    id: string;
    timestamp: Date;
    text: string;
    source: ActivitySource;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: Date;

    // Outcome tracking (PDCA — simplified)
    actualResult: string;                   // Quick note (single line)
    outcomeRating?: 1 | 2 | 3 | 4 | 5;     // Mapped from emoji: great=5, ok=3, rough=1
    outcomeEmoji?: OutcomeEmoji;            // 😊 great · 😐 ok · 😟 rough
    lessonsLearned?: string;                // Kept for backward compat

    // Time context (journal integration)
    scheduledDate?: string;
    scheduledSlotId?: string;
    timeSpent?: number;

    // Calendar integration
    linkedEventIds: string[];
    linkedTaskIds: string[];

    // Organization
    tags: string[];
    category: string;
    color: string;

    // Checklist
    subtasks: Subtask[];

    // Activity timeline
    activityLog: TaskActivityEntry[];

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    order: number;
}

export interface Subtask {
    id: string;
    title: string;
    done: boolean;
}

export interface TaskColumn {
    id: TaskStatus;
    title: string;
    emoji: string;
    color: string;
}

export const TASK_COLUMNS: TaskColumn[] = [
    { id: 'todo', title: 'To Do', emoji: '📋', color: '#94a3b8' },
    { id: 'in-progress', title: 'In Progress', emoji: '🔄', color: '#60a5fa' },
    { id: 'review', title: 'Review', emoji: '👁️', color: '#f59e0b' },
    { id: 'done', title: 'Done', emoji: '✅', color: '#22c55e' },
];

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; emoji: string }> = {
    urgent: { label: 'Urgent', color: '#ef4444', emoji: '🔴' },
    high: { label: 'High', color: '#f97316', emoji: '🟠' },
    medium: { label: 'Medium', color: '#eab308', emoji: '🟡' },
    low: { label: 'Low', color: '#22c55e', emoji: '🟢' },
};

// ── PDCA Stage Config ──

export const PDCA_STAGES: { key: PdcaStage; label: string; emoji: string; color: string }[] = [
    { key: 'plan', label: 'Plan', emoji: '📝', color: '#94a3b8' },
    { key: 'do', label: 'Do', emoji: '🔨', color: '#3b82f6' },
    { key: 'check', label: 'Check', emoji: '🔍', color: '#f59e0b' },
    { key: 'act', label: 'Act', emoji: '🚀', color: '#22c55e' },
];

// ── Outcome Emoji Config ──

export const OUTCOME_EMOJIS: { key: OutcomeEmoji; emoji: string; label: string; rating: 1 | 3 | 5 }[] = [
    { key: 'great', emoji: '😊', label: 'Great', rating: 5 },
    { key: 'ok', emoji: '😐', label: 'OK', rating: 3 },
    { key: 'rough', emoji: '😟', label: 'Rough', rating: 1 },
];

/** Map emoji to numeric rating for backward compat */
export const emojiToRating = (emoji: OutcomeEmoji): 1 | 3 | 5 =>
    OUTCOME_EMOJIS.find(e => e.key === emoji)?.rating ?? 3;

// ── PDCA Auto-Tracking (fully automated from status + outcome) ──

/** Auto-derive current PDCA stage */
export const computePdcaStage = (task: Task): PdcaStage => {
    if (task.outcomeEmoji || task.outcomeRating) return 'act';
    if (task.status === 'done' || task.status === 'review') return 'check';
    if (task.status === 'in-progress') return 'do';
    return 'plan';
};

/** Which stages are completed */
export const getCompletedPdcaStages = (task: Task): PdcaStage[] => {
    const stages: PdcaStage[] = [];
    stages.push('plan'); // Always complete — task exists
    if (task.status !== 'todo') stages.push('do');
    if (task.status === 'done' || task.status === 'review') stages.push('check');
    if (task.outcomeEmoji || task.outcomeRating) stages.push('act');
    return stages;
};

/** Generate auto-summary from subtask completion */
export const generateSubtaskSummary = (task: Task): string => {
    if (task.subtasks.length === 0) return '';
    const done = task.subtasks.filter(st => st.done);
    const notDone = task.subtasks.filter(st => !st.done);
    const lines: string[] = [`Completed ${done.length}/${task.subtasks.length} subtasks:`];
    done.forEach(st => lines.push(`✅ ${st.title}`));
    notDone.forEach(st => lines.push(`❌ ${st.title}`));
    return lines.join('\n');
};

// ── Smart due date label ──

import { differenceInHours, differenceInCalendarDays, format } from 'date-fns';

export const getDueLabel = (dueDate: Date): string => {
    const now = new Date();
    const d = new Date(dueDate);
    const diffHours = differenceInHours(d, now);
    const diffDays = differenceInCalendarDays(d, now);

    if (diffHours < -24) return `Overdue by ${Math.abs(diffDays)}d`;
    if (diffHours < 0) return `Overdue by ${Math.abs(diffHours)}h`;
    if (diffHours < 1) return 'Due soon';
    if (diffHours < 24) return `Due in ${diffHours}h`;
    if (diffDays < 7) return `Due in ${diffDays}d`;
    return format(d, 'MMM d');
};

