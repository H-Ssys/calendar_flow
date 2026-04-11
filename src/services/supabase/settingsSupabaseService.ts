import { supabase } from '@ofative/supabase-client';

/**
 * Shape of the profiles.settings JSONB blob.
 * Each key corresponds to a former localStorage key in CalendarContext.
 */
export interface SettingsBlob {
  categories?: unknown[];
  dailyTimeConfig?: { startHour: number; endHour: number; hourInterval: number };
  weeklyTimeConfig?: { startHour: number; endHour: number; hourInterval: number };
  monthlyViewConfig?: { rowHighlightColor: string };
  yearlyViewConfig?: { monthHighlightColor: string };
  menuBar?: { enabled: boolean; eventPeriod: string };
  emailNotifications?: Record<string, boolean>;
}

/**
 * Profile columns that map to CalendarContext's profileConfig.
 * These are first-class columns on the profiles table, not inside the JSONB.
 */
export interface ProfileColumns {
  display_name?: string | null;
  timezone?: string;
  language?: string;
  theme?: string;
}

/** Fetch settings JSONB + profile columns for the authenticated user. */
export async function fetchSettings(
  userId: string
): Promise<{ settings: SettingsBlob; profile: ProfileColumns }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('settings, display_name, timezone, language, theme')
    .eq('id', userId)
    .single();

  if (error) throw error;

  return {
    settings: (data?.settings as SettingsBlob) ?? {},
    profile: {
      display_name: data?.display_name ?? null,
      timezone: data?.timezone ?? 'UTC',
      language: data?.language ?? 'en',
      theme: data?.theme ?? 'light',
    },
  };
}

/** Update the settings JSONB blob. Merges at the top level. */
export async function updateSettings(
  userId: string,
  settings: SettingsBlob
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ settings })
    .eq('id', userId);

  if (error) throw error;
}

/** Update profile-level columns (display_name, timezone, language, theme). */
export async function updateProfileColumns(
  userId: string,
  columns: ProfileColumns
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(columns)
    .eq('id', userId);

  if (error) throw error;
}
