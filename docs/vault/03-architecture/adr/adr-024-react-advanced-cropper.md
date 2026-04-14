---
type: adr
id: adr-024
title: Use react-advanced-cropper for CardCropEditor
status: accepted
date: 2026-04-14
feature: namecard-ocr
supersedes: []
---

# ADR-024 — react-advanced-cropper for CardCropEditor

## Context

Namecard OCR needs an in-browser crop editor with drag handles, rotation,
and pinch/zoom so users can refine the scan region before it is sent to
the OCR endpoint. Business-card aspect ratios cluster around 1.4–2.2, so
the stencil must be configurable rather than square-locked.

Two mainstream React options exist on npm:

1. `react-cropper` — wrapper around Cropper.js
2. `react-advanced-cropper` — independent TypeScript-native library

## Decision

Use **`react-advanced-cropper`**. Do NOT use `react-cropper`.

## Why not react-cropper

- Last published 3 years ago (v2.3.3). No React 18 compatibility guarantee;
  it predates concurrent features and the new JSX transform.
- No active maintenance — issues and PRs sit unanswered.
- TypeScript types come from `@types/react-cropper` out of the core repo
  and have drifted from the underlying Cropper.js API.
- Ref API is imperative-in-a-class-wrapper; awkward in modern hooks code.

## Why react-advanced-cropper

- TypeScript-native API: `CropperRef`, `getCanvas()`, `getCoordinates()`,
  `rotateImage()` are first-class typed exports.
- Actively maintained — ~10k weekly npm downloads as of early 2026.
- Full mobile touch support built-in (pinch zoom, touch drag) without any
  extra gesture library.
- Customisable stencil via `stencilProps={{ aspectRatio: { minimum, maximum } }}`
  — we enforce the 1.4–2.2 card range directly.
- Rotation works out of the box via `cropperRef.current.rotateImage(deg)`.
- Separate CSS bundle lets us tree-shake styles we do not use.

## Installation

```bash
npm install react-advanced-cropper
```

```ts
import { Cropper, CropperRef } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
```

## API reference for CardCropEditor implementation

```ts
// Grab the cropped region as an HTMLCanvasElement at up to 1920px wide
const canvas = cropperRef.current?.getCanvas({ width: 1920 });

// Rotate the source image by delta degrees (negative = counter-clockwise)
cropperRef.current?.rotateImage(90);

// Inspect the current crop rectangle
const { left, top, width, height } = cropperRef.current?.getCoordinates() ?? {};

// Convert the canvas to a Blob for upload (JPEG, quality 0.90)
canvas?.toBlob(
  (blob) => { if (blob) onConfirm(blob, side); },
  'image/jpeg',
  0.90,
);
```

## Consequences

- Adds one frontend dependency (~40 kB gzipped including CSS).
- CardCropEditor is locked to this library's stencil API — swapping later
  would require rewriting the component. Acceptable given the active
  maintenance signal.
- Pairs naturally with `heic2any` (iOS HEIC → JPEG) and
  `browser-image-compression` (pre-OCR resize) already listed in spec C1.
