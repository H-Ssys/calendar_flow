import React, { useState, useRef } from 'react';
import { useContactContext } from '@/context/ContactContext';
import { Contact } from '@/types/contact';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Camera, Sparkles, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScanCardFormProps {
  open: boolean;
  onClose: () => void;
  onExtracted?: (data: Partial<Contact>) => void;
}

interface CardSlotProps {
  side: 'Front' | 'Back';
  image?: string;
  onCapture: (dataUrl: string) => void;
  primary?: boolean;
}

const CardSlot: React.FC<CardSlotProps> = ({ side, image, onCapture, primary }) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onCapture(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{side} Side</div>
      <button
        className={cn(
          "aspect-[3.5/2] w-full rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden",
          image ? "p-0 border-solid" : "hover:bg-primary/5 hover:border-primary/30"
        )}
        onClick={() => fileRef.current?.click()}
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
      <Button
        variant={primary ? 'default' : 'outline'}
        className="w-full gap-1.5"
        size="sm"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="w-3.5 h-3.5" />
        {image ? `Replace ${side}` : `Upload ${side} Image`}
      </Button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
};

export const ScanCardForm: React.FC<ScanCardFormProps> = ({ open, onClose, onExtracted }) => {
  const { addContact } = useContactContext();
  const [frontImage, setFrontImage] = useState('');
  const [backImage, setBackImage] = useState('');
  const [note, setNote] = useState('');
  const [extracting, setExtracting] = useState(false);

  const handleExtract = async () => {
    if (!frontImage) return;
    setExtracting(true);

    // Simulate AI extraction (in production, call OCR/AI API)
    await new Promise(r => setTimeout(r, 1800));

    const mockExtracted: Partial<Contact> = {
      displayName: 'Extracted Contact',
      company: 'Detected Company',
      phone: '+1 555 0000',
      email: 'contact@example.com',
      frontCardImage: frontImage,
      backCardImage: backImage || undefined,
      note: note || undefined,
    };

    setExtracting(false);
    if (onExtracted) {
      onExtracted(mockExtracted);
    } else {
      addContact({
        ...mockExtracted as any,
        tags: [],
        starred: false,
        linkedEventIds: [],
        linkedTaskIds: [],
        linkedNoteIds: [],
      });
    }
    onClose();
  };

  const reset = () => {
    setFrontImage('');
    setBackImage('');
    setNote('');
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Scan Business Card
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">Upload card images and AI will extract contact information</p>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <CardSlot side="Front" image={frontImage} onCapture={setFrontImage} primary />
            <CardSlot side="Back" image={backImage} onCapture={setBackImage} />
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
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={extracting}>Cancel</Button>
          <Button
            onClick={handleExtract}
            disabled={!frontImage || extracting}
            className="gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            {extracting ? 'Extracting...' : 'Extract Info'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
