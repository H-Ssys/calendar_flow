/**
 * Daily Journal Service
 *
 * Manages CRUD operations for DailyJournalEntry. Sync API surface backed by
 * either localStorage or a Supabase-hydrated in-memory cache (selected via
 * VITE_USE_SUPABASE feature flag).
 *
 * localStorage mode → key family: `daily-journal-${userId}`
 * Supabase mode     → table: journal_entries (one row per user+date)
 *
 * The sync API is preserved so existing callers (useDailyJournal hook,
 * DailyJournalView component) work unchanged. In Supabase mode the cache is
 * hydrated lazily on first access; callers can subscribe via
 * `subscribeToJournal(userId, cb)` to be notified when fresh data lands.
 */

import { DailyJournalEntry, JournalGoals, JournalReflections, TimeSlot } from '@/types/dailyJournal';
import { format, subDays } from 'date-fns';
import { TimeConfig } from '@/context/CalendarContext';
import * as journalSupabaseService from '@/services/supabase/journalSupabaseService';

// ── Feature flag ─────────────────────────────────────────────────────
const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';

const STORAGE_KEY = 'daily-journal';

// ── In-memory cache (used by both modes for sync reads) ──────────────
const cacheByUser: Map<string, Map<string, DailyJournalEntry>> = new Map();
const hydratedUsers: Set<string> = new Set();
const hydrationInFlight: Map<string, Promise<void>> = new Map();
const subscribersByUser: Map<string, Set<() => void>> = new Map();

function getCache(userId: string): Map<string, DailyJournalEntry> {
  let m = cacheByUser.get(userId);
  if (!m) {
    m = new Map();
    cacheByUser.set(userId, m);
  }
  return m;
}

function notifySubscribers(userId: string): void {
  const subs = subscribersByUser.get(userId);
  if (!subs) return;
  subs.forEach((cb) => {
    try { cb(); } catch (err) { console.error('[dailyJournalService] subscriber threw:', err); }
  });
}

/** Subscribe to cache updates for a user. Returns an unsubscribe function. */
export function subscribeToJournal(userId: string, callback: () => void): () => void {
  let subs = subscribersByUser.get(userId);
  if (!subs) {
    subs = new Set();
    subscribersByUser.set(userId, subs);
  }
  subs.add(callback);
  return () => {
    subs?.delete(callback);
  };
}

// ── Hydration (Supabase mode only) ──────────────────────────────────
async function hydrateUser(userId: string): Promise<void> {
  if (!USE_SUPABASE) return;
  if (hydratedUsers.has(userId)) return;
  const existing = hydrationInFlight.get(userId);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const rows = await journalSupabaseService.fetchAllEntries(userId);
      const m = getCache(userId);
      m.clear();
      for (const row of rows) {
        const v1 = journalSupabaseService.mapV2ToV1(row, userId);
        m.set(row.date, v1);
      }
      hydratedUsers.add(userId);
      notifySubscribers(userId);
    } catch (err) {
      console.error('[dailyJournalService] Failed to hydrate from Supabase:', err);
    } finally {
      hydrationInFlight.delete(userId);
    }
  })();

  hydrationInFlight.set(userId, promise);
  return promise;
}

// ── localStorage helpers (legacy mode) ──────────────────────────────
const getUserStorageKey = (userId: string = 'default-user') => `${STORAGE_KEY}-${userId}`;

const loadAllEntriesLocal = (userId: string = 'default-user'): Map<string, DailyJournalEntry> => {
  try {
    const key = getUserStorageKey(userId);
    const data = localStorage.getItem(key);
    if (!data) return new Map();
    const parsed = JSON.parse(data);
    return new Map(Object.entries(parsed));
  } catch (error) {
    console.error('Failed to load journal entries:', error);
    return new Map();
  }
};

const saveAllEntriesLocal = (entries: Map<string, DailyJournalEntry>, userId: string = 'default-user'): void => {
  try {
    const key = getUserStorageKey(userId);
    const obj = Object.fromEntries(entries);
    localStorage.setItem(key, JSON.stringify(obj));
  } catch (error) {
    console.error('Failed to save journal entries:', error);
  }
};

/**
 * Load entries for a user from the active backend into the cache.
 * In localStorage mode this is sync (and runs every call). In Supabase mode
 * this is a no-op (hydration happens via hydrateUser).
 */
function loadAllEntries(userId: string): Map<string, DailyJournalEntry> {
  if (USE_SUPABASE) {
    // Trigger lazy hydration; return whatever is in the cache right now.
    hydrateUser(userId);
    return getCache(userId);
  }
  // localStorage path: replace cache contents from disk every read
  const fromDisk = loadAllEntriesLocal(userId);
  cacheByUser.set(userId, fromDisk);
  return fromDisk;
}

// ── Time slot helpers ───────────────────────────────────────────────
const generateTimeSlots = (dateKey: string, timeConfig: TimeConfig): TimeSlot[] => {
  const { startHour, endHour, hourInterval } = timeConfig;
  const numSlots = Math.floor((endHour - startHour) / hourInterval);

  return Array.from({ length: numSlots }, (_, i) => {
    const hour = startHour + (i * hourInterval);
    const nextHour = hour + hourInterval;

    return {
      id: `slot-${dateKey}-${i}`,
      startTime: `${hour.toString().padStart(2, '0')}:00`,
      endTime: `${nextHour.toString().padStart(2, '0')}:00`,
      planText: '',
      actualText: '',
      done: false,
      deadline: '',
      linkedEventIds: [],
      linkedTaskIds: [],
    };
  });
};

// ── Public API (sync, dual-mode) ─────────────────────────────────────

/** Get journal entry by date. */
export const getJournalByDate = (
  date: Date,
  userId: string = 'default-user',
  timeConfig?: TimeConfig
): DailyJournalEntry | null => {
  const dateKey = format(date, 'yyyy-MM-dd');
  const entries = loadAllEntries(userId);
  const entry = entries.get(dateKey);

  if (entry) {
    // Migration: ensure urgentTasks exists for old entries
    if (!entry.urgentTasks) {
      entry.urgentTasks = [];
    }

    // Migration: regenerate time slots if timeConfig changes
    if (timeConfig && entry.timeSlots.length > 0) {
      const firstSlot = entry.timeSlots[0];
      const lastSlot = entry.timeSlots[entry.timeSlots.length - 1];

      const currentStartHour = parseInt(firstSlot.startTime.split(':')[0], 10);
      const currentEndHour = parseInt(lastSlot.endTime.split(':')[0], 10);
      const currentInterval = entry.timeSlots.length > 1
        ? parseInt(entry.timeSlots[1].startTime.split(':')[0], 10) - currentStartHour
        : 1;

      if (currentStartHour !== timeConfig.startHour ||
          currentEndHour !== timeConfig.endHour ||
          currentInterval !== timeConfig.hourInterval) {
        const newSlots = generateTimeSlots(dateKey, timeConfig);
        entry.timeSlots = newSlots.map(newSlot => {
          const existingSlot = entry.timeSlots.find(s => s.startTime === newSlot.startTime);
          return existingSlot || newSlot;
        });
      }
    }
  }

  return entry || null;
};

/** Create or update journal entry. */
export const upsertJournal = (
  entry: Partial<DailyJournalEntry>,
  date: Date,
  userId: string = 'default-user',
  timeConfig?: TimeConfig
): DailyJournalEntry => {
  const dateKey = format(date, 'yyyy-MM-dd');
  const entries = loadAllEntries(userId);

  const existingEntry = entries.get(dateKey);
  const now = new Date();

  const defaultTimeConfig: TimeConfig = timeConfig || { startHour: 6, endHour: 22, hourInterval: 2 };
  const defaultSlots = existingEntry?.timeSlots || generateTimeSlots(dateKey, defaultTimeConfig);

  const updatedEntry: DailyJournalEntry = {
    id: existingEntry?.id || `journal-${dateKey}-${Date.now()}`,
    userId,
    date: dateKey,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    title: entry.title ?? existingEntry?.title ?? '',
    timeSlots: entry.timeSlots ?? defaultSlots,
    urgentTasks: entry.urgentTasks ?? existingEntry?.urgentTasks ?? [],
    goals: entry.goals ?? existingEntry?.goals ?? {
      yearlyGoalText: '',
      monthlyGoalText: '',
      dailyGoalText: '',
      dailyGoalResult: '',
    },
    reflections: entry.reflections ?? existingEntry?.reflections ?? {
      gratitudeGood: '',
      standardizeRules: '',
      notGood: '',
      improvements: '',
      selfEncouragement: '',
      notes: '',
    },
    attachments: entry.attachments ?? existingEntry?.attachments ?? [],
    createdAt: existingEntry?.createdAt || now,
    updatedAt: now,
  };

  // Always update the cache so the next sync read sees fresh data
  entries.set(dateKey, updatedEntry);

  if (USE_SUPABASE) {
    // Fire-and-forget upsert. On error we keep optimistic cache state.
    journalSupabaseService
      .upsertEntry(userId, journalSupabaseService.mapV1ToV2(updatedEntry, userId))
      .then((row) => {
        // Re-map the canonical row back into the cache (preserves server id)
        const v1 = journalSupabaseService.mapV2ToV1(row, userId);
        getCache(userId).set(dateKey, v1);
        notifySubscribers(userId);
      })
      .catch((err) => {
        console.error('[dailyJournalService] Supabase upsertEntry failed:', err);
      });
  } else {
    saveAllEntriesLocal(entries, userId);
  }

  notifySubscribers(userId);
  return updatedEntry;
};

/** Copy plan from previous day. */
export const copyPlanFromPreviousDay = (
  currentDate: Date,
  userId: string = 'default-user'
): DailyJournalEntry | null => {
  const previousDate = subDays(currentDate, 1);
  const previousEntry = getJournalByDate(previousDate, userId);

  if (!previousEntry) return null;

  const copiedTimeSlots = previousEntry.timeSlots.map((slot, idx) => ({
    id: `slot-${format(currentDate, 'yyyy-MM-dd')}-${idx}`,
    startTime: slot.startTime,
    endTime: slot.endTime,
    planText: slot.planText,
    actualText: '',
    done: false,
    interleavedText: '',
    urgentText: '',
    deadline: '',
    linkedEventIds: [],
    linkedTaskIds: [],
  }));

  return upsertJournal({
    timeSlots: copiedTimeSlots,
    title: previousEntry.title || '',
  }, currentDate, userId);
};

/** Delete journal entry. */
export const deleteJournal = (date: Date, userId: string = 'default-user'): void => {
  const dateKey = format(date, 'yyyy-MM-dd');
  const entries = loadAllEntries(userId);
  const existing = entries.get(dateKey);
  entries.delete(dateKey);

  if (USE_SUPABASE) {
    if (existing?.id) {
      journalSupabaseService.deleteEntry(existing.id).catch((err) => {
        console.error('[dailyJournalService] Supabase deleteEntry failed:', err);
      });
    }
  } else {
    saveAllEntriesLocal(entries, userId);
  }

  notifySubscribers(userId);
};

/** Get all journal entries (export/analytics). */
export const getAllJournals = (userId: string = 'default-user'): DailyJournalEntry[] => {
  const entries = loadAllEntries(userId);
  return Array.from(entries.values()).sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};
