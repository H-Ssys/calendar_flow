# Namecard OCR — Design Output

## Component Details
**Component Name:** `CardCropEditor`
**File Path:** `src/components/contacts/CardCropEditor.tsx`

## Props Interface
```typescript
interface CardCropEditorProps {
  imageSrc: string
  initialBounds?: { left: number; top: number; width: number; height: number }
  onConfirm: (blob: Blob, side: 'front' | 'back') => void
  onRedo: () => void
  isOpen: boolean
}
```

## Key Design Decisions
- **Modal Size & Layout**: Employed a full-screen approach (`h-[100dvh]`, no border/radius) for mobile to maximize the editing area. On desktop (`sm:` breakpoint), restricted the modal to a centered container with a `max-w-[740px]` and constrained height (`max-h-[90vh]`) with borders. The image area takes up remaining vertical space using flex layout.
- **Placeholder UI**: Used a `neutral-200` background with a dashed border for the image preview area. Applied the same primary and neutral color tokens outlined in the authoritative design system (`system.md`).
- **Rotation Control**: Inserted a minimalist rotation tool below the crop area, capped within a max-width of `384px` (`max-w-sm`) to not span the full available width unreasonably. Configured the range input from `-45` to `45` degrees. Formatted the "Level" button using standard secondary styling.
- **Side-Selection Flow Integration**: Rather than opening a consecutive, nested modal after clicking "Use this crop →", the bottom action bar smoothly delegates to a two-card selection view ("Which side is this?"). Used robust visual feedback using active outline colors (`primary-600`) and a lucide `Check` icon when a side is selected. A "Confirm side" button progressively appears only *after* selection, preventing premature submission.

## shadcn/ui Components Utilized
- `Dialog`, `DialogContent`, `DialogTitle`
- `Button`
