import React, { useState, useRef, useEffect } from 'react';
import { useContactContext } from '@/context/ContactContext';
import { Contact, OcrResult } from '@/types/contact';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Camera, Check, Sparkles, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardCropEditor } from '@/components/contacts/CardCropEditor';
import { useCardProcessor } from '@/hooks/useCardProcessor';

interface ScanCardFormProps {
  open: boolean;
  onClose: () => void;
  onExtracted?: (data: Partial<Contact>) => void;
}

type UploadStep =
  | 'idle'
  | 'front_crop'
  | 'front_ocr'
  | 'ask_back'
  | 'back_crop'
  | 'back_ocr'
  | 'done';

interface CardSlotProps {
  side: 'Front' | 'Back';
  image?: string;
  onPickFile: (file: File) => void;
  onCropClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}

const CardSlot: React.FC<CardSlotProps> = ({ side, image, onPickFile, onCropClick, primary, disabled }) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onPickFile(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{side} Side</div>
      <button
        disabled={disabled}
        className={cn(
          "aspect-[3.5/2] w-full rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden",
          image ? "p-0 border-solid" : "hover:bg-primary/5 hover:border-primary/30",
          disabled && "opacity-60 cursor-not-allowed",
        )}
        onClick={() => image ? onCropClick?.() : fileRef.current?.click()}
        title={image ? `Crop ${side.toLowerCase()} side` : `Upload ${side.toLowerCase()} side`}
      >
        {image ? (
          <img src={image} alt={`${side} card`} className="w-full h-full object-cover" />
        ) : (
          <>
            <Camera className="w-8 h-8 text-muted-foreground/30 mb-1.5" />
            <span className="text-xs text-muted-foreground">Click to upload {side.toLowerCase()} side</span>
          </>
        )}
      </button>
      <div className="flex gap-2">
        <Button
          variant={primary ? 'default' : 'outline'}
          className="flex-1 gap-1.5"
          size="sm"
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-3.5 h-3.5" />
          {image ? `Replace ${side}` : `Upload ${side} Image`}
        </Button>
        {image && (
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            onClick={onCropClick}
            title="Open crop editor"
          >
            ✂ Crop
          </Button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*,.heic" className="hidden" onChange={handleFile} />
    </div>
  );
};

export const ScanCardForm: React.FC<ScanCardFormProps> = ({ open, onClose, onExtracted }) => {
  const { addContact } = useContactContext();
  const { state, processFile, confirmCrop, reset: resetProcessor } = useCardProcessor({ mode: 'scan' });

  const [frontImage, setFrontImage] = useState('');
  const [backImage, setBackImage] = useState('');
  const [frontBlob, setFrontBlob] = useState<Blob | null>(null);
  const [backBlob, setBackBlob] = useState<Blob | null>(null);
  const [note, setNote] = useState('');
  const [step, setStep] = useState<UploadStep>('idle');
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Crop editor state
  const [cropOpen, setCropOpen] = useState(false);
  const cropSlotRef = useRef<'front' | 'back'>('front');
  const frontFileRef = useRef<File | null>(null);
  const backFileRef = useRef<File | null>(null);
  // Hidden input we programmatically click when user picks "Add back side"
  const backInputRef = useRef<HTMLInputElement>(null);

  const handlePickFile = async (side: 'front' | 'back', file: File) => {
    cropSlotRef.current = side;
    if (side === 'front') frontFileRef.current = file;
    else backFileRef.current = file;
    setOcrError(null);
    setStep(side === 'front' ? 'front_crop' : 'back_crop');
    await processFile(file);
  };

  const openCropFor = async (side: 'front' | 'back') => {
    const file = side === 'front' ? frontFileRef.current : backFileRef.current;
    if (!file) return;
    cropSlotRef.current = side;
    setStep(side === 'front' ? 'front_crop' : 'back_crop');
    await processFile(file);
  };

  // Auto-open crop editor once preprocessing completes
  useEffect(() => {
    if (state.status === 'crop_pending') {
      setCropOpen(true);
    }
  }, [state.status]);

  // Crop confirmed → run OCR for this side immediately
  const handleCropConfirm = async (blob: Blob, side: 'front' | 'back') => {
    const previewUrl = URL.createObjectURL(blob);
    if (side === 'front') {
      setFrontBlob(blob);
      setFrontImage(previewUrl);
      setStep('front_ocr');
    } else {
      setBackBlob(blob);
      setBackImage(previewUrl);
      setStep('back_ocr');
    }
    setCropOpen(false);
    await confirmCrop(blob, side);
  };

  const handleCropRedo = () => {
    setCropOpen(false);
    resetProcessor();
    // Preserve prior progress: user just cancelled the current crop.
    if (step === 'front_crop') setStep('idle');
    if (step === 'back_crop') setStep('ask_back');
  };

  // React to OCR completion
  useEffect(() => {
    if (state.status === 'ocr_success' || state.status === 'ocr_partial') {
      if (state.status === 'ocr_partial') {
        setMissingFields(state.missingFields);
      } else {
        setMissingFields([]);
      }

      // If state has both front + back OCR, we're done. Otherwise ask for back.
      if (state.back) {
        saveAndReset(state.front, state.back);
      } else {
        setStep('ask_back');
      }
    }
    if (state.status === 'ocr_failure') {
      setOcrError(state.error);
      setStep('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  const saveAndReset = (front: OcrResult, back: OcrResult | undefined) => {
    const extracted = classifyExtracted(front, back);
    const payload: Partial<Contact> = {
      ...extracted,
      frontCardImage: frontImage,
      backCardImage: backImage || undefined,
      note: note || undefined,
    };

    if (onExtracted) {
      onExtracted(payload);
    } else {
      addContact({
        ...(payload as any),
        tags: [],
        starred: false,
        linkedEventIds: [],
        linkedTaskIds: [],
        linkedNoteIds: [],
      });
    }

    setStep('done');
    setSuccessMessage('Contact saved! Upload another card or close.');
    setTimeout(() => {
      setSuccessMessage(null);
      resetLocal();
    }, 2000);
  };

  const resetLocal = () => {
    setFrontImage('');
    setBackImage('');
    setFrontBlob(null);
    setBackBlob(null);
    setNote('');
    setCropOpen(false);
    frontFileRef.current = null;
    backFileRef.current = null;
    setOcrError(null);
    setMissingFields([]);
    setStep('idle');
    resetProcessor();
  };

  const handleAddBack = () => {
    backInputRef.current?.click();
  };

  const handleSkipBack = () => {
    if (state.status === 'ocr_success' || state.status === 'ocr_partial') {
      saveAndReset(state.front, state.back);
    }
  };

  const handleBackInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    void handlePickFile('back', file);
  };

  const busy = step === 'front_ocr' || step === 'back_ocr';

  return (
    <>
      <Dialog open={open} onOpenChange={v => { if (!v) { resetLocal(); onClose(); } }}>
        <DialogContent className="max-w-lg p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Scan Business Card
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Upload front, crop, then optionally add a back side
            </p>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <CardSlot
                side="Front"
                image={frontImage}
                onPickFile={file => handlePickFile('front', file)}
                onCropClick={() => openCropFor('front')}
                disabled={busy}
                primary
              />
              <CardSlot
                side="Back"
                image={backImage}
                onPickFile={file => handlePickFile('back', file)}
                onCropClick={() => openCropFor('back')}
                disabled={busy || !frontImage}
              />
            </div>

            {/* Hidden back input for the "Add back side" prompt */}
            <input
              ref={backInputRef}
              type="file"
              accept="image/*,.heic"
              className="hidden"
              onChange={handleBackInputChange}
            />

            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Note (optional)</div>
              <Textarea
                placeholder="Add context about where you met this person..."
                value={note}
                onChange={e => setNote(e.target.value)}
                className="min-h-[70px] resize-none border-dashed text-sm"
              />
            </div>

            {busy && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm text-primary">
                  {step === 'front_ocr' ? 'Reading front side…' : 'Reading back side…'}
                </span>
              </div>
            )}

            {ocrError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <span className="text-sm text-red-700">{ocrError}</span>
              </div>
            )}

            {missingFields.length > 0 && !successMessage && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <span className="text-sm text-amber-700">
                  Missing fields: {missingFields.join(', ')}. Please review in the detail view.
                </span>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700">{successMessage}</span>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border">
            <Button variant="outline" onClick={onClose} disabled={busy}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CardCropEditor
        isOpen={cropOpen}
        imageSrc={state.status === 'crop_pending' ? state.imageUrl : ''}
        initialBounds={state.status === 'crop_pending' ? state.detectedBounds : undefined}
        currentSide={cropSlotRef.current}
        onConfirm={(blob, side) => handleCropConfirm(blob, side)}
        onRedo={handleCropRedo}
      />

      {/* "Add back side?" prompt — shown after front OCR completes */}
      <AlertDialog open={step === 'ask_back'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add back side of card?</AlertDialogTitle>
            <AlertDialogDescription>
              The back often has a secondary language or extra contact info. Optional — skip to save now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipBack}>Skip</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddBack}>Add back side</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Map OCR result(s) to Partial<Contact> payload shape used by addContact / onExtracted.
function classifyExtracted(
  front: OcrResult,
  back: OcrResult | undefined,
): Partial<Contact> {
  return {
    displayName: front.name ?? '',
    email: front.email ?? '',
    phone: front.phone ?? '',
    company: front.company ?? '',
    jobTitle: front.title ?? '',
    front_ocr: front,
    back_ocr: back ?? null,
    alt_language: back?.language ?? null,
  };
}
