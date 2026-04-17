export const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  en: 'English',
  ja: '日本語',
  zh: '中文',
  ko: '한국어',
  vi: 'Tiếng Việt',
  th: 'ภาษาไทย',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  pt: 'Português',
  ar: 'العربية',
  hi: 'हिन्दी',
  id: 'Indonesia',
  ms: 'Melayu',
  tl: 'Filipino',
};

export function getLanguageDisplayName(code: string): string {
  return LANGUAGE_DISPLAY_NAMES[code] ?? code.toUpperCase();
}
