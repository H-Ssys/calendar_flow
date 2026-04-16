import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, RotateCcw } from 'lucide-react';
import { Cropper, CropperRef } from 'react-advanced-cropper';
import type { CropperState } from 'advanced-cropper';
import 'react-advanced-cropper/dist/style.css';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface CardCropEditorProps {
  imageSrc: string;
  initialBounds?: { left: number; top: number; width: number; height: number };
  onConfirm: (blob: Blob, side: 'front' | 'back') => void;
  onRedo: () => void;
  isOpen: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CardCropEditor({
  imageSrc,
  initialBounds,
  onConfirm,
  onRedo,
  isOpen,
}: CardCropEditorProps) {
  const [rotation, setRotation] = useState(0);
  const [step, setStep] = useState<'crop' | 'side-selection'>('crop');
  const [selectedSide, setSelectedSide] = useState<'front' | 'back' | null>(null);
  const cropperRef = useRef<CropperRef>(null);

  useEffect(() => {
    if (!isOpen) return;
    console.log('CardCropEditor imageSrc:', imageSrc);
    console.log('CardCropEditor initialBounds:', initialBounds);
    setRotation(0);
    setStep('crop');
    setSelectedSide(null);
  }, [isOpen, imageSrc, initialBounds]);

  const handleLevel = () => setRotation(0);

  const handleUseCrop = () => setStep('side-selection');

  const handleConfirmSide = () => {
    if (!selectedSide) return;
    const canvas = cropperRef.current?.getCanvas();
    if (!canvas) {
      onConfirm(new Blob(), selectedSide);
      return;
    }
    canvas.toBlob(
      (blob) => {
        onConfirm(blob ?? new Blob(), selectedSide);
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

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {/*
       * Layout:
       *   Mobile  → full-screen (h-[100dvh], rounded-none)
       *   Desktop → centered modal, max-w-[740px], max-h-[90vh]
       */}
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
        {/* Accessible title / description (visually hidden) */}
        <DialogTitle className="sr-only">Crop Namecard Image</DialogTitle>
        <DialogDescription className="sr-only">
          Adjust the crop area and rotation, then choose which side of the namecard this is.
        </DialogDescription>

        {/* ── Scrollable editor body ─────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-neutral-100 dark:bg-neutral-900 flex flex-col items-center justify-start">

          {/* Crop area */}
          <div className="w-full flex-1 flex items-center justify-center p-6 min-h-[260px] sm:min-h-[340px]">
            <div
              className="w-full max-w-[640px] aspect-[1.75/1] rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700"
              style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 200ms' }}
            >
              {imageSrc ? (
                <Cropper
                  ref={cropperRef}
                  src={imageSrc}
                  defaultCoordinates={defaultCoordinates}
                  stencilProps={{ aspectRatio: 1.75 / 1, grid: true }}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-neutral-500">
                  No image
                </div>
              )}
            </div>
          </div>

          {/* ── Rotation control ──────────────────────────────────────────── */}
          <div className="w-full max-w-sm mx-auto mb-6 px-4">
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-4 space-y-3">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <label
                  htmlFor="card-rotation-slider"
                  className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Rotation
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-neutral-500 dark:text-neutral-400 w-10 text-right tabular-nums">
                    {rotation}°
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

              {/* Slider */}
              <input
                id="card-rotation-slider"
                type="range"
                min={-45}
                max={45}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full h-2 cursor-pointer accent-indigo-600 block"
              />
            </div>
          </div>
        </div>

        {/* ── Action bar (fixed at bottom, never scrolls) ────────────────── */}
        <div className="shrink-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700">

          {step === 'crop' ? (
            /* ── Step 1: crop controls ───────────────────────────────────── */
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

          ) : (
            /* ── Step 2: side selection (replaces action bar in-place) ───── */
            <div className="p-4 sm:p-6 flex flex-col gap-4 animate-in slide-in-from-bottom-2 fade-in duration-200">
              <h3 className="text-base font-semibold text-center text-neutral-900 dark:text-neutral-100">
                Which side is this?
              </h3>

              {/* Side cards */}
              <div className="flex gap-3">
                <SideCard
                  id="side-front-btn"
                  label="Front side"
                  selected={selectedSide === 'front'}
                  onClick={() => setSelectedSide('front')}
                />
                <SideCard
                  id="side-back-btn"
                  label="Back side"
                  selected={selectedSide === 'back'}
                  onClick={() => setSelectedSide('back')}
                />
              </div>

              {/* Confirm — only appears after selection */}
              {selectedSide && (
                <Button
                  id="crop-confirm-side-btn"
                  size="lg"
                  onClick={handleConfirmSide}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white animate-in fade-in duration-150"
                >
                  Confirm side
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── SideCard sub-component ──────────────────────────────────────────────────

interface SideCardProps {
  id: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}

function SideCard({ id, label, selected, onClick }: SideCardProps) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className={[
        'relative flex-1 py-6 px-4 rounded-lg text-center',
        'border-2 transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1',
        selected
          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 shadow-sm'
          : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-500',
      ].join(' ')}
    >
      {/* Checkmark badge */}
      {selected && (
        <span className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-0.5 shadow-sm">
          <Check size={12} strokeWidth={3} />
        </span>
      )}

      <span
        className={
          selected
            ? 'text-sm font-semibold text-indigo-900 dark:text-indigo-300'
            : 'text-sm font-medium text-neutral-700 dark:text-neutral-300'
        }
      >
        {label}
      </span>
    </button>
  );
}
