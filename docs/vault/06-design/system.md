---
type: reference
category: design-system
updated: 2026-04-11
source: packages/ui/tokens/
---

# Design System — Token Reference

Authoritative design token values from `@ofative/ui` (`packages/ui/tokens/`).
Import via: `import { COLORS, SPACING, ... } from '@ofative/ui/tokens'`
Tailwind preset: `import ofativePreset from '@ofative/ui/tailwind.config'`

---

## Colors

### Primary (Indigo) — Brand color
| Token | Hex |
|-------|-----|
| primary-50 | `#eef2ff` |
| primary-100 | `#e0e7ff` |
| primary-200 | `#c7d2fe` |
| primary-300 | `#a5b4fc` |
| primary-400 | `#818cf8` |
| primary-500 | `#6366f1` |
| primary-600 | `#4f46e5` |
| primary-700 | `#4338ca` |
| primary-800 | `#3730a3` |
| primary-900 | `#312e81` |
| primary-950 | `#1e1b4b` |

### Secondary (Violet) — Accent
| Token | Hex |
|-------|-----|
| secondary-50 | `#f5f3ff` |
| secondary-100 | `#ede9fe` |
| secondary-200 | `#ddd6fe` |
| secondary-300 | `#c4b5fd` |
| secondary-400 | `#a78bfa` |
| secondary-500 | `#8b5cf6` |
| secondary-600 | `#7c3aed` |
| secondary-700 | `#6d28d9` |
| secondary-800 | `#5b21b6` |
| secondary-900 | `#4c1d95` |
| secondary-950 | `#2e1065` |

### Neutral (Gray)
| Token | Hex |
|-------|-----|
| neutral-50 | `#fafafa` |
| neutral-100 | `#f5f5f5` |
| neutral-200 | `#e5e5e5` |
| neutral-300 | `#d4d4d4` |
| neutral-400 | `#a3a3a3` |
| neutral-500 | `#737373` |
| neutral-600 | `#525252` |
| neutral-700 | `#404040` |
| neutral-800 | `#262626` |
| neutral-900 | `#171717` |
| neutral-950 | `#0a0a0a` |

### Semantic Colors
| Scale | 50 | 500 | 700 | 900 |
|-------|-----|-----|-----|-----|
| **Success** (green) | `#f0fdf4` | `#22c55e` | `#15803d` | `#14532d` |
| **Warning** (amber) | `#fffbeb` | `#f59e0b` | `#b45309` | `#78350f` |
| **Error** (red) | `#fef2f2` | `#ef4444` | `#b91c1c` | `#7f1d1d` |
| **Info** (blue) | `#eff6ff` | `#3b82f6` | `#1d4ed8` | `#1e3a8a` |

### Event Color Presets (7 accessible)
| # | Color | Hex |
|---|-------|-----|
| 1 | Blue | `#0080ff` |
| 2 | Red | `#ff5c5c` |
| 3 | Amber | `#ffa405` |
| 4 | Green | `#00a336` |
| 5 | Violet | `#8b5cf6` |
| 6 | Sky | `#0ea5e9` |
| 7 | Teal | `#14b8a6` |

### Task Priority Colors (WCAG AA compliant)
| Priority | Background | Text | Border |
|----------|-----------|------|--------|
| low | `#f0fdf4` (success-50) | `#15803d` (success-700) | `#bbf7d0` (success-200) |
| medium | `#eff6ff` (info-50) | `#1d4ed8` (info-700) | `#bfdbfe` (info-200) |
| high | `#fffbeb` (warning-50) | `#b45309` (warning-700) | `#fde68a` (warning-200) |
| critical | `#fef2f2` (error-50) | `#b91c1c` (error-700) | `#fecaca` (error-200) |

### PDCA Outcome Colors (WCAG AA compliant)
| Outcome | Background | Text | Contrast |
|---------|-----------|------|----------|
| great | `#dcfce7` (success-100) | `#166534` (success-800) | ~7.2:1 |
| ok | `#fef3c7` (warning-100) | `#92400e` (warning-800) | ~6.8:1 |
| rough | `#fee2e2` (error-100) | `#991b1b` (error-800) | ~7.1:1 |

---

## Typography

### Font Families
| Token | Value |
|-------|-------|
| sans | `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'` |
| mono | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace` |

### Font Sizes
| Token | px |
|-------|-----|
| xs | 12 |
| sm | 14 |
| base | 16 |
| lg | 18 |
| xl | 20 |
| 2xl | 24 |
| 3xl | 30 |
| 4xl | 36 |

### Font Weights
| Token | Value |
|-------|-------|
| normal | 400 |
| medium | 500 |
| semibold | 600 |
| bold | 700 |

### Line Heights
| Token | Multiplier |
|-------|-----------|
| tight | 1.25 |
| normal | 1.5 |
| relaxed | 1.75 |

---

## Spacing (4px base unit)

| Token | px |
|-------|-----|
| 0 | 0 |
| 0.5 | 2 |
| 1 | 4 |
| 2 | 8 |
| 3 | 12 |
| 4 | 16 |
| 5 | 20 |
| 6 | 24 |
| 8 | 32 |
| 10 | 40 |
| 12 | 48 |
| 16 | 64 |
| 20 | 80 |
| 24 | 96 |

---

## Shadows

| Token | Value |
|-------|-------|
| none | `none` |
| sm | `0 1px 2px 0 rgba(0,0,0,0.05)` |
| md | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` |
| lg | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` |

---

## Border Radii

| Token | Value |
|-------|-------|
| none | `0px` |
| sm | `4px` |
| md | `8px` (v1 default: --radius 0.5rem) |
| lg | `12px` |
| xl | `16px` |
| full | `9999px` |

---

## Usage

```typescript
// In a component
import { COLORS, TASK_PRIORITY_COLORS } from '@ofative/ui/tokens'

// In tailwind.config.ts
import ofativePreset from '@ofative/ui/tailwind.config'
export default { presets: [ofativePreset], content: ['./src/**/*.tsx'] }
```

All color pairs meeting WCAG 2.1 AA (contrast >= 4.5:1). Color alone is never sufficient for meaning — always pair with text label.

---

## Related

- Consumers: [[components]] · [[shared-packages]]
- Build: [[config]]
- Health: [[vault-health]]
