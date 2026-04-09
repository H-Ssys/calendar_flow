/**
 * Ofative Calendar Platform — Typography Design Tokens
 *
 * System font stack with Arial base (matches v1.0 Tailwind defaults).
 * v1.0 root font-size is 14px; the scale below uses pixel values so
 * consumers can convert to rem as needed.
 */

// ---------------------------------------------------------------------------
// Font families
// ---------------------------------------------------------------------------

export const FONT_FAMILY = {
  sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
} as const;

// ---------------------------------------------------------------------------
// Font sizes (px)
// ---------------------------------------------------------------------------

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

// ---------------------------------------------------------------------------
// Font weights
// ---------------------------------------------------------------------------

export const FONT_WEIGHT = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

// ---------------------------------------------------------------------------
// Line heights (unitless multipliers)
// ---------------------------------------------------------------------------

export const LINE_HEIGHT = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
} as const;
