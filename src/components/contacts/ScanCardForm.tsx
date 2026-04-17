import React, { useState, useRef, useEffect } from 'react';
import { useContactContext } from '@/context/ContactContext';
import { Contact, OcrResult } from '@/types/contact';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  | 'back_crop'
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
  const { state, pendingOcr, processFile, extractCard, reset: resetProcessor } = useCardProcessor({ mode: 'scan' });

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

  // Crop confirmed → just save the preview, NO auto-OCR.
  // User will click "Extract Contact" when ready.
  const handleCropConfirm = (blob: Blob, side: 'front' | 'back') => {
    const previewUrl = URL.createObjectURL(blob);
    if (side === 'front') {
      setFrontBlob(blob);
      setFrontImage(previewUrl);
    } else {
      setBackBlob(blob);
      setBackImage(previewUrl);
    }
    setCropOpen(false);
    setStep('idle');
  };

  const handleCropRedo = () => {
    setCropOpen(false);
    resetProcessor();
    setStep('idle');
  };

  // ── Extract Contact button handler ────────────────────────────────────────
  // Sends front (+ optional back) in a single API call.
  const handleExtract = () => {
    if (!frontBlob) return;
    setOcrError(null);
    setSuccessMessage(null);
    extractCard(frontBlob, backBlob || undefined);
  };

  // React to OCR completion (arrives asynchronously from background)
  useEffect(() => {
    if (state.status === 'ocr_success' || state.status === 'ocr_partial') {
      if (state.status === 'ocr_partial') {
        setMissingFields(state.missingFields);
      } else {
        setMissingFields([]);
      }

      // Auto-save the contact
      saveAndReset(state.front, state.back);
    }
    if (state.status === 'ocr_failure') {
      setOcrError(state.error);
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

    const name = front.name || 'Contact';
    setStep('done');
    setSuccessMessage(`✓ Extracted "${name}" — saved! Upload another or close.`);
    setTimeout(() => {
      setSuccessMessage(null);
      resetLocal();
    }, 3000);
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

  const ocrInProgress = pendingOcr > 0;
  const isPreprocessing = state.status === 'preprocessing';
  const canExtract = !!frontImage && !ocrInProgress && step !== 'done';

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
              Upload front (and optionally back), then click Extract Contact
            </p>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <CardSlot
                side="Front"
                image={frontImage}
                onPickFile={file => handlePickFile('front', file)}
                onCropClick={() => openCropFor('front')}
                disabled={isPreprocessing || ocrInProgress}
                primary
              />
              <CardSlot
                side="Back"
                image={backImage}
                onPickFile={file => handlePickFile('back', file)}
                onCropClick={() => openCropFor('back')}
                disabled={isPreprocessing || ocrInProgress || !frontImage}
              />
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Note (optional)</div>
              <Textarea
                placeholder="Add context about where you met this person..."
                value={note}
                onChange={e => setNote(e.target.value)}
                className="min-h-[70px] resize-none border-dashed text-sm"
              />
            </div>

            {/* ── Extract Contact button ─────────────────────────────── */}
            <Button
              onClick={handleExtract}
              disabled={!canExtract}
              className="w-full gap-2"
            >
              {ocrInProgress ? (
                <>
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Extracting…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Extract Contact
                </>
              )}
            </Button>

            {/* Background OCR indicator */}
            {ocrInProgress && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm text-primary">
                  Reading card in background… you can continue uploading.
                </span>
              </div>
            )}

            {ocrError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-red-700">{ocrError}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2 shrink-0 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleExtract}
                  disabled={!frontBlob}
                >
                  Retry
                </Button>
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
            <Button variant="outline" onClick={onClose}>Close</Button>
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
    </>
  );
};

// Map OCR result(s) to Partial<Contact> payload shape used by addContact / onExtracted.
function classifyExtracted(
  front: OcrResult,
  back: OcrResult | undefined,
): Partial<Contact> {
  const altN = front.alt_name || back?.name || back?.alt_name;
  const altT = front.alt_title || back?.title || back?.alt_title;
  const altC = front.alt_company || back?.company || back?.alt_company;
  const altA = front.alt_address || back?.address || back?.alt_address;
  
  // Use a generic split since splitName isn't imported here
  let aF = '';
  let aL = '';
  if (altN) {
    const parts = altN.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) aF = parts[0];
    else if (parts.length > 1) {
      aF = parts[0];
      aL = parts.slice(1).join(' ');
    }
  }

  return {
    displayName: front.name ?? '',
    email: front.email ?? '',
    phone: front.phone ?? '',
    company: front.company ?? '',
    jobTitle: front.title ?? '',
    altFirstName: aF || undefined,
    altLastName: aL || undefined,
    altCompany: altC || undefined,
    altJobTitle: altT || undefined,
    altAddress: altA || undefined,
    front_ocr: front,
    back_ocr: back ?? null,
    alt_language: back?.language ?? null,
  };
}
