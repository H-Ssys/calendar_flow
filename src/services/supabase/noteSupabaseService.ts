import { supabase } from '@ofative/supabase-client';
import type { NoteRow, NoteInsert } from '@ofative/shared-types';

/**
 * NoteRow with the metadata JSONB column added in migration 011.
 * The shared-types package doesn't include this field yet.
 */
export type NoteRowWithMetadata = NoteRow & { metadata: Record<string, unknown> };

/**
 * Fetch all notes for a user.
 */
export async function fetchNotes(userId: string): Promise<NoteRowWithMetadata[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as NoteRowWithMetadata[];
}

/**
 * Create a note.
 */
export async function createNote(
  userId: string,
  note: Omit<NoteInsert, 'user_id'> & { metadata?: Record<string, unknown> }
): Promise<NoteRowWithMetadata> {
  const { data, error } = await supabase
    .from('notes')
    .insert({ ...note, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data as NoteRowWithMetadata;
}

/**
 * Update a note by ID.
 */
export async function updateNote(
  noteId: string,
  updates: Partial<NoteInsert> & { metadata?: Record<string, unknown> }
): Promise<NoteRowWithMetadata> {
  const { data, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', noteId)
    .select()
    .single();

  if (error) throw error;
  return data as NoteRowWithMetadata;
}

/**
 * Delete a note.
 */
export async function deleteNote(noteId: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', noteId);
  if (error) throw error;
}

/**
 * Subscribe to realtime changes on the notes table for a user.
 * Returns an unsubscribe function. The callback fires on any note change —
 * the caller is expected to refetch.
 */
export function subscribeToNotes(userId: string, callback: () => void): () => void {
  const channel = supabase
    .channel(`rt-notes-user_id=eq.${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notes',
        filter: `user_id=eq.${userId}`,
      },
      () => callback()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
