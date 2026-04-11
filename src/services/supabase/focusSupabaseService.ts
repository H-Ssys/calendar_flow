import { supabase } from '@ofative/supabase-client';
import type { FocusTimerState } from '@/hooks/useFocusTimer';

/**
 * v2 focus_sessions row shape (mirrors migration 004 + 012).
 * shared-types doesn't yet model this table, so we declare locally.
 *
 * Strategy: persist the live timer as a single "current" focus_sessions row
 * per user. The row stores liveState in the metadata JSONB column. On phase
 * complete, we set ended_at + completed=true and start a new row.
 */
export interface FocusSessionRow {
  id: string;
  user_id: string;
  task_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  session_type: 'focus' | 'short_break' | 'long_break';
  completed: boolean;
  created_at: string;
  metadata: Record<string, unknown>; // FocusTimerState
}

export interface FocusSessionInsert {
  id?: string;
  user_id: string;
  task_id?: string | null;
  started_at?: string;
  ended_at?: string | null;
  duration_minutes?: number | null;
  session_type?: 'focus' | 'short_break' | 'long_break';
  completed?: boolean;
  metadata?: Record<string, unknown>;
}

// ── Helpers ──────────────────────────────────────────────────────────

function v1PhaseToV2SessionType(phase: 'work' | 'break'): 'focus' | 'short_break' {
  return phase === 'work' ? 'focus' : 'short_break';
}

// ── Service functions ────────────────────────────────────────────────

/**
 * Fetch the latest focus session for a user (any state). Used to restore the
 * live timer state on mount.
 */
export async function fetchFocusState(userId: string): Promise<FocusSessionRow | null> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as FocusSessionRow | null) ?? null;
}

/**
 * Persist live timer state. If `existingId` is provided we UPDATE that row;
 * otherwise we INSERT a new row and return the new ID.
 */
export async function saveFocusState(
  userId: string,
  state: FocusTimerState,
  existingId: string | null
): Promise<FocusSessionRow> {
  const payload: FocusSessionInsert = {
    user_id: userId,
    task_id: null, // task_id requires UUID — v1 task IDs aren't UUIDs (P1)
    session_type: v1PhaseToV2SessionType(state.currentPhase),
    completed: false,
    metadata: {
      isActive: state.isActive,
      isPaused: state.isPaused,
      timeRemaining: state.timeRemaining,
      currentPhase: state.currentPhase,
      sessionsCompleted: state.sessionsCompleted,
      activeTaskId: state.activeTaskId,
    },
  };

  if (existingId) {
    const { data, error } = await supabase
      .from('focus_sessions')
      .update(payload)
      .eq('id', existingId)
      .select()
      .single();
    if (error) throw error;
    return data as FocusSessionRow;
  }

  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({ ...payload, started_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data as FocusSessionRow;
}

/** Fetch all completed focus sessions (history/analytics). */
export async function fetchFocusHistory(userId: string): Promise<FocusSessionRow[]> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', true)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return (data as FocusSessionRow[]) ?? [];
}

/**
 * Map a v2 row's metadata blob back to a v1 FocusTimerState.
 * Safe defaults applied if any field is missing.
 */
export function metadataToFocusState(
  meta: Record<string, unknown>,
  fallback: FocusTimerState
): FocusTimerState {
  return {
    isActive: typeof meta.isActive === 'boolean' ? meta.isActive : fallback.isActive,
    isPaused: typeof meta.isPaused === 'boolean' ? meta.isPaused : fallback.isPaused,
    timeRemaining: typeof meta.timeRemaining === 'number' ? meta.timeRemaining : fallback.timeRemaining,
    currentPhase: meta.currentPhase === 'break' ? 'break' : 'work',
    sessionsCompleted: typeof meta.sessionsCompleted === 'number' ? meta.sessionsCompleted : 0,
    activeTaskId: typeof meta.activeTaskId === 'string' ? meta.activeTaskId : null,
  };
}
