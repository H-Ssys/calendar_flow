/**
 * Maps between v1 Task (src/types/task.ts) and v2 TaskRow + SubtaskRow (Supabase).
 *
 * Field mapping reference:
 *
 * v1 Task                          v2 tasks table
 * ─────────────────────────────    ────────────────────────────────────
 * id: string                  →   id: string (UUID)
 * title: string               →   title: string
 * description: string         →   description: string | null
 * status: 'in-progress'       ↔   status: 'in_progress'   (HYPHEN ↔ UNDERSCORE)
 * priority: 'urgent'          ↔   priority: 'critical'    (RENAME)
 * dueDate?: Date              →   due_date: string | null (ISO)
 * scheduledDate?: string      →   scheduled_date: string | null
 * scheduledSlotId?: string    →   scheduled_slot_id: string | null
 * outcomeEmoji?: OutcomeEmoji →   outcome_emoji: string | null
 * outcomeRating?: 1-5         →   outcome_rating: number | null
 * timeSpent?: number          →   time_spent: number
 * completedAt?: Date          →   completed_at: string | null (ISO)
 * tags: string[]              →   tags: string[]
 * createdAt: Date             →   created_at: string (ISO)
 * updatedAt: Date             →   updated_at: string (ISO)
 *
 * --- v1 fields with NO v2 column → stored in tasks.metadata JSONB ---
 * actualResult: string        →   metadata.actualResult
 * lessonsLearned?: string     →   metadata.lessonsLearned
 * category: string            →   metadata.category
 * color: string               →   metadata.color
 * order: number               →   metadata.order
 * linkedEventIds: string[]    →   metadata.linkedEventIds
 * linkedTaskIds: string[]     →   metadata.linkedTaskIds
 * activityLog: array          →   metadata.activityLog
 *
 * --- Subtasks: separate table (subtasks) ---
 * v1 Subtask.id               →   subtasks.id
 * v1 Subtask.title            →   subtasks.title
 * v1 Subtask.done             →   subtasks.is_completed
 *                                 subtasks.parent_task_id (FK)
 *                                 subtasks.sort_order
 *
 * --- v2 fields with no v1 equivalent (defaulted) ---
 *                             ←   user_id (from auth)
 *                             ←   team_id (null)
 *                             ←   assigned_to (null)
 *                             ←   created_by (null)
 *                             ←   parent_task_id (null — v1 has no nesting)
 *                             ←   visibility ('private')
 *                             ←   start_date (null)
 */

import type { Task, TaskStatus, TaskPriority, Subtask, TaskActivityEntry } from '@/types/task';
import type { TaskRow, TaskInsert, SubtaskRow, SubtaskInsert } from '@ofative/shared-types';
import type { TaskStatus as V2TaskStatus, Priority as V2Priority } from '@ofative/shared-types';

// ── Status enum mapping ─────────────────────────────────────────────
export function v1StatusToV2(status: TaskStatus): V2TaskStatus {
  return status === 'in-progress' ? 'in_progress' : status;
}
export function v2StatusToV1(status: V2TaskStatus): TaskStatus {
  if (status === 'in_progress') return 'in-progress';
  if (status === 'cancelled') return 'todo'; // v1 has no cancelled — fall back to todo
  return status;
}

// ── Priority enum mapping ────────────────────────────────────────────
export function v1PriorityToV2(priority: TaskPriority): V2Priority {
  return priority === 'urgent' ? 'critical' : priority;
}
export function v2PriorityToV1(priority: V2Priority): TaskPriority {
  return priority === 'critical' ? 'urgent' : priority;
}

// ── Date helpers ─────────────────────────────────────────────────────
function toIso(d: Date | string | undefined | null): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : String(d);
}
function fromIso(s: string | null | undefined): Date | undefined {
  return s ? new Date(s) : undefined;
}

// ── Subtask mapping ──────────────────────────────────────────────────
export function v1SubtaskToV2(subtask: Subtask, parentTaskId: string, sortOrder: number): SubtaskInsert {
  return {
    id: subtask.id,
    parent_task_id: parentTaskId,
    title: subtask.title,
    is_completed: subtask.done,
    sort_order: sortOrder,
  };
}
export function v2SubtaskToV1(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    title: row.title,
    done: row.is_completed,
  };
}

/**
 * Convert a v1 Task to a v2 TaskInsert (without subtasks — caller handles those).
 */
export function mapV1ToV2(task: Task | Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'> & { id?: string }, userId: string): TaskInsert {
  // Narrow: optional id/createdAt/updatedAt for new task path
  const t = task as Task;
  return {
    ...(t.id ? { id: t.id } : {}),
    user_id: userId,
    title: t.title,
    description: t.description ?? null,
    status: v1StatusToV2(t.status),
    priority: v1PriorityToV2(t.priority),
    due_date: toIso(t.dueDate),
    scheduled_date: t.scheduledDate ?? null,
    scheduled_slot_id: t.scheduledSlotId ?? null,
    outcome_emoji: t.outcomeEmoji ?? null,
    outcome_rating: t.outcomeRating ?? null,
    time_spent: t.timeSpent ?? 0,
    completed_at: toIso(t.completedAt),
    tags: t.tags ?? [],
    visibility: 'private',
    ...(t.createdAt ? { created_at: toIso(t.createdAt) ?? undefined } : {}),
    ...(t.updatedAt ? { updated_at: toIso(t.updatedAt) ?? undefined } : {}),
    // Pack v1-only fields into metadata JSONB
    // (cast: shared-types TaskInsert doesn't include metadata yet — added in migration 010)
    metadata: buildMetadata(t),
  } as TaskInsert & { metadata: Record<string, unknown> };
}

/**
 * Convert v2 TaskRow + SubtaskRow[] to a v1 Task.
 */
export function mapV2ToV1(row: TaskRow & { metadata?: Record<string, unknown> }, subtasks: SubtaskRow[] = []): Task {
  const meta = row.metadata ?? {};
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    status: v2StatusToV1(row.status),
    priority: v2PriorityToV1(row.priority),
    dueDate: fromIso(row.due_date),
    actualResult: (meta.actualResult as string) ?? '',
    outcomeRating: (row.outcome_rating as 1 | 2 | 3 | 4 | 5 | undefined) ?? undefined,
    outcomeEmoji: (row.outcome_emoji as Task['outcomeEmoji']) ?? undefined,
    lessonsLearned: (meta.lessonsLearned as string) ?? undefined,
    scheduledDate: row.scheduled_date ?? undefined,
    scheduledSlotId: row.scheduled_slot_id ?? undefined,
    timeSpent: row.time_spent ?? 0,
    linkedEventIds: (meta.linkedEventIds as string[]) ?? [],
    linkedTaskIds: (meta.linkedTaskIds as string[]) ?? [],
    tags: row.tags ?? [],
    category: (meta.category as string) ?? '',
    color: (meta.color as string) ?? '#D3D3FF',
    subtasks: subtasks
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(v2SubtaskToV1),
    activityLog: deserializeActivityLog((meta.activityLog as unknown[]) ?? []),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    completedAt: fromIso(row.completed_at),
    order: (meta.order as number) ?? 0,
  };
}

/**
 * Convert a v1 partial update to a v2 partial update.
 * Includes metadata merging: any v1-only field updates require re-reading
 * the existing metadata blob — caller must provide it via existingMetadata.
 */
export function mapV1UpdateToV2(
  updates: Partial<Task>,
  existingMetadata: Record<string, unknown> = {}
): Partial<TaskInsert> & { metadata?: Record<string, unknown> } {
  const v2: Partial<TaskInsert> & { metadata?: Record<string, unknown> } = {};

  if (updates.title !== undefined) v2.title = updates.title;
  if (updates.description !== undefined) v2.description = updates.description;
  if (updates.status !== undefined) v2.status = v1StatusToV2(updates.status);
  if (updates.priority !== undefined) v2.priority = v1PriorityToV2(updates.priority);
  if (updates.dueDate !== undefined) v2.due_date = toIso(updates.dueDate);
  if (updates.scheduledDate !== undefined) v2.scheduled_date = updates.scheduledDate ?? null;
  if (updates.scheduledSlotId !== undefined) v2.scheduled_slot_id = updates.scheduledSlotId ?? null;
  if (updates.outcomeEmoji !== undefined) v2.outcome_emoji = updates.outcomeEmoji ?? null;
  if (updates.outcomeRating !== undefined) v2.outcome_rating = updates.outcomeRating ?? null;
  if (updates.timeSpent !== undefined) v2.time_spent = updates.timeSpent;
  if (updates.completedAt !== undefined) v2.completed_at = toIso(updates.completedAt);
  if (updates.tags !== undefined) v2.tags = updates.tags;

  // Merge metadata if any v1-only field changed
  const metaKeys: (keyof Task)[] = [
    'actualResult', 'lessonsLearned', 'category', 'color', 'order',
    'linkedEventIds', 'linkedTaskIds', 'activityLog',
  ];
  const touchesMeta = metaKeys.some((k) => updates[k] !== undefined);
  if (touchesMeta) {
    v2.metadata = {
      ...existingMetadata,
      ...(updates.actualResult !== undefined ? { actualResult: updates.actualResult } : {}),
      ...(updates.lessonsLearned !== undefined ? { lessonsLearned: updates.lessonsLearned } : {}),
      ...(updates.category !== undefined ? { category: updates.category } : {}),
      ...(updates.color !== undefined ? { color: updates.color } : {}),
      ...(updates.order !== undefined ? { order: updates.order } : {}),
      ...(updates.linkedEventIds !== undefined ? { linkedEventIds: updates.linkedEventIds } : {}),
      ...(updates.linkedTaskIds !== undefined ? { linkedTaskIds: updates.linkedTaskIds } : {}),
      ...(updates.activityLog !== undefined ? { activityLog: serializeActivityLog(updates.activityLog) } : {}),
    };
  }

  return v2;
}

// ── Internal helpers ─────────────────────────────────────────────────
function buildMetadata(t: Task): Record<string, unknown> {
  return {
    actualResult: t.actualResult ?? '',
    ...(t.lessonsLearned !== undefined ? { lessonsLearned: t.lessonsLearned } : {}),
    category: t.category ?? '',
    color: t.color ?? '#D3D3FF',
    order: t.order ?? 0,
    linkedEventIds: t.linkedEventIds ?? [],
    linkedTaskIds: t.linkedTaskIds ?? [],
    activityLog: serializeActivityLog(t.activityLog ?? []),
  };
}

function serializeActivityLog(log: TaskActivityEntry[]): unknown[] {
  return log.map((e) => ({
    id: e.id,
    timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp,
    text: e.text,
    source: e.source,
  }));
}

function deserializeActivityLog(raw: unknown[]): TaskActivityEntry[] {
  return raw.map((e) => {
    const obj = e as { id: string; timestamp: string; text: string; source: TaskActivityEntry['source'] };
    return {
      id: obj.id,
      timestamp: new Date(obj.timestamp),
      text: obj.text,
      source: obj.source,
    };
  });
}
