import { supabase } from '@ofative/supabase-client';
import type { EventRow, EventInsert } from '@ofative/shared-types';

/** Fetch all events for a user, ordered by start_time ascending. */
export async function fetchEvents(userId: string): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Insert a new event. Returns the created row. */
export async function createEvent(
  userId: string,
  event: Omit<EventInsert, 'user_id'>
): Promise<EventRow> {
  const { data, error } = await supabase
    .from('events')
    .insert({ ...event, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Update an existing event by ID. Returns the updated row. */
export async function updateEvent(
  eventId: string,
  updates: Partial<EventInsert>
): Promise<EventRow> {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Delete an event by ID. */
export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
}

/**
 * Subscribe to realtime changes on the events table for a user.
 * Returns an unsubscribe function.
 */
export function subscribeToEvents(
  userId: string,
  callback: (payload: { eventType: string; new: EventRow | null; old: Partial<EventRow> | null }) => void
): () => void {
  const channel = supabase
    .channel(`rt-events-user_id=eq.${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'events',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: (payload.new as EventRow) ?? null,
          old: (payload.old as Partial<EventRow>) ?? null,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
