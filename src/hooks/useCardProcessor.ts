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

  function getBrightness(x: number, y: number): number {
    const i = (y * width + x) * 4;
    return (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
  }

  const corners = [
    getBrightness(2, 2),
    getBrightness(width - 3, 2),
    getBrightness(2, height - 3),
    getBrightness(width - 3, height - 3),
  ];
  const bgBrightness = corners.reduce((a, b) => a + b, 0) / 4;

  const isDarkBackground = bgBrightness < 100;
  const threshold = isDarkBackground ? 40 : 30;

  let top = 0, bottom = height - 1, left = 0, right = width - 1;

  for (let y = 0; y < height * 0.4; y++) {
    let rowDiff = 0;
    for (let x = Math.floor(width * 0.2); x < width * 0.8; x += 5) {
      rowDiff += Math.abs(getBrightness(x, y) - bgBrightness);
    }
    rowDiff /= (width * 0.6 / 5);
    if (rowDiff > threshold) { top = Math.max(0, y - 2); break; }
  }

  for (let y = height - 1; y > height * 0.6; y--) {
    let rowDiff = 0;
    for (let x = Math.floor(width * 0.2); x < width * 0.8; x += 5) {
      rowDiff += Math.abs(getBrightness(x, y) - bgBrightness);
    }
    rowDiff /= (width * 0.6 / 5);
    if (rowDiff > threshold) { bottom = Math.min(height - 1, y + 2); break; }
  }

  for (let x = 0; x < width * 0.4; x++) {
    let colDiff = 0;
    for (let y = Math.floor(height * 0.2); y < height * 0.8; y += 5) {
      colDiff += Math.abs(getBrightness(x, y) - bgBrightness);
    }
    colDiff /= (height * 0.6 / 5);
    if (colDiff > threshold) { left = Math.max(0, x - 2); break; }
  }

  for (let x = width - 1; x > width * 0.6; x--) {
    let colDiff = 0;
    for (let y = Math.floor(height * 0.2); y < height * 0.8; y += 5) {
      colDiff += Math.abs(getBrightness(x, y) - bgBrightness);
    }
    colDiff /= (height * 0.6 / 5);
    if (colDiff > threshold) { right = Math.min(width - 1, x + 2); break; }
  }

  const detectedW = right - left;
  const detectedH = bottom - top;
  const aspectRatio = detectedW / detectedH;

  const isValidRegion =
    detectedW > width * 0.3 &&
    detectedH > height * 0.3 &&
    aspectRatio > 1.2 &&
    aspectRatio < 3.0;

  if (!isValidRegion) {
    return { left: 10, top: 10, width: 80, height: 80 };
  }

  return {
    left: (left / width) * 100,
    top: (top / height) * 100,
    width: (detectedW / width) * 100,
    height: (detectedH / height) * 100,
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

  const res = await fetch('/api/contacts/ocr', {
    method: 'POST',
    body: form,
    headers: { Authorization: authHeader },
  });
  if (!res.ok) throw new Error(`OCR failed: ${res.status}`);
  return res.json();
}

function classifyOcrResult(result: {
  front: OcrResult;
  back?: OcrResult;
}): CardProcessorState {
  const front = result.front;

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
  processFile: (file: File) => Promise<void>;
  confirmCrop: (croppedBlob: Blob, side: 'front' | 'back') => Promise<void>;
  processBatch: (files: File[]) => Promise<void>;
  reset: () => void;
}

export function useCardProcessor(
  _options?: UseCardProcessorOptions,
): UseCardProcessorReturn {
  const [state, setState] = useState<CardProcessorState>({ status: 'idle' });
  const currentUrlRef = useRef<string | null>(null);
  // Accumulates the front-side OCR between sequential confirmCrop calls so
  // that confirmCrop(_, 'back') can emit a combined { front, back } state.
  const frontOcrRef = useRef<OcrResult | null>(null);

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

  const confirmCrop = useCallback(
    async (croppedBlob: Blob, side: 'front' | 'back'): Promise<void> => {
      try {
        revokeCurrentUrl();
        setState({ status: 'ocr_running' });
        // Always send the cropped blob as front_image; the API returns its OCR
        // on the `front` key. We relabel back-side calls in the hook.
        const response = await runOCR(croppedBlob);
        const ocrForBlob = response.front;

        if (side === 'front') {
          frontOcrRef.current = ocrForBlob;
          setState(classifyOcrResult({ front: ocrForBlob }));
        } else {
          const storedFront = frontOcrRef.current;
          if (!storedFront) {
            // Edge case: back arrived without a prior front — treat as front.
            frontOcrRef.current = ocrForBlob;
            setState(classifyOcrResult({ front: ocrForBlob }));
          } else {
            setState(classifyOcrResult({ front: storedFront, back: ocrForBlob }));
          }
        }
      } catch (err) {
        setState({
          status: 'ocr_failure',
          error: err instanceof Error ? err.message : 'OCR failed',
        });
      }
    },
    [],
  );

  const processBatch = useCallback(
    async (files: File[]): Promise<void> => {
      for (const file of files) {
        await processFile(file);
        const processed = await preprocessImage(file);
        await confirmCrop(processed, 'front');
      }
    },
    [processFile, confirmCrop],
  );

  const reset = useCallback((): void => {
    revokeCurrentUrl();
    frontOcrRef.current = null;
    setState({ status: 'idle' });
  }, []);

  return { state, processFile, confirmCrop, processBatch, reset };
}
