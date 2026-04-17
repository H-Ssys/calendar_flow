# NewContactForm Refactor — DEFERRED

**Status:** refactor-deferred (Step D0)
**File:** `src/components/contacts/NewContactForm.tsx`
**Current size:** 473 lines (target was ≤250 after split)

## Why deferred

The back-side OCR flow and card-upload section are tightly coupled to 15+ parent form fields via the OCR-completion `useEffect`. Extracting them safely requires a wide callback interface and is a meaningful behaviour-risk refactor — it exceeds the Step D0 scope of "ONLY move code".

Additionally, even after extracting all OCR/upload code, the remaining parent (color picker + 5 form sections: Identity / Company & Role / Contact Info / Location / Notes + identity/alt-language state + handleCreate) is ~330 lines on its own. A clean 3-file split (parent + fields + OCR section) is required to hit ≤250 per file; that is beyond Step D0's single-split scope.

## Proposed split (for Phase D+)

### File 1: `NewContactForm.tsx` (~240 lines)
- Orchestrates overall state and submission
- Owns identity/company/contact/location/notes fields via `useContactFormFields()` hook OR passes setters down
- Renders: `<ContactCardUploadSection>` + `<ContactFormFields>` + dialog footer
- Handles `handleCreate` / `resetCardState`

### File 2: `ContactFormFields.tsx` (~220 lines, NEW)
- Pure-UI component for the 5 form sections (Identity, Company & Role, Contact Info, Location, Notes)
- Receives `values` + `onChange(field, value)` or individual setters
- Handles the color picker + alt-language toggle

### File 3: `ContactCardUploadSection.tsx` (~180 lines, NEW)
- Owns: front/back refs, previews, blobs, crop editor state, OCR consent dialog, add-back dialog, OCR error/missing-fields state
- Owns `useCardProcessor({ mode: 'new' })` hook
- Emits `onOcrSuccess(payload: Partial<Contact>)` and `onOcrFailure(error)` callbacks
- Props: `{ initialFront?, initialBack?, onOcrSuccess, onOcrFailure, onCardImagesChanged }`

## Risks to watch during eventual split

1. The OCR-complete `useEffect` currently calls 15 individual `setX` functions. Batching them into a single parent `applyOcrResult(payload)` callback changes React's commit boundaries — verify alt-language auto-reveal (`setShowAlt(true)`) still fires.
2. `frontCardImage` / `backCardImage` are on the parent today AND are consumed by `handleCreate`. The new section must mirror these outward so submission payload stays intact.
3. Crop editor currently sets `showOcrConsent(true)` only for front-side crops. Ensure the back-side silent OCR (line 110 `confirmCrop(blob, 'back')`) stays direct (no consent dialog).
4. The `showAddBack` dialog fires from the OCR-success effect when `!state.back && !backBlob`. After split, the section must expose a "no back yet" signal to trigger it internally.

## Proposed Phase D follow-up task

> D1 (frontend): split `NewContactForm.tsx` into 3 files per the proposal above, with regression on OCR consent dialog, add-back prompt, and alt-language reveal.
