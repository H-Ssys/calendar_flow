// ─── Social Platform Definitions ─────────────────────────────────────────────
// Canonical list of social platforms with branding colors.
// Used by SocialPlatforms component and any social-related UI.

export interface SocialPlatformDef {
  /** Lookup key — lowercase, matches contacts.socials[].platform */
  key: string;
  /** Human-readable name */
  name: string;
  /** 2-letter abbreviation for icon badge */
  short: string;
  /** Badge background color */
  bg: string;
  /** Badge text color */
  text: string;
}

export const SOCIAL_PLATFORMS: SocialPlatformDef[] = [
  { key: 'linkedin',  name: 'LinkedIn',  short: 'Li', bg: '#E6F1FB', text: '#185FA5' },
  { key: 'twitter',   name: 'Twitter',   short: 'Tw', bg: '#E6F1FB', text: '#185FA5' },
  { key: 'instagram', name: 'Instagram', short: 'Ig', bg: '#FAECE7', text: '#993C1D' },
  { key: 'facebook',  name: 'Facebook',  short: 'Fb', bg: '#E6F1FB', text: '#185FA5' },
  { key: 'whatsapp',  name: 'WhatsApp',  short: 'Wa', bg: '#E1F5EE', text: '#0F6E56' },
  { key: 'telegram',  name: 'Telegram',  short: 'Tg', bg: '#E6F1FB', text: '#185FA5' },
  { key: 'github',    name: 'GitHub',    short: 'Gh', bg: '#F1EFE8', text: '#5F5E5A' },
  { key: 'youtube',   name: 'YouTube',   short: 'Yt', bg: '#FCEBEB', text: '#A32D2D' },
  { key: 'tiktok',    name: 'TikTok',    short: 'Tk', bg: '#F1EFE8', text: '#444441' },
  { key: 'discord',   name: 'Discord',   short: 'Dc', bg: '#EEEDFE', text: '#534AB7' },
  { key: 'slack',     name: 'Slack',     short: 'Sl', bg: '#FAECE7', text: '#993C1D' },
  { key: 'wechat',    name: 'WeChat',    short: 'Wc', bg: '#E1F5EE', text: '#0F6E56' },
  { key: 'line',      name: 'LINE',      short: 'Ln', bg: '#E1F5EE', text: '#0F6E56' },
  { key: 'zalo',      name: 'Zalo',      short: 'Za', bg: '#E6F1FB', text: '#185FA5' },
  { key: 'kakaotalk', name: 'KakaoTalk', short: 'Kt', bg: '#FAEEDA', text: '#854F0B' },
  { key: 'skype',     name: 'Skype',     short: 'Sk', bg: '#E6F1FB', text: '#185FA5' },
];

/** Fallback colors for custom / unknown platforms */
export const CUSTOM_PLATFORM_COLORS = { bg: '#F1EFE8', text: '#5F5E5A' } as const;

/** Look up a platform definition by key, returning custom fallback if not found */
export function getPlatformDef(key: string): SocialPlatformDef {
  const found = SOCIAL_PLATFORMS.find((p) => p.key === key);
  if (found) return found;
  return {
    key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    short: key.slice(0, 2).toUpperCase(),
    bg: CUSTOM_PLATFORM_COLORS.bg,
    text: CUSTOM_PLATFORM_COLORS.text,
  };
}
