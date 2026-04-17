import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RotateCcw, Sparkles, ZoomIn, ZoomOut } from 'lucide-react';
import { Cropper, CropperRef } from 'react-advanced-cropper';
import type { CropperState } from 'advanced-cropper';
import { cn } from '@/lib/utils';
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
  const [rotation, setRotation] = useState(0);
  const [displayRotation, setDisplayRotation] = useState(0);
  const [showAutoCropBanner, setShowAutoCropBanner] = useState(false);
  const cropperRef = useRef<CropperRef>(null);

  useEffect(() => {
    if (!isOpen) return;
    console.log('CardCropEditor imageSrc:', imageSrc);
    console.log('CardCropEditor initialBounds:', initialBounds);
    setRotation(0);
    setDisplayRotation(0);
  }, [isOpen, imageSrc, initialBounds]);

  // Flash "Card edge detected" banner for 1.5s whenever the editor opens with bounds.
  useEffect(() => {
    if (isOpen && initialBounds) {
      setShowAutoCropBanner(true);
      const t = setTimeout(() => setShowAutoCropBanner(false), 1500);
      return () => clearTimeout(t);
    }
    setShowAutoCropBanner(false);
  }, [isOpen, initialBounds]);

  const handleLevel = () => {
    setRotation(0);
    setDisplayRotation(0);
  };

  const handleRotationChange = (next: number) => {
    setRotation(next);
    setDisplayRotation(next);
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

  // initialBounds is in percent (0–100). Convert to absolute pixel coords of the
  // source image so react-advanced-cropper can position its stencil.
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

        <div className="flex-1 min-h-0 overflow-y-auto bg-neutral-100 dark:bg-neutral-900 flex flex-col items-center justify-start">

          {/* Side indicator */}
          <div className="w-full px-6 pt-4 pb-2 text-center">
            <span className="text-xs uppercase tracking-widest font-semibold text-neutral-500 dark:text-neutral-400">
              Cropping {sideLabel}
            </span>
          </div>

          {/* Auto-crop detection banner — pulses for 1.5s */}
          <div className="w-full max-w-[640px] px-6 h-8 flex items-center justify-center">
            <div
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300',
                'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800',
                'rounded-full px-3 py-1',
                'transition-opacity duration-500',
                showAutoCropBanner ? 'opacity-100 animate-pulse' : 'opacity-0 pointer-events-none',
              )}
            >
              <Sparkles size={12} />
              Card edge detected — adjust if needed
            </div>
          </div>

          {/* Crop area — image stays still; stencil rotates via stencilProps.rotation */}
          <div className="w-full flex-1 flex items-center justify-center px-6 pb-2 pt-2 min-h-[260px] sm:min-h-[340px]">
            <div className="w-full max-w-[640px] aspect-[1.75/1] rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700">
              {imageSrc ? (
                <Cropper
                  ref={cropperRef}
                  src={imageSrc}
                  transitions={true}
                  defaultCoordinates={defaultCoordinates}
                  stencilProps={{
                    aspectRatio: { minimum: 1.4, maximum: 2.2 },
                    rotation: rotation,
                    grid: true,
                  } as any}
                  zoom={{ wheel: { ratio: 0.1 } } as any}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-neutral-500">
                  No image
                </div>
              )}
            </div>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center justify-center gap-3 py-2">
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

          {/* Rotation control */}
          <div className="w-full max-w-sm mx-auto mb-6 mt-2 px-4">
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="card-rotation-slider"
                  className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Rotation
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-neutral-500 dark:text-neutral-400 w-10 text-right tabular-nums">
                    {displayRotation}°
                  </span>
                  <Button
                    id="rotation-level-btn"
                    variant="outline"
                    size="sm"
                    onClick={handleLevel}
                    className="h-7 px-3 text-xs gap-1.5"
                    title="Reset rotation to 0°"
                  >
                    <RotateCcw size={11} />
                    Level
                  </Button>
                </div>
              </div>
              <input
                id="card-rotation-slider"
                type="range"
                min={-45}
                max={45}
                step={1}
                value={rotation}
                onChange={(e) => handleRotationChange(Number(e.target.value))}
                className="w-full h-2 cursor-pointer accent-indigo-600 block"
              />
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="shrink-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between p-4 sm:px-6">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
