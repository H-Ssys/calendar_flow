import { useCallback, useState } from 'react';
import { supabase } from '@ofative/supabase-client';
import type {
  CardProcessorState,
  CropBounds,
  OcrResult,
} from '@/types/contact';

const REQUIRED_FIELDS = ['name', 'email', 'phone', 'company'] as const;

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

const FALLBACK_BOUNDS: CropBounds = { left: 5, top: 5, width: 90, height: 90 };

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
    const { data, width, height } = ctx.getImageData(
      0,
      0,
      bitmap.width,
      bitmap.height,
    );

    const brightnessAt = (x: number, y: number): number => {
      const idx = (y * width + x) * 4;
      return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
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
      if (rowDiffers(y)) {
        top = y;
        break;
      }
    }

    let bottom = height - 1;
    for (let y = height - 1; y >= 0; y -= SAMPLE_STEP) {
      if (rowDiffers(y)) {
        bottom = y;
        break;
      }
    }

    let left = 0;
    for (let x = 0; x < width; x += SAMPLE_STEP) {
      if (colDiffers(x)) {
        left = x;
        break;
      }
    }

    let right = width - 1;
    for (let x = width - 1; x >= 0; x -= SAMPLE_STEP) {
      if (colDiffers(x)) {
        right = x;
        break;
      }
    }

    if (right <= left || bottom <= top) return FALLBACK_BOUNDS;

    return {
      left: (left / width) * 100,
      top: (top / height) * 100,
      width: ((right - left) / width) * 100,
      height: ((bottom - top) / height) * 100,
    };
  } catch {
    return FALLBACK_BOUNDS;
  }
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
  const missingFields = REQUIRED_FIELDS.filter((field) => {
    const value = result.front[field];
    return value === null || value === undefined || value === '';
  });

  if (missingFields.length === 0) {
    return { status: 'ocr_success', front: result.front, back: result.back };
  }
  if (missingFields.length <= 2) {
    return {
      status: 'ocr_partial',
      front: result.front,
      back: result.back,
      missingFields: [...missingFields],
    };
  }
  return {
    status: 'ocr_failure',
    error: 'Card unreadable — please enter manually',
  };
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

  const processFile = useCallback(async (file: File): Promise<void> => {
    try {
      setState({ status: 'preprocessing' });
      const processed = await preprocessImage(file);
      const imageUrl = URL.createObjectURL(processed);
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
        setState({ status: 'uploading' });
        setState({ status: 'ocr_running' });
        const result =
          side === 'front'
            ? await runOCR(croppedBlob)
            : await runOCR(croppedBlob, croppedBlob);
        setState(classifyOcrResult(result));
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
    setState({ status: 'idle' });
  }, []);

  return { state, processFile, confirmCrop, processBatch, reset };
}
