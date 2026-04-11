-- Migration: 012_journal_focus_metadata
-- Adds JSONB metadata column to journal_entries and focus_sessions for
-- v1-specific fields with no v2 equivalent.
--
-- journal_entries.metadata stores: title, timezone, urgentTasks, attachments
-- focus_sessions.metadata stores: isActive, isPaused, timeRemaining,
--                                  currentPhase, sessionsCompleted, activeTaskId

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- RLS note: existing RLS policies cover these columns — no new policy needed.
