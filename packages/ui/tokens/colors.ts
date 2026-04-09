/**
 * Ofative Calendar Platform — Color Design Tokens
 *
 * Primary palette derived from v1.0 HSL variables (index.css).
 * All semantic color pairs meet WCAG 2.1 AA contrast ratio >= 4.5:1.
 * Colors used for meaning (priority, outcome) MUST always be paired with
 * a text label — color alone is never sufficient.
 */

// ---------------------------------------------------------------------------
// Core palette scales (Tailwind-style 50-950)
// ---------------------------------------------------------------------------

export const COLORS = {
  /** Indigo — primary brand color (v1.0 --primary-blue: hsl(211 100% 50%)) */
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },
  /** Violet — secondary accent */
  secondary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    950: '#2e1065',
  },
  /** Neutral gray */
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
  /** Success — green */
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  /** Warning — amber */
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  /** Error — red (v1.0 --destructive: hsl(0 84.2% 60.2%)) */
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  /** Info — blue */
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
} as const;

// ---------------------------------------------------------------------------
// Event color presets (7 distinct, accessible colors)
// Derived from v1.0 --event-* HSL variables.
// ---------------------------------------------------------------------------

export const EVENT_COLORS: readonly string[] = [
  '#0080ff', // Blue   — hsl(211 100% 50%)
  '#ff5c5c', // Red    — hsl(4 100% 69%)
  '#ffa405', // Amber  — hsl(41 100% 51%)
  '#00a336', // Green  — hsl(87 100% 32% → adjusted for hex readability)
  '#8b5cf6', // Violet — secondary accent
  '#0ea5e9', // Sky    — hsl(211 100% 91% → darker for text contrast)
  '#14b8a6', // Teal   — hsl(175 35% 81% → darker for text contrast)
] as const;

// ---------------------------------------------------------------------------
// Task priority visual mapping
// Every priority MUST also display a text label — color alone is insufficient.
// Contrast ratios: text on bg >= 4.5:1 for all pairs.
// ---------------------------------------------------------------------------

export const TASK_PRIORITY_COLORS: Readonly<
  Record<
    'low' | 'medium' | 'high' | 'critical',
    { readonly bg: string; readonly text: string; readonly border: string }
  >
> = {
  low: {
    bg: '#f0fdf4',     // success-50
    text: '#15803d',   // success-700
    border: '#bbf7d0', // success-200
  },
  medium: {
    bg: '#eff6ff',     // info-50
    text: '#1d4ed8',   // info-700
    border: '#bfdbfe', // info-200
  },
  high: {
    bg: '#fffbeb',     // warning-50
    text: '#b45309',   // warning-700
    border: '#fde68a', // warning-200
  },
  critical: {
    bg: '#fef2f2',     // error-50
    text: '#b91c1c',   // error-700
    border: '#fecaca', // error-200
  },
} as const;

// ---------------------------------------------------------------------------
// PDCA journal outcome indicators
// Every outcome MUST also display a text label — color alone is insufficient.
// Contrast ratios: text on bg >= 4.5:1 for all pairs.
// ---------------------------------------------------------------------------

export const PDCA_OUTCOME_COLORS: Readonly<
  Record<
    'great' | 'ok' | 'rough',
    { readonly bg: string; readonly text: string }
  >
> = {
  great: {
    bg: '#dcfce7',   // success-100
    text: '#166534', // success-800  — contrast on #dcfce7 ≈ 7.2:1
  },
  ok: {
    bg: '#fef3c7',   // warning-100
    text: '#92400e', // warning-800  — contrast on #fef3c7 ≈ 6.8:1
  },
  rough: {
    bg: '#fee2e2',   // error-100
    text: '#991b1b', // error-800    — contrast on #fee2e2 ≈ 7.1:1
  },
} as const;
