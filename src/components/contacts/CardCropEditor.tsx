import React, { useRef, useState } from 'react';
import { Cropper, type CropperRef } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

export interface CardCropEditorProps {
  imageSrc: string;
  initialBounds?: { left: number; top: number; width: number; height: number };
  onConfirm: (blob: Blob, side: 'front' | 'back') => void;
  onRedo: () => void;
  isOpen: boolean;
}

export function CardCropEditor({
  imageSrc,
  initialBounds,
  onConfirm,
  onRedo,
  isOpen,
}: CardCropEditorProps) {
  const cropperRef = useRef<CropperRef>(null);
  const rotationRef = useRef<number>(0);
  const [displayRotation, setDisplayRotation] = useState<number>(0);
  const [step, setStep] = useState<'crop' | 'side-selection'>('crop');
  const [selectedSide, setSelectedSide] = useState<'front' | 'back' | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setStep('crop');
      rotationRef.current = 0;
      setDisplayRotation(0);
      setSelectedSide(null);
      setCroppedBlob(null);
    }
  }, [isOpen]);

  const handleRotationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    const delta = newValue - rotationRef.current;
    rotationRef.current = newValue;
    cropperRef.current?.rotateImage(delta);
  };

  const handleRotationRelease = () => {
    setDisplayRotation(rotationRef.current);
  };

  const handleLevel = () => {
    cropperRef.current?.rotateImage(-rotationRef.current);
    rotationRef.current = 0;
    setDisplayRotation(0);
  };

  const handleUseCrop = () => {
    const canvas = cropperRef.current?.getCanvas({ width: 1920 });
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCroppedBlob(blob);
          setStep('side-selection');
        }
      },
      'image/jpeg',
      0.90,
    );
  };

  const handleConfirmSide = () => {
    if (croppedBlob && selectedSide) {
      onConfirm(croppedBlob, selectedSide);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onRedo(); }}>
      <DialogContent
        className="max-w-[740px] w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 flex flex-col gap-0 border-0 sm:border overflow-hidden"
      >
        <DialogTitle className="sr-only">Crop Image</DialogTitle>
        <DialogDescription className="sr-only">Crop and adjust your scanned namecard image before processing</DialogDescription>

        {/* Main Editor Area */}
        <div className="flex-1 min-h-0 bg-neutral-100 flex flex-col items-center justify-center p-4">

          <Cropper
            ref={cropperRef}
            src={imageSrc}
            defaultCoordinates={initialBounds ? {
              left:   initialBounds.left,
              top:    initialBounds.top,
              width:  initialBounds.width,
              height: initialBounds.height,
            } : undefined}
            stencilProps={{ aspectRatio: { minimum: 1.4, maximum: 2.2 } }}
            className="w-full"
            style={{ maxHeight: '60vh' }}
          />

          {/* Rotation Control */}
          <div className="w-full max-w-sm mt-8 space-y-4 bg-white p-4 rounded-xl shadow-sm border border-neutral-200">
            <div className="flex justify-between items-center">
              <label htmlFor="rotation-slider" className="text-sm font-medium text-neutral-700">Rotation</label>
              <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-500 font-mono w-10 text-right">{displayRotation}°</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleLevel}
                  className="h-7 text-xs px-3"
                >
                  Level
                </Button>
              </div>
            </div>
            <input
              id="rotation-slider"
              type="range"
              min="-45"
              max="45"
              defaultValue={0}
              onChange={handleRotationChange}
              onMouseUp={handleRotationRelease}
              onTouchEnd={handleRotationRelease}
              className="w-full accent-primary-600 block"
            />
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white">
          {step === 'crop' ? (
            <div className="flex justify-between items-center p-4 sm:px-6 border-t border-neutral-200">
              <Button variant="outline" onClick={onRedo}>
                ← Redo
              </Button>
              <Button onClick={handleUseCrop} className="bg-primary-600 hover:bg-primary-700 text-white">
                Use this crop →
              </Button>
            </div>
          ) : (
            <div className="p-4 sm:p-6 border-t border-neutral-200 flex flex-col gap-4 animate-in slide-in-from-bottom-2 fade-in duration-200">
              <h3 className="text-lg font-semibold text-center text-neutral-900">Which side is this?</h3>

              <div className="flex gap-4">
                {/* Front side card */}
                <button
                  className={`relative flex-1 p-6 rounded-lg border-2 text-center transition-all ${
                    selectedSide === 'front'
                      ? 'border-primary-600 bg-primary-50 shadow-sm'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                  onClick={() => setSelectedSide('front')}
                >
                  {selectedSide === 'front' && (
                    <div className="absolute top-2 right-2 bg-primary-600 text-white p-0.5 rounded-full shadow-sm">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                  <span className={selectedSide === 'front' ? 'font-semibold text-primary-900' : 'font-medium text-neutral-700'}>
                    Front side
                  </span>
                </button>

                {/* Back side card */}
                <button
                  className={`relative flex-1 p-6 rounded-lg border-2 text-center transition-all ${
                    selectedSide === 'back'
                      ? 'border-primary-600 bg-primary-50 shadow-sm'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                  onClick={() => setSelectedSide('back')}
                >
                  {selectedSide === 'back' && (
                    <div className="absolute top-2 right-2 bg-primary-600 text-white p-0.5 rounded-full shadow-sm">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                  <span className={selectedSide === 'back' ? 'font-semibold text-primary-900' : 'font-medium text-neutral-700'}>
                    Back side
                  </span>
                </button>
              </div>

              {selectedSide && (
                <Button
                  className="w-full mt-2 bg-primary-600 hover:bg-primary-700 text-white shadow-sm animate-in fade-in"
                  size="lg"
                  onClick={handleConfirmSide}
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
