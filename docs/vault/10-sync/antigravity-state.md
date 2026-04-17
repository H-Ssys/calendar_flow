# Antigravity State

Tracks sync notes for changes pushed from Antigravity sessions.

---

## Sync — 2026-04-17 (second session, commit 182c9b5)

Changes pushed from Antigravity session:

**Files changed:**
- `src/components/contacts/BatchUploadForm.tsx` — floating OCR bubble when minimized; auto-save on extraction complete (`sonner` toast); initial slots 2→1; dialog title → "Scan & Upload Cards"; `minimized` state + auto-close after save
- `src/components/contacts/ContactDetail.tsx` — alt-language toggle (`Languages` icon); `showAlt` state; alt-language panel (name/company/job title/address grid); header switches to alt values when active
- `src/pages/Contacts.tsx` — `ScanCardForm` import and modals removed; "Scan Card" + "Batch Upload" merged into single "Scan & Upload Card" entry → `BatchUploadForm`

**New components added:** none

**Size warnings:**
- `BatchUploadForm.tsx` — **601 lines** (was 511), +90 lines. Urgent split needed.
- `ContactDetail.tsx` — **506 lines** (was 435), crossed 500-line threshold for first time.

**New issues introduced:**
- `alt_language` field referenced in `ContactDetail` but absent from `Contact` type and DB schema.
- `ScanCardForm` is now dead UI (no import path); evaluate delete or re-integrate.
- Auto-save in `BatchUploadForm` fires without user confirmation.

---

## Sync — 2026-04-17

Changes pushed from Antigravity session (commits `866046b` → `eca120d`):

**Files changed:**
- `src/types/contact.ts` — added alt-language fields to `OcrResult` and `Contact` (`alt_name`, `alt_title`, `alt_company`, `alt_address`, `altFirstName`, `altLastName`, `altCompany`, `altJobTitle`, `altAddress`); centralised `CropBounds` and `CardProcessorState` types here
- `src/hooks/useCardProcessor.ts` — replaced `detectCardBounds` with `scanEdges()` (separable box-blur + row/col gradient projection); improved edge detection for hand-held and flat-surface cards; added `pendingOcr` return value
- `src/components/contacts/CardCropEditor.tsx` — added auto-crop button (`Wand2`) calling `detectCardBoundsFromUrl`; removed aspect-ratio stencil constraint; toolbar layout updated
- `src/components/contacts/ScanCardForm.tsx` — added `UploadStep` type; `CardSlot` gains `disabled` prop; imports `OcrResult`; consumes `pendingOcr`
- `src/components/contacts/NewContactForm.tsx` — added alt-field state hooks and UI (showAlt toggle); back-side OCR fires on crop-confirm; `handleAddBack`/`handleSkipBack` helpers added
- `src/components/contacts/BatchUploadForm.tsx` — save no longer closes dialog; success banner; `handleSaveAll` drops saved cards and resets for continuous batch entry

**New components/hooks added:** none (all changes to existing files)

**Size warnings:**
- `BatchUploadForm.tsx` — **511 lines**, exceeds 500-line threshold. Split recommended.
- `useCardProcessor.ts` — 462 lines, approaching threshold. `scanEdges` could extract.
- `NewContactForm.tsx` — 473 lines, approaching threshold.

**Issues introduced:**
- `showAddBack` state variable in `NewContactForm` is dead (no UI wired).
- `console.log('Auto crop bounds:', bounds)` debug noise in `CardCropEditor`.
- `NewContactForm` now has 21 `useState` calls (up from 15).
