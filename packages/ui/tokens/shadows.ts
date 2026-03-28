/**
 * Ofative Calendar Platform — Shadow Design Tokens
 *
 * Box-shadow presets for elevation hierarchy.
 */

export const SHADOWS = {
  /** No shadow */
  none: 'none',
  /** Subtle shadow for cards and contained surfaces */
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  /** Medium shadow for dropdowns, popovers, and tooltips */
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  /** Large shadow for modals and dialogs */
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
} as const;
