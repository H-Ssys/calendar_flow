import React, { useState, useRef } from 'react';
import { useContactContext } from '@/context/ContactContext';
import { BatchCard } from '@/types/contact';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BatchUploadFormProps {
  open: boolean;
  onClose: () => void;
  maxCards?: number;
}

const MiniDropZone: React.FC<{ label: string; image?: string; onImage: (url: string) => void }> = ({ label, image, onImage }) => {
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
      <button
        onClick={() => ref.current?.click()}
        className={cn(
          "w-full aspect-[3.5/2] rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden",
          image ? "border-solid p-0" : "hover:bg-primary/5 hover:border-primary/30"
        )}
      >
        {image ? (
          <img src={image} alt={label} className="w-full h-full object-cover" />
        ) : (
          <>
            <Upload className="w-5 h-5 text-muted-foreground/30 mb-1" />
            <span className="text-[10px] text-muted-foreground">Upload</span>
          </>
        )}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
};

export const BatchUploadForm: React.FC<BatchUploadFormProps> = ({ open, onClose, maxCards = 20 }) => {
  const { addContact } = useContactContext();

  const [cards, setCards] = useState<BatchCard[]>([
    { id: crypto.randomUUID() },
    { id: crypto.randomUUID() },
  ]);
  const [extracting, setExtracting] = useState(false);
  const [extractedCount, setExtractedCount] = useState(0);

  const updateCard = (id: string, data: Partial<BatchCard>) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const removeCard = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const addCard = () => {
    if (cards.length >= maxCards) return;
    setCards(prev => [...prev, { id: crypto.randomUUID() }]);
  };

  const validCards = cards.filter(c => c.frontImage);

  const handleExtractAll = async () => {
    if (!validCards.length) return;
    setExtracting(true);
    setExtractedCount(0);

    for (let i = 0; i < validCards.length; i++) {
      await new Promise(r => setTimeout(r, 800));
      const card = validCards[i];
      addContact({
        displayName: `Contact ${i + 1}`,
        frontCardImage: card.frontImage,
        backCardImage: card.backImage,
        note: card.note,
        tags: [],
        starred: false,
        linkedEventIds: [],
        linkedTaskIds: [],
        linkedNoteIds: [],
      });
      setExtractedCount(i + 1);
    }

    setExtracting(false);
    onClose();
  };

  const reset = () => {
    setCards([{ id: crypto.randomUUID() }, { id: crypto.randomUUID() }]);
    setExtractedCount(0);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-3xl p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Batch Upload Business Cards
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Upload up to {maxCards} cards at once</p>
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {extractedCount} / {validCards.length} extracted
            </Badge>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 max-h-[55vh] overflow-y-auto space-y-3">
          {cards.map((card, i) => (
            <div key={card.id} className="p-3 rounded-lg border border-border bg-muted/10">
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Card #{i + 1}
                  {card.frontImage && <span className="ml-2 text-green-600">● Ready</span>}
                </div>
                <button
                  onClick={() => removeCard(card.id)}
                  className="p-0.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-[1fr_1fr_180px] gap-3 items-start">
                <MiniDropZone label="FRONT" image={card.frontImage} onImage={url => updateCard(card.id, { frontImage: url })} />
                <MiniDropZone label="BACK" image={card.backImage} onImage={url => updateCard(card.id, { backImage: url })} />
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">NOTE</div>
                  <Textarea
                    value={card.note || ''}
                    onChange={e => updateCard(card.id, { note: e.target.value })}
                    placeholder="Context, meeting place..."
                    className="resize-none text-xs border-dashed min-h-[88px]"
                  />
                </div>
              </div>
            </div>
          ))}

          {cards.length < maxCards && (
            <button
              onClick={addCard}
              className="w-full h-10 border-2 border-dashed border-border rounded-lg flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add more cards ({cards.length}/{maxCards})
            </button>
          )}

          {extracting && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm text-primary font-medium">Extracting contacts... {extractedCount}/{validCards.length}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${validCards.length > 0 ? (extractedCount / validCards.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={extracting}>Cancel</Button>
          <Button
            onClick={handleExtractAll}
            disabled={validCards.length === 0 || extracting}
            className="gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            {extracting ? `Extracting...` : `Extract ${validCards.length} Contact${validCards.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
