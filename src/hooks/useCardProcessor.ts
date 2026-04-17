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

// Shared edge-scan algorithm. Given raw ImageData + dimensions, returns
// the inferred card bounds as percentages of the source image.
function scanEdges(
  imageData: ImageData,
  width: number,
  height: number,
): CropBounds {
  const pixels = imageData.data;

  const brightnessAt = (x: number, y: number): number => {
    const idx = (y * width + x) * 4;
    return (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
  };

  const cornerBrightness =
    (brightnessAt(0, 0) +
      brightnessAt(width - 1, 0) +
      brightnessAt(0, height - 1) +
      brightnessAt(width - 1, height - 1)) /
    4;

  const THRESHOLD = 25;
  const SAMPLE_STEP = Math.max(1, Math.floor(Math.min(width, height) / 200));

  const rowDiffers = (y: number): boolean => {
    let differing = 0;
    for (let x = 0; x < width; x += SAMPLE_STEP) {
      if (Math.abs(brightnessAt(x, y) - cornerBrightness) > THRESHOLD) {
        differing++;
        if (differing > 3) return true;
      }
    }
    return false;
  };

  const colDiffers = (x: number): boolean => {
    let differing = 0;
    for (let y = 0; y < height; y += SAMPLE_STEP) {
      if (Math.abs(brightnessAt(x, y) - cornerBrightness) > THRESHOLD) {
        differing++;
        if (differing > 3) return true;
      }
    }
    return false;
  };

  let top = 0;
  for (let y = 0; y < height; y += SAMPLE_STEP) {
    if (rowDiffers(y)) { top = y; break; }
  }
  let bottom = height - 1;
  for (let y = height - 1; y >= 0; y -= SAMPLE_STEP) {
    if (rowDiffers(y)) { bottom = y; break; }
  }
  let left = 0;
  for (let x = 0; x < width; x += SAMPLE_STEP) {
    if (colDiffers(x)) { left = x; break; }
  }
  let right = width - 1;
  for (let x = width - 1; x >= 0; x -= SAMPLE_STEP) {
    if (colDiffers(x)) { right = x; break; }
  }

  if (right <= left || bottom <= top) return FALLBACK_BOUNDS;

  return {
    left: (left / width) * 100,
    top: (top / height) * 100,
    width: ((right - left) / width) * 100,
    height: ((bottom - top) / height) * 100,
  };
}

export async function detectCardBounds(imageUrl: string): Promise<CropBounds> {
  try {
    if (typeof OffscreenCanvas === 'undefined') return FALLBACK_BOUNDS;

    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return FALLBACK_BOUNDS;

    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const bounds = scanEdges(imageData, bitmap.width, bitmap.height);
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
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(FALLBACK_BOUNDS);
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
        const bounds = scanEdges(data, img.naturalWidth, img.naturalHeight);
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
