import React, { useState, useRef, useEffect } from 'react';
import { useContactContext } from '@/context/ContactContext';
import { Contact } from '@/types/contact';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Camera, Sparkles, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardCropEditor } from '@/components/contacts/CardCropEditor';
import { useCardProcessor } from '@/hooks/useCardProcessor';

interface ScanCardFormProps {
  open: boolean;
  onClose: () => void;
  onExtracted?: (data: Partial<Contact>) => void;
}

interface CardSlotProps {
  side: 'Front' | 'Back';
  image?: string;
  onPickFile: (file: File) => void;
  onCropClick?: () => void;
  primary?: boolean;
}

const CardSlot: React.FC<CardSlotProps> = ({ side, image, onPickFile, onCropClick, primary }) => {
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
        className={cn(
          "aspect-[3.5/2] w-full rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden",
          image ? "p-0 border-solid" : "hover:bg-primary/5 hover:border-primary/30"
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
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-3.5 h-3.5" />
          {image ? `Replace ${side}` : `Upload ${side} Image`}
        </Button>
        {image && (
          <Button
            variant="outline"
            size="sm"
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
  const [extracting, setExtracting] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Crop editor state
  const [cropOpen, setCropOpen] = useState(false);
  // Track which slot is currently in the crop editor
  const cropSlotRef = useRef<'front' | 'back'>('front');
  // Track the original File per side so re-cropping from a thumbnail re-runs processFile
  const frontFileRef = useRef<File | null>(null);
  const backFileRef = useRef<File | null>(null);

  const handlePickFile = async (side: 'front' | 'back', file: File) => {
    cropSlotRef.current = side;
    if (side === 'front') frontFileRef.current = file;
    else backFileRef.current = file;
    setOcrError(null);
    await processFile(file);
  };

  const openCropFor = async (side: 'front' | 'back') => {
    const file = side === 'front' ? frontFileRef.current : backFileRef.current;
    if (!file) return;
    cropSlotRef.current = side;
    await processFile(file);
  };

  // Auto-open the crop editor as soon as processFile finishes preprocessing.
  useEffect(() => {
    if (state.status === 'crop_pending') {
      setCropOpen(true);
    }
  }, [state.status]);

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
  };

  const handleCropRedo = () => {
    setCropOpen(false);
    resetProcessor();
  };

  const handleExtract = async () => {
    if (!frontBlob) return;
    setOcrError(null);
    setMissingFields([]);
    setExtracting(true);
    await confirmCrop(frontBlob, 'front');
    if (backBlob) await confirmCrop(backBlob, 'back');
  };

  useEffect(() => {
    if (state.status === 'ocr_success' || state.status === 'ocr_partial') {
      setExtracting(false);
      if (state.status === 'ocr_partial') {
        setMissingFields(state.missingFields);
      }
      const extracted: Partial<Contact> = {
        displayName: state.front.name ?? '',
        email: state.front.email ?? '',
        phone: state.front.phone ?? '',
        company: state.front.company ?? '',
        jobTitle: state.front.title ?? '',
        frontCardImage: frontImage,
        backCardImage: backImage || undefined,
        note: note || undefined,
        front_ocr: state.front,
        back_ocr: state.back ?? null,
        alt_language: state.back?.language ?? null,
      };
      if (onExtracted) {
        onExtracted(extracted);
      } else {
        addContact({
          ...(extracted as any),
          tags: [],
          starred: false,
          linkedEventIds: [],
          linkedTaskIds: [],
          linkedNoteIds: [],
        });
      }
      onClose();
    }
    if (state.status === 'ocr_failure') {
      setExtracting(false);
      setOcrError(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  const reset = () => {
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
    resetProcessor();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
        <DialogContent className="max-w-lg p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Scan Business Card
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Upload card images — crop to align, then AI extracts contact info
            </p>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <CardSlot
                side="Front"
                image={frontImage}
                onPickFile={file => handlePickFile('front', file)}
                onCropClick={() => openCropFor('front')}
                primary
              />
              <CardSlot
                side="Back"
                image={backImage}
                onPickFile={file => handlePickFile('back', file)}
                onCropClick={() => openCropFor('back')}
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

            {extracting && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm text-primary">Extracting contact information...</span>
              </div>
            )}

            {ocrError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <span className="text-sm text-red-700">{ocrError}</span>
              </div>
            )}

            {missingFields.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <span className="text-sm text-amber-700">
                  Missing fields detected: {missingFields.join(', ')}. Please review.
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border">
            <Button variant="outline" onClick={onClose} disabled={extracting}>Cancel</Button>
            <Button
              onClick={handleExtract}
              disabled={!frontBlob || extracting}
              className="gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              {extracting ? 'Extracting...' : 'Extract Info'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CardCropEditor — opens on top of ScanCardForm after image is selected */}
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
