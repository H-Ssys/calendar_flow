-- Migration: 009_profile_settings
-- Adds JSONB settings column to profiles for CalendarContext settings migration.
-- Stores: categories, dailyTimeConfig, weeklyTimeConfig, monthlyViewConfig,
--         yearlyViewConfig, menuBar, emailNotifications
-- (profileConfig maps to existing profiles columns: display_name, timezone, language, theme)
-- (event-logs skipped — P2, not user-facing)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- RLS note: existing "Own profile" policy (FOR ALL WHERE id = auth.uid())
-- already covers this column — no new policy needed.
