# CardCropEditor — Design Output

## Component

| Field | Value |
|-------|-------|
| **Name** | `CardCropEditor` |
| **Path** | `src/components/contacts/CardCropEditor.tsx` |
| **Status** | UI shell complete — crop logic wired in C4 |

---

## Props Interface

```typescript
interface CardCropEditorProps {
  imageSrc: string;
  initialBounds?: { left: number; top: number; width: number; height: number };
  onConfirm: (blob: Blob, side: 'front' | 'back') => void;
  onRedo: () => void;
  isOpen: boolean;
}
```

> [!NOTE]
> `onConfirm` is called with `new Blob()` as placeholder in this shell.
> Real canvas extraction (`getCanvas()`) is wired in C4 when `react-advanced-cropper` is added.

---

## Key Design Decisions

### Modal sizing
- **Mobile**: Full-screen `h-[100dvh]`, no border-radius — feels native
- **Desktop (≥640px)**: Centered modal, `max-w-[740px]`, `max-h-[90vh]`, `rounded-xl`

### Layout structure
```
┌──────────────────────────────┐
│  [scrollable body]           │
│    ┌────────────────────┐    │
│    │   Card preview     │    │
│    │  (placeholder box) │    │
│    └────────────────────┘    │
│                              │
│    ┌──── Rotation ──────┐    │
│    │  0°  [Level btn]   │    │
│    │  ────────────────  │    │
│    └────────────────────┘    │
├──────────────────────────────┤
│  [action bar — fixed]        │
│  [← Redo]    [Use crop →]    │  ← step: 'crop'
│                              │
│  Which side is this?         │  ← step: 'side-selection'
│  [Front side] [Back side]    │  (replaces action bar in-place)
│  [    Confirm side    ]       │  (appears after selection)
└──────────────────────────────┘
```

### Placeholder image area
- `aspect-[1.75/1]` — typical namecard landscape ratio
- Gray background, 2px dashed border, `ImageIcon` + "Card preview" label
- Rotates via CSS `transform: rotate()` to preview rotation visually
- Replaced in C4 by `<Cropper ref={cropperRef} src={imageSrc} ... />`

### Rotation control
- Standard `<input type="range">` min=`-45` max=`45` step=`1`
- Live value shown as `0°` in monospace (`tabular-nums`)
- **Level** button resets to `0` with `RotateCcw` icon
- Contained in a white card with `shadow-sm` for visual grouping

### Side-selection flow
- Inline state transition — **no new modal**, replaces action bar in place
- `animate-in slide-in-from-bottom-2 fade-in` (Tailwind animate plugin)
- Two equal `<button>` cards side-by-side with `flex-1`
- Selected card: `border-indigo-600`, `bg-indigo-50`, checkmark badge top-right
- **Confirm side** button appears only after a selection (`animate-in fade-in`)

---

## shadcn/ui Components Used

| Component | Usage |
|-----------|-------|
| `Dialog` | Modal wrapper (`@radix-ui/react-dialog`) |
| `DialogContent` | Sized shell — mobile full-screen / desktop modal |
| `DialogTitle` | Visually hidden, screen-reader accessible |
| `DialogDescription` | Visually hidden, screen-reader accessible |
| `Button` | Redo, Use this crop, Level, Confirm side |

### Icons (lucide-react)
| Icon | Usage |
|------|-------|
| `ImageIcon` | Placeholder image area |
| `RotateCcw` | Level button prefix |
| `Check` | Checkmark badge in selected side card |

---

## Color Tokens Used

| Purpose | Token | Hex |
|---------|-------|-----|
| Primary action | `indigo-600` | `#4f46e5` |
| Primary hover | `indigo-700` | `#4338ca` |
| Selected card bg | `indigo-50` | `#eef2ff` |
| Selected card dark | `indigo-950/40` | — |
| Checkmark badge | `indigo-600` | `#4f46e5` |
| Placeholder bg | `neutral-200` | `#e5e5e5` |
| Placeholder border | `neutral-400` | `#a3a3a3` |

---

## Sub-components

### `SideCard` (internal)
```typescript
interface SideCardProps {
  id: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}
```
Internally extracts the side selection card to keep `CardCropEditor` under 500 lines.

---

## C4 Integration Notes

When wiring the crop logic in C4:
1. Add `import { Cropper, type CropperRef } from 'react-advanced-cropper'`
2. Add `import 'react-advanced-cropper/dist/style.css'`
3. Replace the placeholder `<div>` (identified by `"Card preview"` text) with `<Cropper ref={cropperRef} src={imageSrc} ... />`
4. Add `cropperRef` + `rotationRef` refs
5. Replace `handleUseCrop` stub with `cropperRef.current?.getCanvas({ width: 1920 })?.toBlob(...)`
6. Replace `handleLevel` stub with `cropperRef.current?.rotateImage(-rotationRef.current)`

---

## D1 — ContactCardImages

### Component

| Field | Value |
|-------|-------|
| **Name** | `ContactCardImages` |
| **Path** | `src/components/contacts/ContactCardImages.tsx` |
| **Status** | Complete — presentational, ready for integration |
| **Lines** | ~140 |

---

### Props Interface

```typescript
interface ContactCardImagesProps {
  frontUrl?: string;
  backUrl?: string;
  onUploadFront: () => void;
  onUploadBack: () => void;
  contactName: string;
}
```

---

### Layout

```
┌─────────────────────────────────────────────┐
│  flex row (gap-3)  ·  below 480px → column  │
│ ┌──────────────────┐ ┌──────────────────┐   │
│ │  Front image /   │ │  Back image /    │   │
│ │  placeholder     │ │  placeholder     │   │
│ │ aspect 1.75 : 1  │ │ aspect 1.75 : 1  │   │
│ └──────────────────┘ └──────────────────┘   │
│  [Front]              [Back]                │
└─────────────────────────────────────────────┘
```

- **No fixed pixel widths** — each thumbnail is `flex-1 min-w-0`, scales to parent
- `aspect-ratio: 1.75 / 1` via inline style (standard namecard landscape)
- `max-[480px]:flex-col` stacks vertically on narrow viewports

---

### States

#### Image present
- `<img>` with `object-fit: cover`, `rounded-lg`
- Hover effect: slight scale-up (`scale-[1.03]`) + dark overlay + "View" pill
- Click → opens lightbox `Dialog`

#### Placeholder (no image)
- **Front**: `border-2 border-dashed border-neutral-300` + `Camera` icon + "Add front side"
- **Back** (optional): lighter dashed style (`border-neutral-200`, `bg-neutral-50/50`, text `neutral-300`) + "Add back side (optional)"
- Click → fires `onUploadFront` / `onUploadBack` callback
- Hover: border transitions to `indigo-400`, bg to `indigo-50/40`

#### Label badges
- Small `<span>` below each thumbnail: "FRONT" / "BACK"
- Styled as `bg-neutral-100 text-neutral-500 text-[11px] uppercase tracking-wide font-semibold rounded-md`

---

### Lightbox Dialog

| Property | Value |
|----------|-------|
| Trigger | Click existing image thumbnail |
| Size | `max-w-[90vw] max-h-[90vh]`, auto-sized to image |
| Background | Transparent content + default `bg-black/80` overlay |
| Image fit | `object-contain`, `rounded-lg` |
| Close button | Styled white on dark (`text-white`, `bg-black/40`, `rounded-full`) |
| Accessibility | `DialogTitle` + `DialogDescription` visually hidden |

---

### shadcn/ui Components Used

| Component | Usage |
|-----------|-------|
| `Dialog` | Lightbox modal wrapper |
| `DialogContent` | Transparent full-bleed image container |
| `DialogTitle` | Visually hidden, screen-reader accessible |
| `DialogDescription` | Visually hidden, screen-reader accessible |

### Icons (lucide-react)

| Icon | Usage |
|------|-------|
| `Camera` | Placeholder upload button |

---

### Color Tokens Used

| Purpose | Token | Hex |
|---------|-------|-----|
| Placeholder border (front) | `neutral-300` | `#d4d4d4` |
| Placeholder border (back) | `neutral-200` | `#e5e5e5` |
| Placeholder hover border | `indigo-400` | `#818cf8` |
| Placeholder hover bg | `indigo-50/40` | — |
| Focus ring | `indigo-500` | `#6366f1` |
| Label badge bg | `neutral-100` | `#f5f5f5` |
| Label badge text | `neutral-500` | `#737373` |
| Badge dark bg | `neutral-800` | `#262626` |
| Badge dark text | `neutral-400` | `#a3a3a3` |

---

### Unique IDs (for testing)

| ID | Element |
|----|---------|
| `contact-card-front-thumb` | Front image button (when image exists) |
| `contact-card-front-upload` | Front placeholder upload button |
| `contact-card-back-thumb` | Back image button (when image exists) |
| `contact-card-back-upload` | Back placeholder upload button |

---

### Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| `> 480px` | Side-by-side thumbnails (`flex-row`) |
| `≤ 480px` | Stacked vertically (`flex-col`) |

---

### Dark Mode

All interactive elements include `dark:` variants:
- Placeholder: `dark:border-neutral-700 / 800`, `dark:bg-neutral-900 / 950`
- Hover: `dark:hover:border-indigo-500`, `dark:hover:bg-indigo-950/30`
- Labels: `dark:bg-neutral-800`, `dark:text-neutral-400`

---

## D2 — SocialPlatforms

### Component

| Field | Value |
|-------|-------|
| **Name** | `SocialPlatforms` |
| **Path** | `src/components/contacts/SocialPlatforms.tsx` |
| **Constants** | `src/constants/socialPlatforms.ts` |
| **Status** | Complete — read-only + edit modes |
| **Lines** | ~240 (component) + ~60 (constants) |

---

### Props Interface

```typescript
interface SocialEntry {
  platform: string;
  value: string;
  label: string;
}

interface SocialPlatformsProps {
  socials: SocialEntry[];
  onChange: (socials: SocialEntry[]) => void;
  readOnly?: boolean;
}
```

---

### Layout

#### Read-only mode (`readOnly=true`)
```
┌─────────────────────────────────────────┐
│ [Li] LinkedIn   @john-doe  →link        │
│ [Tw] Twitter    @johndoe   →link        │
│ [Ig] Instagram  j.doe      →link        │
└─────────────────────────────────────────┘
```
- Colored 2-letter badge + platform name (fixed 80px) + handle (linked if URL-mappable)
- Empty state: italic "No social platforms added"

#### Edit mode (`readOnly=false`)
```
┌─────────────────────────────────────────┐
│ [Li] LinkedIn   [handle input]   [×]    │
│ [Tw] Twitter    [handle input]   [×]    │
│ [+ Add platform]                        │
│   ┌────── Popover ──────┐               │
│   │ [Li] [Tw] [Ig] ...  │               │
│   │ ─────────────────── │               │
│   │ custom name input…  │               │
│   └─────────────────────┘               │
└─────────────────────────────────────────┘
```
- Click handle → inline `<input>`, blur/Enter commits
- Remove button (×) appears on row hover
- Popover shows un-added platforms as colored pills
- Custom platform text input at bottom with Enter to add

---

### Platform Badge System

| Platform | Short | Background | Text |
|----------|-------|-----------|------|
| LinkedIn | Li | `#E6F1FB` | `#185FA5` |
| Twitter | Tw | `#E6F1FB` | `#185FA5` |
| Instagram | Ig | `#FAECE7` | `#993C1D` |
| Facebook | Fb | `#E6F1FB` | `#185FA5` |
| WhatsApp | Wa | `#E1F5EE` | `#0F6E56` |
| Telegram | Tg | `#E6F1FB` | `#185FA5` |
| GitHub | Gh | `#F1EFE8` | `#5F5E5A` |
| YouTube | Yt | `#FCEBEB` | `#A32D2D` |
| TikTok | Tk | `#F1EFE8` | `#444441` |
| Discord | Dc | `#EEEDFE` | `#534AB7` |
| Slack | Sl | `#FAECE7` | `#993C1D` |
| WeChat | Wc | `#E1F5EE` | `#0F6E56` |
| LINE | Ln | `#E1F5EE` | `#0F6E56` |
| Zalo | Za | `#E6F1FB` | `#185FA5` |
| KakaoTalk | Kt | `#FAEEDA` | `#854F0B` |
| Skype | Sk | `#E6F1FB` | `#185FA5` |
| custom | (first 2 chars) | `#F1EFE8` | `#5F5E5A` |

Badge: `h-7 w-7 rounded-md text-[11px] font-bold` — inline styles for colors.

---

### shadcn/ui Components Used

| Component | Usage |
|-----------|-------|
| `Popover` | Platform picker dropdown |
| `PopoverContent` | Picker panel (`w-72`) |
| `PopoverTrigger` | Wraps "Add platform" button |
| `Button` | "Add platform" ghost button |

### Icons (lucide-react)

| Icon | Usage |
|------|-------|
| `Plus` | Add platform button |
| `X` | Remove platform button |

---

### Internal Sub-components

| Name | Purpose |
|------|---------|
| `PlatformBadge` | Colored 2-letter icon badge |
| `EditableHandle` | Click-to-edit inline input for handle values |

---

### URL Mapping (read-only mode)

Handles are automatically linked for known platforms:

| Platform | URL prefix |
|----------|-----------|
| linkedin | `https://linkedin.com/in/` |
| twitter | `https://x.com/` |
| instagram | `https://instagram.com/` |
| facebook | `https://facebook.com/` |
| github | `https://github.com/` |
| youtube | `https://youtube.com/@` |
| tiktok | `https://tiktok.com/@` |
| telegram | `https://t.me/` |

Values starting with `http://` or `https://` are used as-is. Other platforms show plain text.

---

### Unique IDs (for testing)

| ID | Element |
|----|---------|
| `social-platforms-empty` | Empty state paragraph |
| `social-add-btn` | "Add platform" button |

---

### Dark Mode

- Row hover: `dark:hover:bg-neutral-900/60`
- Platform name: `dark:text-neutral-300`
- Inline input: `dark:border-neutral-700`, `dark:bg-neutral-900`
- Input focus: `dark:focus:border-indigo-500`
- Editable handle hover: `dark:hover:bg-neutral-800`
- Custom input: same dark tokens
- Popover divider: `dark:border-neutral-700`
