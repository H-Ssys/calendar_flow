import { supabase } from '@ofative/supabase-client';
import type { DailyJournalEntry, TimeSlot, UrgentTask, JournalReflections } from '@/types/dailyJournal';

/**
 * v2 journal_entries row shape (mirrors migration 003 + 012).
 * shared-types doesn't yet model this table, so we declare locally.
 */
export interface JournalEntryRow {
  id: string;
  user_id: string;
  date: string; // 'YYYY-MM-DD'
  yearly_goal: string | null;
  monthly_goal: string | null;
  daily_goal: string | null;
  daily_result: string | null;
  slots: unknown; // JSONB — stored as TimeSlot[]
  reflections: unknown; // JSONB — stored as JournalReflections
  metadata: Record<string, unknown>; // {title, timezone, urgentTasks, attachments}
  created_at: string;
  updated_at: string;
}

export interface JournalEntryInsert {
  id?: string;
  user_id: string;
  date: string;
  yearly_goal?: string | null;
  monthly_goal?: string | null;
  daily_goal?: string | null;
  daily_result?: string | null;
  slots?: unknown;
  reflections?: unknown;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

// ── Mappers ──────────────────────────────────────────────────────────

export function mapV1ToV2(entry: DailyJournalEntry, userId: string): JournalEntryInsert {
  return {
    user_id: userId,
    date: entry.date,
    yearly_goal: entry.goals.yearlyGoalText || null,
    monthly_goal: entry.goals.monthlyGoalText || null,
    daily_goal: entry.goals.dailyGoalText || null,
    daily_result: entry.goals.dailyGoalResult || null,
    slots: entry.timeSlots ?? [],
    reflections: entry.reflections ?? {},
    metadata: {
      title: entry.title || '',
      timezone: entry.timezone || '',
      urgentTasks: entry.urgentTasks ?? [],
      attachments: entry.attachments ?? [],
    },
    created_at: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : entry.createdAt,
    updated_at: entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : entry.updatedAt,
  };
}

export function mapV2ToV1(row: JournalEntryRow, userId: string): DailyJournalEntry {
  const meta = row.metadata ?? {};
  const slots = (row.slots as TimeSlot[]) ?? [];
  const reflections = (row.reflections as JournalReflections) ?? {
    gratitudeGood: '',
    standardizeRules: '',
    notGood: '',
    improvements: '',
    selfEncouragement: '',
    notes: '',
  };
  return {
    id: row.id,
    userId,
    date: row.date,
    timezone: (meta.timezone as string) ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    title: (meta.title as string) ?? '',
    timeSlots: slots,
    urgentTasks: ((meta.urgentTasks as UrgentTask[]) ?? []),
    goals: {
      yearlyGoalText: row.yearly_goal ?? '',
      monthlyGoalText: row.monthly_goal ?? '',
      dailyGoalText: row.daily_goal ?? '',
      dailyGoalResult: row.daily_result ?? '',
    },
    reflections,
    attachments: (meta.attachments as DailyJournalEntry['attachments']) ?? [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ── Service functions ────────────────────────────────────────────────

/** Fetch a single journal entry for a specific date. */
export async function fetchEntry(userId: string, date: string): Promise<JournalEntryRow | null> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (error) throw error;
  return (data as JournalEntryRow | null) ?? null;
}

/** Fetch all journal entries for a user (used to hydrate the cache). */
export async function fetchAllEntries(userId: string): Promise<JournalEntryRow[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data as JournalEntryRow[]) ?? [];
}

/** Fetch entries within an inclusive date range (YYYY-MM-DD). */
export async function fetchEntriesByRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<JournalEntryRow[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data as JournalEntryRow[]) ?? [];
}

/**
 * Upsert a journal entry by (user_id, date).
 * Uses Postgres ON CONFLICT (user_id, date) DO UPDATE via Supabase upsert.
 */
export async function upsertEntry(
  userId: string,
  insert: JournalEntryInsert
): Promise<JournalEntryRow> {
  const { data, error } = await supabase
    .from('journal_entries')
    .upsert({ ...insert, user_id: userId }, { onConflict: 'user_id,date' })
    .select()
    .single();

  if (error) throw error;
  return data as JournalEntryRow;
}

/** Update a journal entry by ID. */
export async function updateEntry(
  entryId: string,
  updates: Partial<JournalEntryInsert>
): Promise<JournalEntryRow> {
  const { data, error } = await supabase
    .from('journal_entries')
    .update(updates)
    .eq('id', entryId)
    .select()
    .single();

  if (error) throw error;
  return data as JournalEntryRow;
}

/** Delete a journal entry by ID. */
export async function deleteEntry(entryId: string): Promise<void> {
  const { error } = await supabase.from('journal_entries').delete().eq('id', entryId);
  if (error) throw error;
}
