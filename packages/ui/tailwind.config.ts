/**
 * Ofative Calendar Platform — Shared Tailwind CSS Configuration
 *
 * Extends the default Tailwind config with Ofative design tokens.
 * Modules import this as a preset in their own tailwind.config.ts:
 *
 *   import ofativePreset from '@ofative/ui/tailwind.config';
 *   export default { presets: [ofativePreset], content: [...] };
 */

import type { Config } from 'tailwindcss';
import { COLORS } from './tokens/colors';
import { FONT_FAMILY, FONT_SIZE, LINE_HEIGHT } from './tokens/typography';
import { SPACING } from './tokens/spacing';
import { SHADOWS } from './tokens/shadows';
import { RADII } from './tokens/radii';

// Build fontSize entries as [size, { lineHeight }] tuples
const fontSize: Record<string, [string, { lineHeight: string }]> = {};
for (const [key, px] of Object.entries(FONT_SIZE)) {
  fontSize[key] = [`${px}px`, { lineHeight: `${LINE_HEIGHT.normal}` }];
}

// Build spacing entries as string px values
const spacing: Record<string, string> = {};
for (const [key, px] of Object.entries(SPACING)) {
  spacing[key] = `${px}px`;
}

const config: Config = {
  content: [], // consumers must provide their own content paths
  theme: {
    extend: {
      colors: {
        primary: COLORS.primary,
        secondary: COLORS.secondary,
        neutral: COLORS.neutral,
        success: COLORS.success,
        warning: COLORS.warning,
        error: COLORS.error,
        info: COLORS.info,
      },
      fontFamily: {
        sans: [FONT_FAMILY.sans],
        mono: [FONT_FAMILY.mono],
      },
      fontSize,
      spacing,
      boxShadow: {
        none: SHADOWS.none,
        sm: SHADOWS.sm,
        md: SHADOWS.md,
        lg: SHADOWS.lg,
      },
      borderRadius: {
        none: RADII.none,
        sm: RADII.sm,
        md: RADII.md,
        lg: RADII.lg,
        xl: RADII.xl,
        full: RADII.full,
      },
    },
  },
  plugins: [],
};

export default config;
