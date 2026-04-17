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

---

## D3 — ContactReferences

### Component

| Field | Value |
|-------|-------|
| **Name** | `ContactReferences` |
| **Path** | `src/components/contacts/ContactReferences.tsx` |
| **Status** | Complete — placeholder search data, real wiring in D4 |
| **Lines** | ~240 |

---

### Props Interface

```typescript
interface ReferenceEntry {
  refId: string;
  name: string;
  company?: string;
  avatarColor?: string;
  label?: string;
}

interface ContactReferencesProps {
  contactId: string;
  references: ReferenceEntry[];
  onAdd: (refId: string, label?: string) => void;
  onRemove: (refId: string) => void;
  onContactClick: (id: string) => void;
}
```

---

### Layout

```
┌─────────────────────────────────────────────┐
│  flex-wrap row of chips:                    │
│  ┌──┬─────────┬───────────┐                 │
│  │SC│ Sarah C. │ Works with│  [×]            │
│  └──┴─────────┴───────────┘                 │
│  ┌──┬─────────┐                             │
│  │ML│ Marcus L│                [×]           │
│  └──┴─────────┘                             │
│  [+ Add reference]                          │
│    ┌─────── Popover ──────────┐             │
│    │ [Existing] [New contact] │  ← tabs     │
│    │ ┌─ Search ─────────────┐ │             │
│    │ │ 🔍 name or company…  │ │             │
│    │ ├──────────────────────┤ │             │
│    │ │ (SC) Sarah Chen      │ │             │
│    │ │ (ML) Marcus Lee      │ │             │
│    │ └──────────────────────┘ │             │
│    └──────────────────────────┘             │
└─────────────────────────────────────────────┘
```

### States

#### Chips
- Circular avatar (`h-6 w-6`, initials, colored background) + name (truncated at 120px) + optional label badge
- Click avatar or name → `onContactClick(refId)`
- Hover chip → × button appears at top-right corner (`opacity-0 → opacity-100`)
- Empty state: italic "No references yet"

#### Label badges
Colored by relationship type:

| Label | Background | Text |
|-------|-----------|------|
| Referred by | `#E6F1FB` | `#185FA5` |
| Works with | `#E1F5EE` | `#0F6E56` |
| Reports to | `#FAEEDA` | `#854F0B` |
| Introduced me to | `#EEEDFE` | `#534AB7` |
| custom / other | `#F1EFE8` | `#5F5E5A` |

#### Add Popover (tabbed)
- **Tab 1 "Existing contacts"**: Search input with magnifier icon → filtered scrollable list (max-h 160px). Already-added and self are excluded.
- **Tab 2 "New contact"**: Name (required) + Email (optional) inputs + "Add & link" button. Creates temp ID for now.

---

### shadcn/ui Components Used

| Component | Usage |
|-----------|-------|
| `Popover` | Add reference dropdown |
| `PopoverContent` | `w-80`, no padding (tabs handle it) |
| `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` | Existing vs New tabs |
| `Input` | Search + Name + Email fields |
| `Button` | "Add reference" ghost, "Add & link" primary |

### Icons (lucide-react)

| Icon | Usage |
|------|-------|
| `Plus` | Add reference button |
| `Search` | Search input prefix |
| `X` | Remove chip button |

---

### Unique IDs

| ID | Element |
|----|---------|
| `contact-refs-empty` | Empty state paragraph |
| `contact-refs-add-btn` | "Add reference" button |

---

### D4 Wiring Notes

- Replace `PLACEHOLDER_CONTACTS` with real contact list from context/hook
- Wire "New contact" tab to actual contact creation API
- Add label editing dropdown on each chip (options already defined in `LABEL_OPTIONS`)

---

## D3 — ContactFlow

### Component

| Field | Value |
|-------|-------|
| **Name** | `ContactFlow` |
| **Path** | `src/components/contacts/ContactFlow.tsx` |
| **Status** | Complete — placeholder list items, real wiring in D4 |
| **Lines** | ~220 |

---

### Props Interface

```typescript
interface ContactFlowProps {
  contactId: string;
  linkedEventIds: string[];
  linkedTaskIds: string[];
  linkedNoteIds: string[];
  onAddEvent: () => void;
  onAddTask: () => void;
  onAddNote: () => void;
}
```

---

### Layout

```
┌──────────────────────────────────────────┐
│  Stats row:                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │    3     │ │    5     │ │    2     │ │
│  │  Events  │ │  Tasks   │ │  Notes   │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│                                          │
│  [All] [Events] [Tasks] [Notes]  [+ Add] │
│                                          │
│  ● Coffee meeting          Upcoming      │
│    2026-04-15                            │
│  ● Send proposal draft     In Progress   │
│    2026-04-14                            │
│  ● Meeting notes           Note          │
│    2026-04-13                            │
└──────────────────────────────────────────┘
```

### Stats Row
- 3 side-by-side `StatCard` with `flex-1`, `rounded-lg`, `bg-neutral-50`
- Count: `text-xl font-medium tabular-nums`
- Label: `text-[11px] uppercase tracking-wide`

### Tab Bar
- Pill-style tabs (`rounded-full`), color-coded per active state:
  - All: `bg-neutral-900 text-white` (dark: inverted)
  - Events: `bg-blue-50 text-blue-700`
  - Tasks: `bg-amber-50 text-amber-700`
  - Notes: `bg-teal-50 text-teal-700`
- Context-aware Add button right-aligned next to tabs

### List Items
Each `FlowItemRow`:
- Colored dot (`h-2 w-2 rounded-full`) — blue/amber/teal
- Title: `text-[13px] font-medium` + date: `text-[11px] text-neutral-400`
- Status pill right-aligned with type-specific background

### Add Button Behavior

| Active Tab | Button | Action |
|-----------|--------|--------|
| All | `+ Add` | Opens 3-option Popover picker (Event/Task/Note) |
| Events | `+ Add event` | Direct `onAddEvent()` |
| Tasks | `+ Add task` | Direct `onAddTask()` |
| Notes | `+ Add note` | Direct `onAddNote()` |

### Empty States
Per-tab italic centered text: "No events yet" / "No tasks yet" / "No notes yet" / "No activity yet"

---

### Type Color System

| Type | Dot | Status bg | Status text |
|------|-----|-----------|-------------|
| Event | `bg-blue-500` | `bg-blue-50` | `text-blue-700` |
| Task | `bg-amber-500` | `bg-amber-50` | `text-amber-700` |
| Note | `bg-teal-500` | `bg-teal-50` | `text-teal-700` |

---

### shadcn/ui Components Used

| Component | Usage |
|-----------|-------|
| `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` | Tab navigation |
| `Badge` | (imported, available for status pills in D4) |
| `Button` | Context-aware add buttons |
| `Popover` / `PopoverContent` / `PopoverTrigger` | "All" tab quick picker |

### Icons (lucide-react)

| Icon | Usage |
|------|-------|
| `CalendarDays` | Event type config |
| `CheckCircle2` | Task type config |
| `FileText` | Note type config |
| `Plus` | Add buttons |

---

### Unique IDs

| ID | Element |
|----|---------|
| `flow-add-event` | Add event button |
| `flow-add-task` | Add task button |
| `flow-add-note` | Add note button |
| `flow-add-all` | Add picker button (All tab) |

---

### D4 Wiring Notes

- Replace `PLACEHOLDER_ITEMS` with real data from event/task/note contexts
- Use `linkedEventIds`, `linkedTaskIds`, `linkedNoteIds` to fetch actual items
- Add click-to-navigate on list items
- Wire status badges to real status values
