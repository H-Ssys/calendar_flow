import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Cropper, CropperRef } from 'react-advanced-cropper';
import type { CropperState } from 'advanced-cropper';
import 'react-advanced-cropper/dist/style.css';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface CardCropEditorProps {
  imageSrc: string;
  initialBounds?: { left: number; top: number; width: number; height: number };
  currentSide: 'front' | 'back';
  onConfirm: (blob: Blob, side: 'front' | 'back') => void;
  onRedo: () => void;
  isOpen: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CardCropEditor({
  imageSrc,
  initialBounds,
  currentSide,
  onConfirm,
  onRedo,
  isOpen,
}: CardCropEditorProps) {
  const [displayRotation, setDisplayRotation] = useState(0);
  const cropperRef = useRef<CropperRef>(null);
  // Tracks the slider's last-applied absolute rotation so we can derive deltas
  // for cropperRef.transformImage({ rotate: delta }).
  const lastRotation = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    console.log('CardCropEditor imageSrc:', imageSrc);
    console.log('CardCropEditor initialBounds:', initialBounds);
    lastRotation.current = 0;
    setDisplayRotation(0);
  }, [isOpen, imageSrc, initialBounds]);

  const handleRotationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = Number(e.target.value);
    const delta = newVal - lastRotation.current;
    lastRotation.current = newVal;
    setDisplayRotation(newVal);
    cropperRef.current?.transformImage({ rotate: delta });
  };

  const handleLevel = () => {
    const delta = -lastRotation.current;
    lastRotation.current = 0;
    setDisplayRotation(0);
    if (delta !== 0) {
      cropperRef.current?.transformImage({ rotate: delta });
    }
  };

  const handleZoomIn = () => {
    cropperRef.current?.zoomImage(1.2);
  };

  const handleZoomOut = () => {
    cropperRef.current?.zoomImage(0.8);
  };

  const handleUseCrop = () => {
    const canvas = cropperRef.current?.getCanvas();
    if (!canvas) {
      onConfirm(new Blob(), currentSide);
      return;
    }
    canvas.toBlob(
      (blob) => {
        onConfirm(blob ?? new Blob(), currentSide);
      },
      'image/jpeg',
      0.9,
    );
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) onRedo();
  };

  // initialBounds comes from detectCardBounds() as percentages (0–100).
  // Convert to absolute pixel coords of the source image.
  const defaultCoordinates = initialBounds
    ? (state: CropperState) => ({
        left:   (initialBounds.left   / 100) * state.imageSize.width,
        top:    (initialBounds.top    / 100) * state.imageSize.height,
        width:  (initialBounds.width  / 100) * state.imageSize.width,
        height: (initialBounds.height / 100) * state.imageSize.height,
      })
    : undefined;

  const sideLabel = currentSide === 'front' ? 'Front side' : 'Back side';

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={[
          'max-w-[740px] w-full',
          'h-[100dvh] sm:h-auto sm:max-h-[90vh]',
          'p-0 gap-0',
          'border-0 sm:border sm:rounded-xl',
          'flex flex-col',
          'overflow-hidden',
        ].join(' ')}
      >
        <DialogTitle className="sr-only">Crop Namecard Image ({sideLabel})</DialogTitle>
        <DialogDescription className="sr-only">
          Adjust the crop area, rotation, and zoom for the {sideLabel.toLowerCase()} of the namecard.
        </DialogDescription>

        {/* ── Header (shrink-0) ──────────────────────────────────────────── */}
        <div className="shrink-0 px-6 pt-4 pb-2 text-center border-b border-neutral-200 dark:border-neutral-800">
          <span className="text-xs uppercase tracking-widest font-semibold text-neutral-500 dark:text-neutral-400">
            Cropping {sideLabel}
          </span>
        </div>

        {/* ── Persistent auto-crop detection banner (shrink-0) ───────────── */}
        {initialBounds && (
          <div className="shrink-0 text-xs text-center bg-blue-50 text-blue-600 border-b border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 py-1 px-2">
            Card edges detected — drag handles to adjust
          </div>
        )}

        {/* ── Cropper (flex-1 + min-h-0 so it shrinks to fit) ────────────── */}
        <div className="flex-1 min-h-0 overflow-hidden bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center p-4">
          {imageSrc ? (
            <Cropper
              ref={cropperRef}
              src={imageSrc}
              transitions={true}
              defaultCoordinates={defaultCoordinates}
              stencilProps={{
                aspectRatio: { minimum: 1.4, maximum: 2.2 },
                grid: true,
              }}
              zoom={{ wheel: { ratio: 0.1 } } as any}
              className="w-full h-full max-w-[640px]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-neutral-500">
              No image
            </div>
          )}
        </div>

        {/* ── Zoom controls (shrink-0) ───────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-center gap-3 px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <button
            type="button"
            onClick={handleZoomOut}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-sm border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            title="Zoom out 20%"
          >
            <ZoomOut size={14} />
            Zoom out −
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-sm border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            title="Zoom in 20%"
          >
            <ZoomIn size={14} />
            Zoom in +
          </button>
        </div>

        {/* ── Rotation control (shrink-0) ────────────────────────────────── */}
        <div className="shrink-0 px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <label
              htmlFor="card-rotation-slider"
              className="text-sm font-medium text-neutral-700 dark:text-neutral-300 shrink-0"
            >
              Rotation
            </label>
            <input
              id="card-rotation-slider"
              type="range"
              min={-45}
              max={45}
              step={1}
              value={displayRotation}
              onChange={handleRotationChange}
              className="flex-1 h-2 cursor-pointer accent-indigo-600"
            />
            <span className="text-sm font-mono text-neutral-500 dark:text-neutral-400 w-10 text-right tabular-nums shrink-0">
              {displayRotation}°
            </span>
            <Button
              id="rotation-level-btn"
              variant="outline"
              size="sm"
              onClick={handleLevel}
              className="h-7 px-3 text-xs gap-1.5 shrink-0"
              title="Reset rotation to 0°"
            >
              <RotateCcw size={11} />
              Level
            </Button>
          </div>
        </div>

        {/* ── Action bar (shrink-0, always visible) ──────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <Button
            id="crop-redo-btn"
            variant="outline"
            onClick={onRedo}
            className="gap-1"
          >
            ← Redo
          </Button>
          <Button
            id="crop-use-btn"
            onClick={handleUseCrop}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
          >
            Use this crop →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
