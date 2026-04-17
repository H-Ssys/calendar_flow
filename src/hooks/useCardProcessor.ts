import { useCallback, useRef, useState } from 'react';
import { supabase } from '@ofative/supabase-client';
import type {
  CardProcessorState,
  CropBounds,
  OcrResult,
} from '@/types/contact';

// Only 'name' is truly required — a card without a name is unreadable.
// email / phone / company are "useful-but-optional" — missing any of them
// yields ocr_partial so the form still prefills what it can.
const OPTIONAL_CONTACT_FIELDS = ['email', 'phone', 'company'] as const;

const MOCK_OCR: OcrResult = {
  name: 'Tanaka Kenji',
  title: 'Product Director',
  company: 'Softbank Corp',
  email: 'k.tanaka@softbank.co.jp',
  phone: '+81 90-1234-5678',
  language: 'en',
  raw_text:
    'Tanaka Kenji Product Director Softbank Corp k.tanaka@softbank.co.jp +81 90-1234-5678',
};

// Tight fallback so the stencil is visibly inset — makes it obvious to the
// user that a crop frame is present even when edge detection bails out.
const FALLBACK_BOUNDS: CropBounds = { left: 10, top: 15, width: 80, height: 70 };

async function getAuthHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated — please sign in');
  return `Bearer ${token}`;
}

export async function preprocessImage(file: File): Promise<Blob> {
  let source: Blob = file;
  const isHeic =
    file.type === 'image/heic' || /\.heic$/i.test(file.name);

  if (isHeic) {
    const heic2any = (await import('heic2any')).default;
    const converted = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    });
    source = (Array.isArray(converted) ? converted[0] : converted) as Blob;
  }

  const compress = (await import('browser-image-compression')).default;
  return compress(source as File, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
  });
}

function scanEdges(
  data: ImageData,
  width: number,
  height: number,
): CropBounds {
  const pixels = data.data;

  // ── 1. Build grayscale buffer ──────────────────────────────────────────────
  const gray = new Float32Array(width * height);
  for (let i = 0, j = 0; i < pixels.length; i += 4, j++) {
    gray[j] = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
  }

  // ── 2. Separable 5×5 box blur to smooth texture (wood grain, fabric) ──────
  const tmp = new Float32Array(width * height);
  const blr = new Float32Array(width * height);

  // Horizontal pass (radius 2)
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let s = 0, n = 0;
      const x0 = Math.max(0, x - 2);
      const x1 = Math.min(width - 1, x + 2);
      for (let dx = x0; dx <= x1; dx++) { s += gray[row + dx]; n++; }
      tmp[row + x] = s / n;
    }
  }

  // Vertical pass (radius 2)
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let s = 0, n = 0;
      const y0 = Math.max(0, y - 2);
      const y1 = Math.min(height - 1, y + 2);
      for (let dy = y0; dy <= y1; dy++) { s += tmp[dy * width + x]; n++; }
      blr[y * width + x] = s / n;
    }
  }

  // ── 3. Row gradient projection (finds horizontal edges → top / bottom) ────
  // For each row, sum the absolute vertical brightness change across all pixels.
  // Card edges produce a continuous gradient line; texture noise averages out.
  const rowScore = new Float32Array(height);
  for (let y = 1; y < height - 1; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      sum += Math.abs(blr[(y + 1) * width + x] - blr[(y - 1) * width + x]);
    }
    rowScore[y] = sum / width;
  }

  // ── 4. Column gradient projection (finds vertical edges → left / right) ───
  const colScore = new Float32Array(width);
  for (let x = 1; x < width - 1; x++) {
    let sum = 0;
    for (let y = 0; y < height; y++) {
      sum += Math.abs(blr[y * width + x + 1] - blr[y * width + x - 1]);
    }
    colScore[x] = sum / height;
  }

  // ── 5. Find strongest gradient peak in each half ──────────────────────────
  // Top edge: strongest row gradient in bottom half of the image
  let topEdge = 0, maxTop = 0;
  for (let y = 1; y < Math.floor(height * 0.5); y++) {
    if (rowScore[y] > maxTop) { maxTop = rowScore[y]; topEdge = y; }
  }

  // Bottom edge: strongest row gradient in bottom half
  let bottomEdge = height - 1, maxBot = 0;
  for (let y = Math.floor(height * 0.5); y < height - 1; y++) {
    if (rowScore[y] > maxBot) { maxBot = rowScore[y]; bottomEdge = y; }
  }

  // Left edge: strongest column gradient in left half
  let leftEdge = 0, maxLeft = 0;
  for (let x = 1; x < Math.floor(width * 0.5); x++) {
    if (colScore[x] > maxLeft) { maxLeft = colScore[x]; leftEdge = x; }
  }

  // Right edge: strongest column gradient in right half
  let rightEdge = width - 1, maxRight = 0;
  for (let x = Math.floor(width * 0.5); x < width - 1; x++) {
    if (colScore[x] > maxRight) { maxRight = colScore[x]; rightEdge = x; }
  }

  // ── 6. Validate detected region ───────────────────────────────────────────
  const dw = rightEdge - leftEdge;
  const dh = bottomEdge - topEdge;

  if (dw < width * 0.15 || dh < height * 0.15) {
    return { left: 10, top: 10, width: 80, height: 80 };
  }

  // Tiny inward nudge (1 px) to trim shadow / transition at the very edge
  const nudge = 1;
  return {
    left:   ((leftEdge + nudge) / width) * 100,
    top:    ((topEdge + nudge) / height) * 100,
    width:  ((dw - nudge * 2) / width) * 100,
    height: ((dh - nudge * 2) / height) * 100,
  };
}

const MAX_DETECT_SIZE = 800;

export async function detectCardBounds(imageUrl: string): Promise<CropBounds> {
  try {
    if (typeof OffscreenCanvas === 'undefined') return FALLBACK_BOUNDS;

    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const scale = Math.min(1, MAX_DETECT_SIZE / Math.max(bitmap.width, bitmap.height));
    const w = Math.floor(bitmap.width * scale);
    const h = Math.floor(bitmap.height * scale);

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) return FALLBACK_BOUNDS;

    ctx.drawImage(bitmap, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const bounds = scanEdges(imageData, w, h);
    console.log('detectCardBounds result:', bounds);
    return bounds;
  } catch {
    console.log('detectCardBounds result:', FALLBACK_BOUNDS, '(error fallback)');
    return FALLBACK_BOUNDS;
  }
}

// DOM-based variant used by the crop editor's "Auto crop" button.
// Works with blob:/object URLs, data URLs, and same-origin http(s) URLs.
export async function detectCardBoundsFromUrl(url: string): Promise<CropBounds> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const scale = Math.min(
          1,
          MAX_DETECT_SIZE / Math.max(img.naturalWidth, img.naturalHeight),
        );
        const w = Math.floor(img.naturalWidth * scale);
        const h = Math.floor(img.naturalHeight * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(FALLBACK_BOUNDS);
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h);
        const bounds = scanEdges(data, w, h);
        console.log('detectCardBoundsFromUrl result:', bounds);
        resolve(bounds);
      } catch {
        resolve(FALLBACK_BOUNDS);
      }
    };
    img.onerror = () => resolve(FALLBACK_BOUNDS);
    img.src = url;
  });
}

async function runOCR(
  frontBlob: Blob,
  backBlob?: Blob,
): Promise<{ front: OcrResult; back?: OcrResult }> {
  if (import.meta.env.VITE_OCR_MOCK === 'true') {
    await new Promise((r) => setTimeout(r, 900));
    return { front: MOCK_OCR, back: backBlob ? MOCK_OCR : undefined };
  }

  const authHeader = await getAuthHeader();
  const { data: { user } } = await supabase.auth.getUser();

  const form = new FormData();
  form.append('front_image', frontBlob, 'front.jpg');
  if (backBlob) form.append('back_image', backBlob, 'back.jpg');
  form.append('user_id', user?.id ?? '');

  // 90-second client-side timeout so the request doesn't hang indefinitely
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const res = await fetch('/api/contacts/ocr', {
      method: 'POST',
      body: form,
      headers: { Authorization: authHeader },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`OCR failed: ${res.status}`);
    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('OCR timed out after 90 seconds — please try again');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function classifyOcrResult(result: {
  front: OcrResult;
  back?: OcrResult;
}): CardProcessorState {
  const front = result.front;

  // Check if the backend returned an explicit error (timeout, API failure, etc.)
  // The backend wraps Gemini errors as { raw_text: null, error: "..." } — surface
  // the actual cause instead of the generic "Card unreadable" message.
  const backendError = (front as any)?.error;
  if (backendError) {
    const msg =
      backendError === 'timeout'
        ? 'OCR timed out — the AI service was too slow. Please try again.'
        : `OCR error: ${backendError}`;
    return { status: 'ocr_failure', error: msg };
  }

  // Truly unreadable only when we have neither a name nor any raw text.
  if (!front.name && !front.raw_text) {
    return {
      status: 'ocr_failure',
      error: 'Card unreadable — please enter manually',
    };
  }

  const missingFields = OPTIONAL_CONTACT_FIELDS.filter((field) => {
    const value = front[field];
    return value === null || value === undefined || value === '';
  });

  if (missingFields.length > 0) {
    return {
      status: 'ocr_partial',
      front: result.front,
      back: result.back,
      missingFields: [...missingFields],
    };
  }

  return { status: 'ocr_success', front: result.front, back: result.back };
}

export interface UseCardProcessorOptions {
  mode?: 'scan' | 'new' | 'batch';
}

export interface UseCardProcessorReturn {
  state: CardProcessorState;
  /** Number of OCR requests currently in flight (background). */
  pendingOcr: number;
  processFile: (file: File) => Promise<void>;
  /** Fire-and-forget: kicks off OCR in the background, returns immediately. */
  confirmCrop: (croppedBlob: Blob, side: 'front' | 'back') => void;
  /** Fire-and-forget: sends front (+ optional back) in one API call. */
  extractCard: (frontBlob: Blob, backBlob?: Blob) => void;
  processBatch: (files: File[]) => Promise<void>;
  reset: () => void;
}

export function useCardProcessor(
  _options?: UseCardProcessorOptions,
): UseCardProcessorReturn {
  const [state, setState] = useState<CardProcessorState>({ status: 'idle' });
  const [pendingOcr, setPendingOcr] = useState(0);
  const currentUrlRef = useRef<string | null>(null);
  // Accumulates the front-side OCR between background confirmCrop calls so
  // that whichever side finishes second can emit combined { front, back }.
  const frontOcrRef = useRef<OcrResult | null>(null);
  const backOcrRef = useRef<OcrResult | null>(null);

  const revokeCurrentUrl = () => {
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }
  };

  const processFile = useCallback(async (file: File): Promise<void> => {
    try {
      revokeCurrentUrl();
      setState({ status: 'preprocessing' });
      const processed = await preprocessImage(file);
      const imageUrl = URL.createObjectURL(processed);
      currentUrlRef.current = imageUrl;
      const detectedBounds = await detectCardBounds(imageUrl);
      setState({ status: 'crop_pending', imageUrl, detectedBounds });
    } catch (err) {
      setState({
        status: 'ocr_failure',
        error: err instanceof Error ? err.message : 'Preprocessing failed',
      });
    }
  }, []);

  // Fire-and-forget: kicks off OCR in the background, returns immediately
  // so the user can continue uploading the next card without waiting.
  const confirmCrop = useCallback(
    (croppedBlob: Blob, side: 'front' | 'back'): void => {
      revokeCurrentUrl();
      setPendingOcr((c) => c + 1);
      // Immediately free the UI — don't set ocr_running which blocks.
      setState({ status: 'idle' });

      runOCR(croppedBlob)
        .then((response) => {
          const ocrForBlob = response.front;

          if (side === 'front') {
            frontOcrRef.current = ocrForBlob;
            // If back OCR already arrived, combine both
            const existingBack = backOcrRef.current;
            setState(
              classifyOcrResult({
                front: ocrForBlob,
                back: existingBack ?? undefined,
              }),
            );
          } else {
            backOcrRef.current = ocrForBlob;
            const storedFront = frontOcrRef.current;
            if (!storedFront) {
              // Back arrived before front — just store; front completion will
              // pick it up and emit the combined result.
            } else {
              setState(
                classifyOcrResult({ front: storedFront, back: ocrForBlob }),
              );
            }
          }
        })
        .catch((err) => {
          setState({
            status: 'ocr_failure',
            error: err instanceof Error ? err.message : 'OCR request failed',
          });
        })
        .finally(() => {
          setPendingOcr((c) => c - 1);
        });
    },
    [],
  );

  // Single API call with both images — backend runs them in parallel.
  const extractCard = useCallback(
    (front: Blob, back?: Blob): void => {
      revokeCurrentUrl();
      setPendingOcr((c) => c + 1);
      setState({ status: 'idle' });

      runOCR(front, back)
        .then((response) => {
          frontOcrRef.current = response.front;
          if (response.back) backOcrRef.current = response.back;
          setState(
            classifyOcrResult({
              front: response.front,
              back: response.back,
            }),
          );
        })
        .catch((err) => {
          setState({
            status: 'ocr_failure',
            error: err instanceof Error ? err.message : 'OCR request failed',
          });
        })
        .finally(() => {
          setPendingOcr((c) => c - 1);
        });
    },
    [],
  );

  const processBatch = useCallback(
    async (files: File[]): Promise<void> => {
      for (const file of files) {
        await processFile(file);
        const processed = await preprocessImage(file);
        confirmCrop(processed, 'front');
      }
    },
    [processFile, confirmCrop],
  );

  const reset = useCallback((): void => {
    revokeCurrentUrl();
    frontOcrRef.current = null;
    backOcrRef.current = null;
    setPendingOcr(0);
    setState({ status: 'idle' });
  }, []);

  return { state, pendingOcr, processFile, confirmCrop, extractCard, processBatch, reset };
}
