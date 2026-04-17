---
type: module-scan
module: contacts
created: 2026-04-14
updated: 2026-04-17
scan_purpose: delta scan after Antigravity UI session
---

# Contacts Module Scan

Updated after Antigravity session (commits `866046b` → `eca120d`). Five source files
changed: `CardCropEditor.tsx`, `ScanCardForm.tsx`, `BatchUploadForm.tsx`,
`NewContactForm.tsx`, `useCardProcessor.ts`, and `types/contact.ts`.

## Files

### `src/types/contact.ts`
- **Size:** ~2.4 KB · 110 lines
- **Purpose:** Defines `OcrResult`, `Contact`, `BatchCard`, `CropBounds`, `CardProcessorState`, and helpers.
- **Exports:** `OcrResult`, `SocialEntry`, `PhoneEntry`, `CropBounds`, `CardProcessorState` (type), `Contact`, `BatchCard` (interfaces); `getInitials` (fn), `CONTACT_COLORS` (const array).
- **Imports:** none.
- **Changes since baseline:**
  - `OcrResult` gained `alt_name`, `alt_title`, `alt_company`, `alt_address` fields — supports dual-language card extraction from back-side OCR.
  - `Contact` gained `altFirstName`, `altLastName`, `altCompany`, `altJobTitle`, `altAddress` — mirrors the new `OcrResult` alt-fields for dual-language storage.
  - `CropBounds` and `CardProcessorState` are new additions (previously lived in the hook; now centralised here).
- **Issues:**
  - Still no `userId`/`user_id` field — schema mismatch with `public.contacts` persists.
  - `frontCardImage` / `backCardImage` still typed as `string` (data URL / blob URL).

### `src/context/ContactContext.tsx`
- **Size:** 2.9 KB · 102 lines *(unchanged)*
- **Purpose:** React Context provider holding contacts in component state with CRUD helpers.
- **Exports:** `useContactContext`, `ContactProvider`.
- **Issues:** In-memory MOCK_CONTACTS only; no Supabase wiring; no auth.

### `src/hooks/useCardProcessor.ts`
- **Size:** ~15 KB · 462 lines
- **Purpose:** Image preprocessing, card-edge detection, and OCR state machine for single (`mode:'new'`) and batch (`mode:'batch'`) flows.
- **Exports:**
  - `preprocessImage(file: File): Promise<Blob>` — resize + JPEG compress
  - `detectCardBoundsFromUrl(url: string): Promise<CropBounds>` — loads image, runs edge detection
  - `UseCardProcessorOptions` (interface), `UseCardProcessorReturn` (interface)
  - `useCardProcessor(opts): UseCardProcessorReturn` — main hook
- **Changes since baseline:**
  - `detectCardBounds` (old, OffscreenCanvas path) replaced with `scanEdges()` — a full separable-box-blur + row/col gradient projection algorithm for improved edge detection on hand-held cards and flat-surface shots. Handles texture noise (wood grain, fabric) that caused the old approach to miss card edges.
  - `detectCardBoundsFromUrl` now drives both the auto-crop button in `CardCropEditor` and the batch preprocessing path.
  - Hook now exposes `pendingOcr` boolean — used by `NewContactForm` and `BatchUploadForm` to show loading states.
- **Issues:**
  - `console.log('Auto crop bounds:', bounds)` left in `CardCropEditor.handleAutoCrop` — debug noise.
  - Large file (462 lines); `scanEdges` (~90 lines) could extract to a utility if it grows further.

### `src/components/contacts/CardCropEditor.tsx`
- **Size:** 266 lines
- **Purpose:** Crop dialog (react-advanced-cropper) with auto-detect, zoom, and confirm actions.
- **Exports:** `CardCropEditorProps` (interface), `CardCropEditor`.
- **Changes since baseline:**
  - Added `handleAutoCrop` — calls `detectCardBoundsFromUrl` and applies result via `cropperRef.setCoordinates`.
  - Added **Auto crop to edges** toolbar button (`Wand2` icon).
  - Toolbar layout changed from centered row to `justify-between` (auto-crop left, zoom controls right).
  - Removed `stencilProps.aspectRatio` constraint — allows free-form crop for non-standard card sizes.
  - `setCoordinates` now runs inside `setTimeout(50)` to ensure the cropper is fully mounted before applying bounds.
- **Issues:** None new; `console.log` in `handleAutoCrop` is debug noise to clean up.

### `src/components/contacts/NewContactForm.tsx`
- **Size:** 473 lines
- **Purpose:** Modal dialog to manually create a contact, with optional OCR prefill from front + back card images.
- **Exports:** `NewContactForm`.
- **Changes since baseline:**
  - **+6 `useState` hooks** — `altFirstName`, `altLastName`, `altCompany`, `altJobTitle`, `altAddress`, `showAlt`, `showAddBack`, `successMessage`.
  - Back-side crop now fires `confirmCrop(blob, 'back')` immediately on `handleCropConfirm` (no second consent prompt).
  - `handleAutoFill` now only calls `confirmCrop(frontBlob, 'front')` — back OCR is handled in the crop-confirm path.
  - `handleAddBack` / `handleSkipBack` helpers added for the "add back side" optional flow.
  - `pendingOcr` from `useCardProcessor` consumed (ready for loading state UI).
  - `showOcrConsent` now set inside crop-confirm (front side) rather than at upload time.
  - Shows `successMessage` state (wired but toast UI pending).
- **Issues:**
  - Now **21 separate `useState` calls** — the form-state consolidation issue from baseline has gotten worse. Should migrate to `useReducer` or `react-hook-form` before the next feature increment.
  - `showAddBack` toggle added but no UI renders for it yet (dead state variable).

### `src/components/contacts/ScanCardForm.tsx`
- **Size:** 394 lines
- **Purpose:** Single-card scan dialog: upload front + optional back, crop, OCR, then hand off to `NewContactForm` or direct-add.
- **Exports:** `ScanCardForm`.
- **Changes since baseline:**
  - `UploadStep` type added: `'idle' | 'front_crop' | 'back_crop' | 'done'` — replaces ad-hoc boolean flags for step tracking.
  - `CardSlot` gains `disabled` prop — upload buttons are locked during active crop/OCR steps.
  - Imports `OcrResult` from `@/types/contact`.
  - `pendingOcr` from `useCardProcessor` consumed.
  - `Check` icon imported (ready for confirmation UI).
- **Issues:**
  - Mock OCR (`handleExtract` returning hard-coded data) **status unknown** — diff truncated at line 80; verify whether real `flow-api` calls are wired in current file.

### `src/components/contacts/BatchUploadForm.tsx`
- **Size:** 511 lines  ⚠️ **OVER 500 LINES**
- **Purpose:** Multi-card (up to 20) batch upload dialog with per-card crop → OCR → confirm → save flow.
- **Exports:** `BatchUploadForm`.
- **Changes since baseline:**
  - `saveSuccessMsg` state added — shows inline success banner ("N contacts saved — add more or close") instead of closing the dialog on save.
  - `pendingOcr` from `useCardProcessor` consumed.
  - `handleSaveAll` no longer calls `onClose()` — it drops saved cards from the list and resets to fresh empty slots, keeping the dialog open for continuous batch entry.
  - `savedIds` set used to filter out saved cards while preserving failed/unconfirmed ones.
  - `countdowns` and `processingIndexRef` reset after save.
- **Issues:**
  - **511 lines — exceeds 500-line threshold.** Candidate for split into `BatchUploadForm` (orchestration) + `BatchCardList` (card list rendering).
  - `as any` cast on `addContact(...)` still present.
  - Sequential OCR loop still blocks; Celery/Redis pipeline not yet wired.

### `src/components/contacts/ContactDetail.tsx`
- **Size:** 435 lines *(unchanged)*
- **Purpose:** Right-pane contact view — inline-editable fields, color picker, edit modal, delete dialog, tag editor, linked events/tasks/notes panels.
- **Exports:** `ContactDetail`.
- **Issues:** Unchanged from baseline; approaching 500-line threshold.

## Migrations (latest two)

No new contact-related migrations since baseline scan. OCR columns (`ocr_confidence`,
`ocr_source_asset_id`, `ocr_raw_text`) still not added.

## Patterns Used (module-wide)

- Context+Provider for state (no persistence layer).
- `crypto.randomUUID()` for client-side IDs.
- `FileReader` → base64 / blob URL for image previews.
- `react-advanced-cropper` for crop UI.
- `lucide-react` icons + shadcn/ui dialog primitives.
- Inline Tailwind utility classes (no module CSS).
- `prefill: Partial<Contact>` as the OCR hand-off contract on `NewContactForm`.
- `useCardProcessor` as unified image processing + OCR state machine.

## Issues Roll-up

| Severity | Item | File |
|----------|------|------|
| HIGH | BatchUploadForm exceeds 500-line limit (511 lines) | BatchUploadForm.tsx |
| HIGH | Mock OCR extractor status unclear — verify ScanCardForm wiring | ScanCardForm.tsx |
| HIGH | Context has no Supabase wiring; in-memory MOCK_CONTACTS | ContactContext.tsx |
| HIGH | Contact images stored as base64/blob URLs (not Supabase Storage) | NewContactForm / ScanCardForm / BatchUploadForm |
| MED  | NewContactForm has 21 separate `useState` calls (was 15) | NewContactForm.tsx |
| MED  | `as any` cast bypasses Contact typing | BatchUploadForm.tsx, ScanCardForm.tsx |
| MED  | `showAddBack` state variable has no rendering UI (dead code) | NewContactForm.tsx |
| MED  | No `user_id` on `Contact` type — schema mismatch with `public.contacts` | types/contact.ts |
| MED  | ContactDetail.tsx 435 lines (approaching threshold) | ContactDetail.tsx |
| LOW  | `console.log('Auto crop bounds:', bounds)` debug noise | CardCropEditor.tsx |
| LOW  | OCR columns (`ocr_*`) not yet in Supabase schema | supabase migrations |
| LOW  | Linked events/tasks rendered as raw IDs (placeholder) | ContactDetail.tsx |

## Post-Antigravity Recommendations

1. **Split `BatchUploadForm.tsx`** — extract `BatchCardList` (card list + individual card row rendering) to bring both files under 400 lines.
2. **Verify `ScanCardForm.handleExtract`** — confirm whether real `flow-api` calls are wired or mock still active.
3. **Remove `showAddBack` dead state** from `NewContactForm` or wire it to a UI element.
4. **Collapse `NewContactForm` state** — 21 `useState` → single `useReducer` or `react-hook-form` before next feature.
5. **Remove `console.log`** in `CardCropEditor.handleAutoCrop`.
6. **Wire `ContactContext`** to Supabase before OCR results start being generated (otherwise they vanish on reload).

## Related

- [[codebase-scan]] · [[components]] · [[contexts]] · [[types]] · [[supabase-tables]] · [[api-endpoints]]
