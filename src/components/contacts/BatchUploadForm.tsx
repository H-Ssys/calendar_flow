import React, { useState, useRef, useEffect } from 'react';
import { useContactContext } from '@/context/ContactContext';
import { BatchCard, OcrResult } from '@/types/contact';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, Plus, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCardProcessor, preprocessImage } from '@/hooks/useCardProcessor';

interface BatchUploadFormProps {
  open: boolean;
  onClose: () => void;
  maxCards?: number;
}

type CardStatus = 'waiting' | 'processing' | 'done' | 'partial' | 'failed' | 'confirmed';

interface ExtractedData {
  name: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  front_ocr: OcrResult | null;
  back_ocr: OcrResult | null;
  alt_language: string | null;
}

interface ProcessedCard extends BatchCard {
  frontFile?: File;
  backFile?: File;
  frontBlob?: Blob | null;
  backBlob?: Blob | null;
  status?: CardStatus;
  extracted?: ExtractedData;
  missingFields?: string[];
  error?: string;
}

const AUTO_CONFIRM_SECONDS = 5;

const MiniDropZone: React.FC<{
  label: string;
  image?: string;
  onImage: (url: string, file: File) => void;
}> = ({ label, image, onImage }) => {
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onImage(ev.target?.result as string, file);
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
      <input ref={ref} type="file" accept="image/*,.heic" className="hidden" onChange={handleFile} />
    </div>
  );
};

const StatusDot: React.FC<{ status: CardStatus | undefined }> = ({ status }) => {
  const styles: Record<CardStatus, string> = {
    waiting: 'bg-neutral-400',
    processing: 'bg-blue-500 animate-pulse',
    done: 'bg-green-500',
    partial: 'bg-amber-500',
    failed: 'bg-red-500',
    confirmed: 'bg-green-600',
  };
  const cls = status ? styles[status] : 'bg-neutral-300';
  return <span className={cn('inline-block w-2 h-2 rounded-full', cls)} />;
};

const statusLabel = (card: ProcessedCard): string => {
  switch (card.status) {
    case 'processing': return 'Processing…';
    case 'done':       return `${card.extracted?.name || 'Unnamed'}${card.extracted?.company ? ' · ' + card.extracted.company : ''}`;
    case 'partial':    return `${card.extracted?.name || 'Unnamed'} · missing: ${(card.missingFields || []).join(', ')}`;
    case 'failed':     return "Couldn't read — enter manually";
    case 'confirmed':  return `${card.extracted?.name || 'Unnamed'} · saved`;
    case 'waiting':    return 'Waiting';
    default:           return card.frontFile || card.frontImage ? 'Ready' : '';
  }
};

export const BatchUploadForm: React.FC<BatchUploadFormProps> = ({ open, onClose, maxCards = 20 }) => {
  const { addContact } = useContactContext();

  const [cards, setCards] = useState<ProcessedCard[]>([
    { id: crypto.randomUUID() },
    { id: crypto.randomUUID() },
  ]);
  const [extracting, setExtracting] = useState(false);
  const [countdowns, setCountdowns] = useState<Record<number, number>>({});

  const { state, confirmCrop, reset: resetProcessor } = useCardProcessor({ mode: 'batch' });
  const processingIndexRef = useRef<number>(-1);
  const cardsRef = useRef<ProcessedCard[]>(cards);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  const updateCard = (id: string, data: Partial<ProcessedCard>) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const updateCardByIndex = (idx: number, data: Partial<ProcessedCard>) => {
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, ...data } : c));
  };

  const removeCard = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const addCard = () => {
    if (cards.length >= maxCards) return;
    setCards(prev => [...prev, { id: crypto.randomUUID() }]);
  };

  const validCards = cards.filter(c => c.frontFile || c.frontImage);
  const extractedCount = cards.filter(c =>
    c.status === 'done' || c.status === 'partial' || c.status === 'failed' || c.status === 'confirmed',
  ).length;

  const processNextCard = async () => {
    const idx = processingIndexRef.current;
    const list = cardsRef.current;
    if (idx >= list.length) {
      setExtracting(false);
      return;
    }
    const card = list[idx];
    if (!card.frontFile && !card.frontBlob) {
      processingIndexRef.current += 1;
      return processNextCard();
    }
    updateCardByIndex(idx, { status: 'processing' });
    try {
      let frontBlob = card.frontBlob ?? null;
      let backBlob = card.backBlob ?? null;
      if (!frontBlob && card.frontFile) {
        frontBlob = await preprocessImage(card.frontFile);
      }
      if (!backBlob && card.backFile) {
        backBlob = await preprocessImage(card.backFile);
      }
      updateCardByIndex(idx, { frontBlob, backBlob });
      if (frontBlob) await confirmCrop(frontBlob, 'front');
    } catch (err) {
      updateCardByIndex(idx, {
        status: 'failed',
        error: err instanceof Error ? err.message : 'Preprocess failed',
      });
      processingIndexRef.current += 1;
      resetProcessor();
      processNextCard();
    }
  };

  useEffect(() => {
    if (state.status === 'ocr_success' || state.status === 'ocr_partial') {
      const idx = processingIndexRef.current;
      const nextStatus: CardStatus = state.status === 'ocr_success' ? 'done' : 'partial';
      const extracted: ExtractedData = {
        name: state.front.name ?? '',
        email: state.front.email ?? '',
        phone: state.front.phone ?? '',
        company: state.front.company ?? '',
        title: state.front.title ?? '',
        front_ocr: state.front,
        back_ocr: state.back ?? null,
        alt_language: state.back?.language ?? null,
      };
      const missingFields = state.status === 'ocr_partial' ? state.missingFields : [];
      setCards(prev => prev.map((c, i) =>
        i === idx ? { ...c, status: nextStatus, extracted, missingFields } : c,
      ));
      setCountdowns(prev => ({ ...prev, [idx]: AUTO_CONFIRM_SECONDS }));
      processingIndexRef.current += 1;
      resetProcessor();
      processNextCard();
    }
    if (state.status === 'ocr_failure') {
      const idx = processingIndexRef.current;
      setCards(prev => prev.map((c, i) =>
        i === idx ? { ...c, status: 'failed', error: state.error } : c,
      ));
      processingIndexRef.current += 1;
      resetProcessor();
      processNextCard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  // Countdown timer: decrement each active countdown every second; auto-confirm at 0
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    Object.entries(countdowns).forEach(([idxStr, remaining]) => {
      const idx = Number(idxStr);
      if (remaining > 0) {
        timers.push(setTimeout(() => {
          setCountdowns(prev => {
            if (prev[idx] === undefined) return prev;
            return { ...prev, [idx]: Math.max(0, prev[idx] - 1) };
          });
        }, 1000));
      } else if (remaining === 0) {
        setCards(prev => prev.map((c, i) =>
          i === idx && (c.status === 'done' || c.status === 'partial')
            ? { ...c, status: 'confirmed' }
            : c,
        ));
        setCountdowns(prev => {
          const next = { ...prev };
          delete next[idx];
          return next;
        });
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [countdowns]);

  const cancelCountdown = (idx: number) => {
    setCountdowns(prev => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const handleExtractAll = async () => {
    if (!validCards.length) return;
    setExtracting(true);
    setCards(prev => prev.map(c =>
      (c.frontFile || c.frontImage) ? { ...c, status: 'waiting' } : c,
    ));
    processingIndexRef.current = 0;
    await processNextCard();
  };

  const saveableCards = cards.filter(c =>
    c.status === 'confirmed' || c.status === 'done' || c.status === 'partial',
  );

  const handleSaveAll = () => {
    saveableCards.forEach(card => {
      addContact({
        displayName: card.extracted?.name?.trim() || 'New Contact',
        company: card.extracted?.company || undefined,
        jobTitle: card.extracted?.title || undefined,
        phone: card.extracted?.phone || undefined,
        email: card.extracted?.email || undefined,
        frontCardImage: card.frontImage,
        backCardImage: card.backImage,
        note: card.note,
        front_ocr: card.extracted?.front_ocr ?? null,
        back_ocr: card.extracted?.back_ocr ?? null,
        alt_language: card.extracted?.alt_language ?? null,
        tags: [],
        starred: false,
        linkedEventIds: [],
        linkedTaskIds: [],
        linkedNoteIds: [],
      } as any);
    });
    onClose();
  };

  const reset = () => {
    setCards([{ id: crypto.randomUUID() }, { id: crypto.randomUUID() }]);
    setCountdowns({});
    setExtracting(false);
    processingIndexRef.current = -1;
    resetProcessor();
  };

  const extractionStarted = processingIndexRef.current >= 0;
  const showSave = !extracting && saveableCards.length > 0;

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
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  <span>Card #{i + 1}</span>
                  <StatusDot status={card.status} />
                  <span className="normal-case tracking-normal text-[11px] text-foreground/80">
                    {statusLabel(card)}
                  </span>
                  {countdowns[i] !== undefined && countdowns[i] > 0 && (
                    <button
                      onClick={() => cancelCountdown(i)}
                      className="normal-case tracking-normal text-[11px] text-primary hover:underline"
                    >
                      Auto-save in {countdowns[i]}s · Cancel
                    </button>
                  )}
                </div>
                <button
                  onClick={() => removeCard(card.id)}
                  className="p-0.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-[1fr_1fr_180px] gap-3 items-start">
                <MiniDropZone
                  label="FRONT"
                  image={card.frontImage}
                  onImage={(url, file) => updateCard(card.id, { frontImage: url, frontFile: file, frontBlob: null })}
                />
                <MiniDropZone
                  label="BACK"
                  image={card.backImage}
                  onImage={(url, file) => updateCard(card.id, { backImage: url, backFile: file, backBlob: null })}
                />
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
              {card.error && (
                <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                  {card.error}
                </div>
              )}
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
          {showSave ? (
            <Button onClick={handleSaveAll} className="gap-1.5">
              <Sparkles className="w-4 h-4" />
              Save {saveableCards.length} Contact{saveableCards.length !== 1 ? 's' : ''}
            </Button>
          ) : (
            <Button
              onClick={handleExtractAll}
              disabled={validCards.length === 0 || extracting || extractionStarted}
              className="gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              {extracting ? `Extracting...` : `Extract ${validCards.length} Contact${validCards.length !== 1 ? 's' : ''}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
