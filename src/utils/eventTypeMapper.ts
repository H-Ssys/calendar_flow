/**
 * Maps between v1 CalendarEvent (CalendarContext) and v2 EventRow (Supabase).
 *
 * Field mapping reference:
 *
 * v1 Event (CalendarContext)       v2 EventRow (Supabase events table)
 * ─────────────────────────────    ────────────────────────────────────
 * id: string                  →   id: string (UUID)
 * title: string               →   title: string
 * startTime: Date             →   start_time: string (ISO 8601)
 * endTime: Date               →   end_time: string (ISO 8601)
 * isAllDay: boolean           →   all_day: boolean
 * color?: string              →   color: string (default '#3b82f6')
 * description?: string        →   description: string | null
 * recurrence?: string         →   recurrence_rule: string | null
 * location?: string           →   location: string | null
 *
 * --- v1 fields with NO v2 column (dropped on write, defaulted on read) ---
 * emoji: string               →   (not in v2 — dropped)
 * category?: string           →   (not in v2 — dropped)
 * participants?: array        →   (v2 uses event_participants table — not mapped here)
 * videoCallLink?: string      →   (not in v2 — dropped)
 *
 * --- v2 fields with NO v1 equivalent (set by service layer) ---
 *                             ←   user_id: string (from auth)
 *                             ←   team_id: string | null
 *                             ←   shared_calendar_id: string | null
 *                             ←   created_by: string | null
 *                             ←   visibility: Visibility (default 'private')
 *                             ←   created_at: string
 *                             ←   updated_at: string
 */

import type { Event } from '@/context/CalendarContext';
import type { EventRow, EventInsert } from '@ofative/shared-types';

/**
 * Convert a v1 CalendarEvent to a v2 EventInsert (for Supabase writes).
 * Caller must supply user_id separately.
 */
export function mapV1ToV2(event: Omit<Event, 'id'> & { id?: string }, userId: string): EventInsert {
  return {
    // id is optional on insert — Supabase generates UUID if omitted
    ...(event.id ? { id: event.id } : {}),
    user_id: userId,
    title: event.title,
    // v1 stores Date objects, v2 stores ISO strings
    start_time: event.startTime instanceof Date
      ? event.startTime.toISOString()
      : String(event.startTime),
    end_time: event.endTime instanceof Date
      ? event.endTime.toISOString()
      : String(event.endTime),
    all_day: event.isAllDay ?? false,
    color: event.color ?? '#3b82f6',
    description: event.description ?? null,
    // v1 'recurrence' maps to v2 'recurrence_rule'
    recurrence_rule: event.recurrence ?? null,
    location: event.location ?? null,
    // v2-only fields — sensible defaults for personal events
    visibility: 'private',
    // emoji, category, participants, videoCallLink are NOT in v2 schema — dropped
  };
}

/**
 * Convert a v2 EventRow (from Supabase) to a v1 CalendarEvent.
 * Fields without v2 columns get safe defaults.
 */
export function mapV2ToV1(row: EventRow): Event {
  return {
    id: row.id,
    title: row.title,
    // v2 stores ISO strings, v1 expects Date objects
    startTime: new Date(row.start_time),
    endTime: new Date(row.end_time),
    isAllDay: row.all_day,
    color: row.color,
    description: row.description ?? undefined,
    // v2 'recurrence_rule' maps to v1 'recurrence'
    recurrence: row.recurrence_rule ?? undefined,
    location: row.location ?? undefined,
    // Fields not in v2 — safe defaults
    emoji: '',             // no emoji column in v2
    // category, participants, videoCallLink are undefined (optional in v1)
  };
}

/**
 * Convert a partial v1 update to a partial v2 update.
 * Only includes fields that are present in the updates object.
 */
export function mapV1UpdateToV2(updates: Partial<Event>): Partial<EventInsert> {
  const v2: Partial<EventInsert> = {};

  if (updates.title !== undefined) v2.title = updates.title;
  if (updates.startTime !== undefined) {
    v2.start_time = updates.startTime instanceof Date
      ? updates.startTime.toISOString()
      : String(updates.startTime);
  }
  if (updates.endTime !== undefined) {
    v2.end_time = updates.endTime instanceof Date
      ? updates.endTime.toISOString()
      : String(updates.endTime);
  }
  if (updates.isAllDay !== undefined) v2.all_day = updates.isAllDay;
  if (updates.color !== undefined) v2.color = updates.color ?? '#3b82f6';
  if (updates.description !== undefined) v2.description = updates.description ?? null;
  if (updates.recurrence !== undefined) v2.recurrence_rule = updates.recurrence ?? null;
  if (updates.location !== undefined) v2.location = updates.location ?? null;

  return v2;
}
