# Step D0 — Refactor Regression Report

**Date:** 2026-04-18
**Scope:** Clear Phase D frontend work by splitting oversized contacts components.
**Method:** Build verification + code-inspection equivalence trace (no browser session available in this role).

## Files changed

| File | Before | After | Target | Notes |
|---|---|---|---|---|
| `src/components/contacts/BatchUploadForm.tsx` | 601 | 452 | ≤250 | Shell + orchestration; over target (see note below) |
| `src/components/contacts/BatchCardList.tsx` | — | 81 | ≤250 | NEW — list + progress/save banners + "add card" button |
| `src/components/contacts/BatchCardItem.tsx` | — | 159 | ≤100 | NEW — card row + MiniDropZone/StatusDot/statusLabel + shared types |
| `src/components/contacts/ScanCardForm.tsx` | 394 | 394 | <400 | No changes needed — no dead code, no stub handlers, no stale comments |
| `src/components/contacts/NewContactForm.tsx` | 473 | 473 | ≤250 | Deferred — see `newcontactform-split-proposal.md` |

### Why BatchUploadForm is 452 (not ≤250)

Further reduction requires splitting the OCR orchestration pipeline itself (cross-crop/extract flow refs, countdown timer loop, auto-save-on-minimize effect, per-index processing state). That crosses the "ONLY move code — do not change behaviour" rule of Step D0. Presentational/list code is fully extracted. Remaining 452 lines are orchestration state, the minimized floating bubble, and the Dialog shell.

### Why BatchCardItem is 159 (not ≤100)

`MiniDropZone` (35 lines), `StatusDot` + `STATUS_DOT_STYLES` (20 lines), `statusLabel` helper (12 lines), and shared type definitions (`CardStatus`, `ExtractedData`, `ProcessedCard`, ~25 lines) are cohesive with the card row and live in the same file. Splitting them into a separate `batch-upload-types.ts` would reach ≤100 but exceeds the 3-file scope the brief prescribed.

## Build verification

```
npx vite build
✓ built in 2.12s
```

No errors. Chunk-size warning is the pre-existing `heic2any` bundle — unchanged.

## Equivalence trace — 5 flows

### 1. Batch upload processes cards sequentially — PASS (code-inspection)

- `handleExtractAll` sets `processingIndexRef.current = 0`, flips `flowRef` to `'extract'`, and awaits `processNextCard()`. (BatchUploadForm lines 234–244)
- `processNextCard` reads `cardsRef.current[idx]`, preprocesses `frontBlob`/`backBlob`, then `confirmCrop(frontBlob, 'front')`. (lines 131–161)
- `useEffect` on `state.status === 'ocr_success' | 'ocr_partial'` increments `processingIndexRef` and re-enters `processNextCard`. (lines 163–196)
- None of this logic moved; behaviour identical.

### 2. Countdown timer fires and auto-confirms — PASS (code-inspection)

- OCR success/partial seeds `setCountdowns(prev => ({ ...prev, [idx]: AUTO_CONFIRM_SECONDS }))` (line 180).
- Countdown `useEffect` ticks every 1s; at 0 sets card status to `'confirmed'` and deletes the key (lines 203–229).
- Previously rendered in-line at Card row; now passed to `BatchCardItem` via `countdown={countdowns[i]}` + `onCancelCountdown={cancelCountdown}` props. Render path identical; "Auto-save in Ns · Cancel" button still dispatches `cancelCountdown(index)`.

### 3. Save all creates contacts — PASS (code-inspection)

- `handleSaveAll` iterates `saveableCards` and calls `addContact({...})` with the same payload shape (lines 247–281).
- Save footer button still wired: `showSave ? <Button onClick={handleSaveAll}>` (lines 407–411). Untouched.
- Note: `handleSaveAll` and the auto-save `useEffect` duplicate the `addContact` payload. Kept verbatim — dedup deferred to preserve Step D0's "do not change behaviour" rule.

### 4. Scan Card flow still opens crop editor — PASS (file untouched)

- `ScanCardForm.tsx` was evaluated and left at 394 lines (no dead code). `handlePickFile` → `processFile(file)` → `state.status === 'crop_pending'` → `setCropOpen(true)` path is byte-identical to previous build.

### 5. New Contact OCR consent dialog still appears — PASS (file untouched)

- `NewContactForm.tsx` deferred per `newcontactform-split-proposal.md`. `handleCropConfirm(blob, 'front')` still sets `setShowOcrConsent(true)` (line 104); `<AlertDialog open={showOcrConsent}>` still rendered (line 438).

## Browser QA required before Phase D code ships

Code-inspection proves call graphs are equivalent, but the following should still be smoked in a real browser once the app is reachable:

- Upload 3 cards → click "Extract" → confirm cards move through processing → done → confirmed with 5s countdown.
- Cancel countdown on one card → confirm it stays at `done`/`partial` and is still included in "Save N Contacts".
- Minimize during extraction → confirm floating bubble shows progress → auto-save toast fires when done.
- Open Scan Card → upload front image → confirm crop editor opens → confirm → "Extract Contact" → contact auto-saves.
- Open New Contact → upload front image → confirm crop → confirm OCR consent dialog appears with Auto-fill / Manual options.

## Outcome

**PASS (code-inspection + build).** Phase D frontend work is cleared to start. `NewContactForm.tsx` split is tracked as a Phase D+ follow-up in `newcontactform-split-proposal.md`.
