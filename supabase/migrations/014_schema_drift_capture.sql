-- Migration 014: Capture schema drift — daily_journals and user_settings
-- Both tables were created outside the migration workflow (via Studio).
-- This migration documents their schema so git history matches the DB.
-- Tables already exist in production; IF NOT EXISTS guards make this idempotent.

CREATE TABLE IF NOT EXISTS public.daily_journals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journal_date      date NOT NULL,
  yearly_goal       text,
  monthly_goal      text,
  daily_goal        text,
  daily_result      text,
  gratitude         text,
  standardize       text,
  not_good          text,
  improvements      text,
  self_encouragement text,
  notes             text,
  time_slots        jsonb,
  urgent_tasks      jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, journal_date)
);

ALTER TABLE public.daily_journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_journals_user ON public.daily_journals
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.user_settings (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  language                text,
  timezone                text,
  date_format             text,
  time_format             text,
  week_starts_on          integer DEFAULT 1,
  default_view            text DEFAULT 'week',
  default_event_duration  integer DEFAULT 60,
  show_weekends           boolean DEFAULT true,
  show_week_numbers       boolean DEFAULT false,
  work_start_time         time DEFAULT '09:00',
  work_end_time           time DEFAULT '18:00',
  work_days               text[],
  focus_duration          integer DEFAULT 25,
  break_duration          integer DEFAULT 5,
  long_break_duration     integer DEFAULT 15,
  color_rules             jsonb,
  flexible_events         jsonb,
  default_conference_type text,
  conference_links        jsonb,
  scheduling_links        jsonb,
  rooms                   jsonb,
  email_reminders         boolean DEFAULT true,
  email_digest            text DEFAULT 'daily',
  menu_bar_items          jsonb,
  theme                   text DEFAULT 'system',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_settings_user ON public.user_settings
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
