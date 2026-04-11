/**
 * One-time localStorage → Supabase migration service.
 *
 * Reads every legacy localStorage key, transforms via existing v1↔v2 type
 * mappers, and writes through the existing Supabase service layer. Each step
 * is wrapped in try/catch — partial success is acceptable.
 *
 * On success, sets `supabase-migrated-${userId}` in localStorage so the
 * banner doesn't reappear.
 */

import type { Event } from '@/context/CalendarContext';
import type { Task } from '@/types/task';
import type { Note } from '@/types/note';
import type { DailyJournalEntry } from '@/types/dailyJournal';
import type { FocusTimerState } from '@/hooks/useFocusTimer';

import * as eventSupabaseService from '@/services/supabase/eventSupabaseService';
import * as taskSupabaseService from '@/services/supabase/taskSupabaseService';
import * as noteSupabaseService from '@/services/supabase/noteSupabaseService';
import * as journalSupabaseService from '@/services/supabase/journalSupabaseService';
import * as focusSupabaseService from '@/services/supabase/focusSupabaseService';
import * as settingsSupabaseService from '@/services/supabase/settingsSupabaseService';

import { mapV1ToV2 as mapEventV1ToV2 } from '@/utils/eventTypeMapper';
import { mapV1ToV2 as mapTaskV1ToV2 } from '@/utils/taskTypeMapper';
import { mapV1ToV2 as mapNoteV1ToV2 } from '@/utils/noteTypeMapper';

// ── localStorage keys ────────────────────────────────────────────────
const KEY_EVENTS = 'calendar-events';
const KEY_TASKS = 'ofative-tasks';
const KEY_NOTES = 'ofative-notes';
const KEY_FOCUS = 'focus-timer-state';

const KEY_SETTINGS_CATEGORIES = 'settings-categories';
const KEY_SETTINGS_DAILY_TIME = 'settings-daily-time-config';
const KEY_SETTINGS_WEEKLY_TIME = 'settings-weekly-time-config';
const KEY_SETTINGS_MONTHLY_VIEW = 'settings-monthly-view-config';
const KEY_SETTINGS_YEARLY_VIEW = 'settings-yearly-view-config';
const KEY_SETTINGS_MENU_BAR = 'settings-menu-bar';
const KEY_SETTINGS_EMAIL = 'settings-email-notifications';
const KEY_SETTINGS_PROFILE = 'settings-profile';

const ALL_DATA_KEYS = [
  KEY_EVENTS, KEY_TASKS, KEY_NOTES, KEY_FOCUS,
  KEY_SETTINGS_CATEGORIES, KEY_SETTINGS_DAILY_TIME, KEY_SETTINGS_WEEKLY_TIME,
  KEY_SETTINGS_MONTHLY_VIEW, KEY_SETTINGS_YEARLY_VIEW, KEY_SETTINGS_MENU_BAR,
  KEY_SETTINGS_EMAIL, KEY_SETTINGS_PROFILE,
];

const migratedFlagKey = (userId: string) => `supabase-migrated-${userId}`;

// ── Public types ─────────────────────────────────────────────────────
export interface MigrationProgress {
  total: number;
  completed: number;
  current: string;
  errors: string[];
}

export type ProgressCallback = (progress: MigrationProgress) => void;

// ── Utilities ────────────────────────────────────────────────────────
function safeRead<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`[migrationService] Failed to parse ${key}:`, err);
    return null;
  }
}

function reviveEventDates(e: Event): Event {
  return {
    ...e,
    startTime: new Date(e.startTime),
    endTime: new Date(e.endTime),
  };
}

function reviveTaskDates(t: Task): Task {
  return {
    ...t,
    createdAt: new Date(t.createdAt),
    updatedAt: new Date(t.updatedAt),
    dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
    completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
    activityLog: (t.activityLog || []).map((e) => ({ ...e, timestamp: new Date(e.timestamp) })),
  };
}

function reviveNoteDates(n: Note): Note {
  return {
    ...n,
    createdAt: new Date(n.createdAt),
    updatedAt: new Date(n.updatedAt),
    linkedDate: n.linkedDate ? new Date(n.linkedDate) : undefined,
  };
}

function reviveJournalDates(j: DailyJournalEntry): DailyJournalEntry {
  return {
    ...j,
    createdAt: new Date(j.createdAt),
    updatedAt: new Date(j.updatedAt),
  };
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Returns true if there is local data to migrate AND the user hasn't
 * already completed migration.
 */
export function checkMigrationNeeded(userId: string): boolean {
  if (!userId) return false;
  if (localStorage.getItem(migratedFlagKey(userId))) return false;

  const hasAnyData = ALL_DATA_KEYS.some((k) => {
    const v = localStorage.getItem(k);
    if (!v) return false;
    // Treat empty arrays / empty objects as "no data"
    return v !== '[]' && v !== '{}' && v.length > 2;
  });

  if (hasAnyData) return true;

  // Also scan for any daily-journal-* key (one per user)
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('daily-journal-')) {
      const v = localStorage.getItem(k);
      if (v && v !== '{}' && v.length > 2) return true;
    }
  }

  return false;
}

/** Mark a user as migrated so the banner doesn't reappear. */
export function markMigrated(userId: string): void {
  localStorage.setItem(migratedFlagKey(userId), 'true');
}

/** Clear the migration flag (for testing / re-running). */
export function clearMigratedFlag(userId: string): void {
  localStorage.removeItem(migratedFlagKey(userId));
}

/**
 * Migrate all localStorage data to Supabase. Calls `onProgress` after each
 * step so the UI can render a progress bar.
 */
export async function migrateAllData(
  userId: string,
  onProgress?: ProgressCallback
): Promise<MigrationProgress> {
  const progress: MigrationProgress = {
    total: 6, // settings, events, tasks, notes, journal, focus
    completed: 0,
    current: 'Starting migration…',
    errors: [],
  };

  const tick = (current: string) => {
    progress.current = current;
    onProgress?.({ ...progress });
  };

  const finishStep = () => {
    progress.completed += 1;
    onProgress?.({ ...progress });
  };

  // ── Step 1: settings ──────────────────────────────────────────────
  tick('Migrating settings…');
  try {
    const categories = safeRead<unknown[]>(KEY_SETTINGS_CATEGORIES);
    const dailyTimeConfig = safeRead<{ startHour: number; endHour: number; hourInterval: number }>(KEY_SETTINGS_DAILY_TIME);
    const weeklyTimeConfig = safeRead<{ startHour: number; endHour: number; hourInterval: number }>(KEY_SETTINGS_WEEKLY_TIME);
    const monthlyViewConfig = safeRead<{ rowHighlightColor: string }>(KEY_SETTINGS_MONTHLY_VIEW);
    const yearlyViewConfig = safeRead<{ monthHighlightColor: string }>(KEY_SETTINGS_YEARLY_VIEW);
    const menuBar = safeRead<{ enabled: boolean; eventPeriod: string }>(KEY_SETTINGS_MENU_BAR);
    const emailNotifications = safeRead<Record<string, boolean>>(KEY_SETTINGS_EMAIL);

    const blob: Record<string, unknown> = {};
    if (categories) blob.categories = categories;
    if (dailyTimeConfig) blob.dailyTimeConfig = dailyTimeConfig;
    if (weeklyTimeConfig) blob.weeklyTimeConfig = weeklyTimeConfig;
    if (monthlyViewConfig) blob.monthlyViewConfig = monthlyViewConfig;
    if (yearlyViewConfig) blob.yearlyViewConfig = yearlyViewConfig;
    if (menuBar) blob.menuBar = menuBar;
    if (emailNotifications) blob.emailNotifications = emailNotifications;

    if (Object.keys(blob).length > 0) {
      await settingsSupabaseService.updateSettings(userId, blob);
    }

    // settings-profile → first-class profile columns
    const profile = safeRead<{ displayName?: string; timezone?: string; language?: string; theme?: string }>(KEY_SETTINGS_PROFILE);
    if (profile) {
      const cols: Record<string, unknown> = {};
      if (profile.displayName !== undefined) cols.display_name = profile.displayName;
      if (profile.timezone !== undefined) cols.timezone = profile.timezone;
      if (profile.language !== undefined) cols.language = profile.language;
      if (profile.theme !== undefined) cols.theme = profile.theme;
      if (Object.keys(cols).length > 0) {
        await settingsSupabaseService.updateProfileColumns(userId, cols);
      }
    }
  } catch (err) {
    console.error('[migrationService] Settings migration failed:', err);
    progress.errors.push(`Settings: ${(err as Error).message ?? 'unknown error'}`);
  }
  finishStep();

  // ── Step 2: events ────────────────────────────────────────────────
  tick('Migrating events…');
  try {
    const events = safeRead<Event[]>(KEY_EVENTS) ?? [];
    for (const raw of events) {
      const event = reviveEventDates(raw);
      try {
        const v2 = mapEventV1ToV2(event, userId);
        await eventSupabaseService.createEvent(userId, v2);
      } catch (err) {
        console.error('[migrationService] Event migration failed for', event.id, err);
        progress.errors.push(`Event "${event.title}": ${(err as Error).message ?? 'unknown'}`);
      }
    }
  } catch (err) {
    console.error('[migrationService] Events migration failed:', err);
    progress.errors.push(`Events: ${(err as Error).message ?? 'unknown error'}`);
  }
  finishStep();

  // ── Step 3: tasks ─────────────────────────────────────────────────
  tick('Migrating tasks…');
  try {
    const tasks = safeRead<Task[]>(KEY_TASKS) ?? [];
    for (const raw of tasks) {
      const task = reviveTaskDates(raw);
      try {
        const v2Task = mapTaskV1ToV2(task, userId);
        const v2Subtasks = (task.subtasks ?? []).map((s, i) => ({
          id: s.id,
          title: s.title,
          is_completed: s.done,
          sort_order: i,
        }));
        await taskSupabaseService.createTask(userId, v2Task, v2Subtasks);
      } catch (err) {
        console.error('[migrationService] Task migration failed for', task.id, err);
        progress.errors.push(`Task "${task.title}": ${(err as Error).message ?? 'unknown'}`);
      }
    }
  } catch (err) {
    console.error('[migrationService] Tasks migration failed:', err);
    progress.errors.push(`Tasks: ${(err as Error).message ?? 'unknown error'}`);
  }
  finishStep();

  // ── Step 4: notes ─────────────────────────────────────────────────
  tick('Migrating notes…');
  try {
    const notes = safeRead<Note[]>(KEY_NOTES) ?? [];
    for (const raw of notes) {
      const note = reviveNoteDates(raw);
      try {
        const v2 = mapNoteV1ToV2(note, userId);
        await noteSupabaseService.createNote(userId, v2);
      } catch (err) {
        console.error('[migrationService] Note migration failed for', note.id, err);
        progress.errors.push(`Note "${note.title}": ${(err as Error).message ?? 'unknown'}`);
      }
    }
  } catch (err) {
    console.error('[migrationService] Notes migration failed:', err);
    progress.errors.push(`Notes: ${(err as Error).message ?? 'unknown error'}`);
  }
  finishStep();

  // ── Step 5: journal ───────────────────────────────────────────────
  tick('Migrating daily journal…');
  try {
    // Find all daily-journal-* keys (legacy used 'default-user', new code uses real userId)
    const journalKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('daily-journal-')) journalKeys.push(k);
    }

    for (const key of journalKeys) {
      const map = safeRead<Record<string, DailyJournalEntry>>(key);
      if (!map) continue;
      for (const [, raw] of Object.entries(map)) {
        const entry = reviveJournalDates(raw);
        try {
          await journalSupabaseService.upsertEntry(
            userId,
            journalSupabaseService.mapV1ToV2(entry, userId)
          );
        } catch (err) {
          console.error('[migrationService] Journal entry failed for', entry.date, err);
          progress.errors.push(`Journal ${entry.date}: ${(err as Error).message ?? 'unknown'}`);
        }
      }
    }
  } catch (err) {
    console.error('[migrationService] Journal migration failed:', err);
    progress.errors.push(`Journal: ${(err as Error).message ?? 'unknown error'}`);
  }
  finishStep();

  // ── Step 6: focus timer ───────────────────────────────────────────
  tick('Migrating focus timer…');
  try {
    const focus = safeRead<FocusTimerState>(KEY_FOCUS);
    if (focus) {
      await focusSupabaseService.saveFocusState(userId, focus, null);
    }
  } catch (err) {
    console.error('[migrationService] Focus timer migration failed:', err);
    progress.errors.push(`Focus timer: ${(err as Error).message ?? 'unknown error'}`);
  }
  finishStep();

  // Done
  markMigrated(userId);
  progress.current = progress.errors.length > 0
    ? `Migration finished with ${progress.errors.length} error(s)`
    : 'Migration complete';
  onProgress?.({ ...progress });

  return progress;
}
