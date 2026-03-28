-- Migration: 003_journal_tasks
-- Tables: journal_entries, task_activity, subtasks, recurring_event_occurrences

-- =============================================
-- JOURNAL ENTRIES (Daily PDCA journal)
-- =============================================
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  yearly_goal TEXT,
  monthly_goal TEXT,
  daily_goal TEXT,
  daily_result TEXT,
  slots JSONB DEFAULT '[]',      -- [{hour, plan, actual, outcome}]
  reflections JSONB DEFAULT '{}', -- {gratitude, standardize, not_good, improvements, encouragement, notes}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TASK ACTIVITY LOG (per-task timeline)
-- =============================================
CREATE TABLE IF NOT EXISTS public.task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,  -- 'created','status_changed','assigned','comment','completed'
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SUBTASKS (nested task items)
-- =============================================
CREATE TABLE IF NOT EXISTS public.subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RECURRING EVENT OCCURRENCES (server-side expansion)
-- =============================================
CREATE TABLE IF NOT EXISTS public.recurring_event_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  occurrence_date DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_cancelled BOOLEAN DEFAULT FALSE,
  override_data JSONB,  -- title/description overrides for this occurrence
  UNIQUE(event_id, occurrence_date)
);

ALTER TABLE public.recurring_event_occurrences ENABLE ROW LEVEL SECURITY;
