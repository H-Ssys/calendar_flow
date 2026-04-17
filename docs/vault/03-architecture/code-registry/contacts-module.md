---
type: module-scan
module: contacts
created: 2026-04-14
updated: 2026-04-17
scan_purpose: delta scan after second Antigravity UI session
---

# Contacts Module Scan

Updated after second Antigravity session (commit `182c9b5`). Three source files
changed: `BatchUploadForm.tsx`, `ContactDetail.tsx`, `Contacts.tsx`.

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
  - `detectCardBounds` (old, OffscreenCanvas path) replaced with `scanEdges()` — a full separable-box-blur + row/col gradient projection algorithm for improved edge detection on hand-held cards and flat-surface shots.
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
- **Issues:** `console.log` in `handleAutoCrop` is debug noise to clean up.

### `src/components/contacts/NewContactForm.tsx`
- **Size:** 473 lines
- **Purpose:** Modal dialog to manually create a contact, with optional OCR prefill from front + back card images.
- **Exports:** `NewContactForm`.
- **Changes since baseline:**
  - **+6 `useState` hooks** — `altFirstName`, `altLastName`, `altCompany`, `altJobTitle`, `altAddress`, `showAlt`, `showAddBack`, `successMessage`.
  - Back-side crop now fires `confirmCrop(blob, 'back')` immediately on `handleCropConfirm`.
  - `handleAddBack` / `handleSkipBack` helpers added for the "add back side" optional flow.
  - `pendingOcr` from `useCardProcessor` consumed (ready for loading state UI).
- **Issues:**
  - Now **21 separate `useState` calls** — should migrate to `useReducer` or `react-hook-form`.
  - `showAddBack` toggle added but no UI renders for it yet (dead state variable).

### `src/components/contacts/ScanCardForm.tsx`
- **Size:** 394 lines
- **Purpose:** Single-card scan dialog: upload front + optional back, crop, OCR, then hand off to `NewContactForm` or direct-add.
- **Exports:** `ScanCardForm`.
- **Note:** Entry point removed from `Contacts.tsx` in this session — `ScanCardForm` is now unreachable from the UI. `BatchUploadForm` has taken over the scan-card entry point. The component file still exists but is effectively dead UI.
- **Issues:**
  - No longer imported or rendered in `Contacts.tsx` — dead code risk. Evaluate whether to delete or re-integrate.
  - Mock OCR status in `handleExtract` unverified.

### `src/components/contacts/BatchUploadForm.tsx`
- **Size:** 601 lines  ⚠️ **OVER 500 LINES (+90 since last scan)**
- **Purpose:** Unified scan & multi-card (up to 20) upload dialog with per-card crop → OCR → auto-save flow. Now serves as the single entry point for both single-card scan and batch upload.
- **Exports:** `BatchUploadForm`.
- **Changes since last scan (182c9b5):**
  - **Floating OCR bubble** — when extraction starts, dialog minimizes to a floating pill (bottom-right, `z-[59]`). Shows animated progress bar while extracting; success checkmark when done.
  - `minimized` state added — controls dialog visibility vs bubble visibility.
  - `Dialog open` now bound to `open && !minimized` so it hides during extraction.
  - **Auto-save effect** — when minimized and extraction finishes, all saveable cards are saved automatically; `sonner` toast shows contact names; dialog resets and closes after 2 s.
  - Initial empty card slots: 2 → 1.
  - `Minimize2`, `ScanBarcode`, `Check` icons added; `Upload` removed from dialog header.
  - `toast` from `sonner` imported.
  - Dialog title: "Batch Upload Business Cards" → "Scan & Upload Cards".
- **Issues:**
  - **601 lines — far exceeds 500-line threshold.** Candidate for split into `BatchUploadForm` (orchestration + bubble) + `BatchCardList` (card list rendering).
  - `as any` cast on `addContact(...)` still present.
  - Sequential OCR loop still blocks; Celery/Redis pipeline not yet wired.
  - Auto-save fires without user confirmation — could save partial/bad OCR results silently.

### `src/components/contacts/ContactDetail.tsx`
- **Size:** 506 lines  ⚠️ **NOW OVER 500 LINES (was 435)**
- **Purpose:** Right-pane contact view — inline-editable fields, color picker, edit modal, delete dialog, tag editor, linked events/tasks/notes panels.
- **Exports:** `ContactDetail`.
- **Changes since last scan (182c9b5):**
  - `Languages` icon imported from `lucide-react`.
  - `showAlt` state added — toggles between primary and alt-language display.
  - `hasAlt` computed boolean — true if any alt field is populated.
  - `altDisplayName` computed string — concatenated alt first + last name.
  - **Alt-language toggle button** added to header action row (`Languages` icon, highlighted when active).
  - **Header name/title** now switches to alt values when `showAlt` is true; primary name shown as dimmed sub-text.
  - **Alt-language panel** inserted below address section — grid layout showing `altFirstName`, `altLastName`, `altCompany`, `altJobTitle`, `altAddress`. Shows instructional placeholder when no alt data exists.
- **Issues:**
  - **506 lines — crossed 500-line threshold.** Split recommended (e.g. `ContactDetailHeader` + `AltLanguagePanel` + `ContactDetailBody`).
  - `alt_language` field referenced (`contact.alt_language`) but not yet defined in `Contact` type or DB schema.

### `src/pages/Contacts.tsx`
- **Size:** 240 lines
- **Purpose:** Contacts page shell — contact list, search/filter, selected contact detail pane, modal orchestration.
- **Exports:** default `Contacts` (wrapped in `ContactProvider`).
- **Changes since last scan (182c9b5):**
  - `ScanCardForm` import removed.
  - `showScanCard` + `showBatchUpload` state variables merged into single `showScanUpload`.
  - "Scan Card" and "Batch Upload" dropdown items merged into single **"Scan & Upload Card"** item.
  - `ScanCardForm` modal removed from JSX — `BatchUploadForm` is now the sole scan/upload entry point.
  - `Upload` icon removed from imports.
- **Issues:** None new.

## Migrations (latest two)

No new contact-related migrations since baseline scan. OCR columns (`ocr_confidence`,
`ocr_source_asset_id`, `ocr_raw_text`) still not added. `alt_language` field now
referenced in `ContactDetail.tsx` but absent from both the `Contact` type and DB schema.

## Patterns Used (module-wide)

- Context+Provider for state (no persistence layer).
- `crypto.randomUUID()` for client-side IDs.
- `FileReader` → base64 / blob URL for image previews.
- `react-advanced-cropper` for crop UI.
- `lucide-react` icons + shadcn/ui dialog primitives.
- Inline Tailwind utility classes (no module CSS).
- `prefill: Partial<Contact>` as the OCR hand-off contract on `NewContactForm`.
- `useCardProcessor` as unified image processing + OCR state machine.
- `sonner` toast for save confirmations.

## Issues Roll-up

| Severity | Item | File |
|----------|------|------|
| HIGH | BatchUploadForm 601 lines, exceeds 500-line limit (+90 since last scan) | BatchUploadForm.tsx |
| HIGH | ContactDetail 506 lines, crossed 500-line threshold | ContactDetail.tsx |
| HIGH | ScanCardForm no longer imported — dead UI, evaluate delete or re-integrate | ScanCardForm.tsx |
| HIGH | Auto-save in BatchUploadForm fires without user confirmation | BatchUploadForm.tsx |
| HIGH | Mock OCR extractor status unclear — verify ScanCardForm wiring | ScanCardForm.tsx |
| HIGH | Context has no Supabase wiring; in-memory MOCK_CONTACTS | ContactContext.tsx |
| HIGH | Contact images stored as base64/blob URLs (not Supabase Storage) | NewContactForm / ScanCardForm / BatchUploadForm |
| MED  | `alt_language` field referenced in ContactDetail but absent from Contact type + DB | ContactDetail.tsx / contact.ts |
| MED  | NewContactForm has 21 separate `useState` calls (was 15) | NewContactForm.tsx |
| MED  | `as any` cast bypasses Contact typing | BatchUploadForm.tsx, ScanCardForm.tsx |
| MED  | `showAddBack` state variable has no rendering UI (dead code) | NewContactForm.tsx |
| MED  | No `user_id` on `Contact` type — schema mismatch with `public.contacts` | types/contact.ts |
| LOW  | `console.log('Auto crop bounds:', bounds)` debug noise | CardCropEditor.tsx |
| LOW  | OCR columns (`ocr_*`) not yet in Supabase schema | supabase migrations |
| LOW  | Linked events/tasks rendered as raw IDs (placeholder) | ContactDetail.tsx |

## Post-Antigravity Recommendations

1. **Split `BatchUploadForm.tsx`** — extract `BatchCardList` (card list + card row rendering) to bring both files under 400 lines. Now at 601 lines, this is urgent.
2. **Split `ContactDetail.tsx`** — extract `AltLanguagePanel` and/or `ContactDetailHeader`; currently 506 lines.
3. **Add `alt_language` to `Contact` type and DB schema** — it is already referenced in the UI.
4. **Evaluate `ScanCardForm.tsx`** — now unreachable from the UI. Delete or re-integrate as a dedicated single-card path.
5. **Add user confirmation before auto-save** in `BatchUploadForm` minimized flow — currently saves silently on extraction complete.
6. **Collapse `NewContactForm` state** — 21 `useState` → single `useReducer` or `react-hook-form`.
7. **Remove `showAddBack` dead state** from `NewContactForm` or wire it to a UI element.
8. **Remove `console.log`** in `CardCropEditor.handleAutoCrop`.
9. **Wire `ContactContext`** to Supabase before OCR results start being generated (otherwise they vanish on reload).

## Related

- [[codebase-scan]] · [[components]] · [[contexts]] · [[types]] · [[supabase-tables]] · [[api-endpoints]]
