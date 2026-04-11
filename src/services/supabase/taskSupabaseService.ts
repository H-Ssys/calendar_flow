import { supabase } from '@ofative/supabase-client';
import type { TaskRow, TaskInsert, SubtaskRow, SubtaskInsert } from '@ofative/shared-types';

/**
 * TaskRow with the metadata JSONB column added in migration 010.
 * The shared-types package doesn't include this field yet.
 */
export type TaskRowWithMetadata = TaskRow & { metadata: Record<string, unknown> };

/**
 * Fetch all tasks for a user, joining subtasks.
 * Returns rows with a `subtasks` field populated by the join.
 */
export async function fetchTasks(
  userId: string
): Promise<{ tasks: TaskRowWithMetadata[]; subtasksByTaskId: Record<string, SubtaskRow[]> }> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, subtasks(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const tasks: TaskRowWithMetadata[] = [];
  const subtasksByTaskId: Record<string, SubtaskRow[]> = {};

  for (const row of data ?? []) {
    const { subtasks, ...task } = row as TaskRowWithMetadata & { subtasks: SubtaskRow[] };
    tasks.push(task);
    subtasksByTaskId[task.id] = subtasks ?? [];
  }

  return { tasks, subtasksByTaskId };
}

/**
 * Create a task and (optionally) its subtasks. Subtasks are inserted in a
 * follow-up call so the parent_task_id can use the new task's UUID.
 */
export async function createTask(
  userId: string,
  task: Omit<TaskInsert, 'user_id'> & { metadata?: Record<string, unknown> },
  subtasks: Omit<SubtaskInsert, 'parent_task_id'>[] = []
): Promise<{ task: TaskRowWithMetadata; subtasks: SubtaskRow[] }> {
  const { data: taskRow, error: taskError } = await supabase
    .from('tasks')
    .insert({ ...task, user_id: userId })
    .select()
    .single();

  if (taskError) throw taskError;
  const createdTask = taskRow as TaskRowWithMetadata;

  let createdSubtasks: SubtaskRow[] = [];
  if (subtasks.length > 0) {
    const rowsToInsert: SubtaskInsert[] = subtasks.map((s, i) => ({
      ...s,
      parent_task_id: createdTask.id,
      sort_order: s.sort_order ?? i,
    }));
    const { data: subRows, error: subError } = await supabase
      .from('subtasks')
      .insert(rowsToInsert)
      .select();
    if (subError) throw subError;
    createdSubtasks = (subRows as SubtaskRow[]) ?? [];
  }

  return { task: createdTask, subtasks: createdSubtasks };
}

/** Update a task by ID. */
export async function updateTask(
  taskId: string,
  updates: Partial<TaskInsert> & { metadata?: Record<string, unknown> }
): Promise<TaskRowWithMetadata> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data as TaskRowWithMetadata;
}

/** Delete a task. Subtasks cascade via FK ON DELETE CASCADE. */
export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

/** Insert a subtask under an existing task. */
export async function createSubtask(
  taskId: string,
  subtask: Omit<SubtaskInsert, 'parent_task_id'>
): Promise<SubtaskRow> {
  const { data, error } = await supabase
    .from('subtasks')
    .insert({ ...subtask, parent_task_id: taskId })
    .select()
    .single();

  if (error) throw error;
  return data as SubtaskRow;
}

/** Update a subtask by ID. */
export async function updateSubtask(
  subtaskId: string,
  updates: Partial<SubtaskInsert>
): Promise<SubtaskRow> {
  const { data, error } = await supabase
    .from('subtasks')
    .update(updates)
    .eq('id', subtaskId)
    .select()
    .single();

  if (error) throw error;
  return data as SubtaskRow;
}

/** Delete a subtask by ID. */
export async function deleteSubtask(subtaskId: string): Promise<void> {
  const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);
  if (error) throw error;
}

/**
 * Subscribe to realtime changes on the tasks table for a user.
 * Returns an unsubscribe function. The callback fires on any task change —
 * the caller is expected to refetch.
 */
export function subscribeToTasks(userId: string, callback: () => void): () => void {
  const channel = supabase
    .channel(`rt-tasks-user_id=eq.${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${userId}`,
      },
      () => callback()
    )
    // Also listen on subtasks (no user_id filter — RLS handles isolation)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'subtasks' },
      () => callback()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
