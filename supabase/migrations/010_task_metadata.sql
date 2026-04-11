-- Migration: 010_task_metadata
-- Adds JSONB metadata column to tasks for v1-specific fields with no v2 equivalent.
-- Stores: linkedEventIds, linkedNoteIds, linkedTaskIds, linkedContactIds,
--         actualResult, lessonsLearned, category, color, order, activityLog
-- Cross-module links can be migrated to linking tables (event_tasks, contact_tasks)
-- in a future milestone.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- RLS note: existing task RLS policies (own + assigned + team) cover this column —
-- no new policy needed.
