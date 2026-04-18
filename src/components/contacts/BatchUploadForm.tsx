import React, { useState, useRef, useEffect } from 'react';
import { useContactContext } from '@/context/ContactContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sparkles, ScanBarcode, Check } from 'lucide-react';
import { uuid } from '@/lib/utils';
import { useCardProcessor, preprocessImage } from '@/hooks/useCardProcessor';
import { CardCropEditor } from '@/components/contacts/CardCropEditor';
import { BatchCardList } from '@/components/contacts/BatchCardList';
import {
  CardStatus,
  ExtractedData,
  ProcessedCard,
} from '@/components/contacts/BatchCardItem';

interface BatchUploadFormProps {
  open: boolean;
  onClose: () => void;
  maxCards?: number;
}

const AUTO_CONFIRM_SECONDS = 5;

export const BatchUploadForm: React.FC<BatchUploadFormProps> = ({ open, onClose, maxCards = 20 }) => {
  const { addContact } = useContactContext();

  const [cards, setCards] = useState<ProcessedCard[]>([
    { id: uuid() },
  ]);
  const [extracting, setExtracting] = useState(false);
  const [countdowns, setCountdowns] = useState<Record<number, number>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);

  const { state, pendingOcr, processFile, confirmCrop, reset: resetProcessor } = useCardProcessor({ mode: 'batch' });
  const processingIndexRef = useRef<number>(-1);
  const cardsRef = useRef<ProcessedCard[]>(cards);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  // ── Crop editor state ─────────────────────────────────────────────────────
  const [cropOpen, setCropOpen] = useState(false);
  // We're extracting (OCR pass) vs cropping (pre-extract). processFile puts state
  // into crop_pending; confirmCrop puts it into ocr_running. Both transit through
  // the single shared processor, so a ref lets us tell them apart in the effect.
  const flowRef = useRef<'crop' | 'extract'>('crop');
  const cropTargetRef = useRef<{ cardId: string; side: 'front' | 'back' } | null>(null);
  const [cropSide, setCropSide] = useState<'front' | 'back'>('front');

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
    setCards(prev => [...prev, { id: uuid() }]);
  };

  const updateNote = (id: string, note: string) => updateCard(id, { note });

  // ── Per-card crop flow ────────────────────────────────────────────────────
  const handlePickFile = async (cardId: string, side: 'front' | 'back', file: File) => {
    flowRef.current = 'crop';
    cropTargetRef.current = { cardId, side };
    setCropSide(side);
    if (side === 'front') {
      updateCard(cardId, { frontFile: file, frontBlob: null });
    } else {
      updateCard(cardId, { backFile: file, backBlob: null });
    }
    await processFile(file);
  };

  // Auto-open crop editor when pre-extract preprocessing finishes
  useEffect(() => {
    if (state.status === 'crop_pending' && flowRef.current === 'crop') {
      setCropOpen(true);
    }
  }, [state.status]);

  const handleCropConfirm = (blob: Blob, side: 'front' | 'back') => {
    const target = cropTargetRef.current;
    setCropOpen(false);
    if (!target) {
      resetProcessor();
      return;
    }
    const previewUrl = URL.createObjectURL(blob);
    if (side === 'front') {
      updateCard(target.cardId, { frontImage: previewUrl, frontBlob: blob });
    } else {
      updateCard(target.cardId, { backImage: previewUrl, backBlob: blob });
    }
    cropTargetRef.current = null;
    resetProcessor();
  };

  const handleCropRedo = () => {
    setCropOpen(false);
    cropTargetRef.current = null;
    resetProcessor();
  };

  // ── Extraction / OCR pipeline ─────────────────────────────────────────────
  const validCards = cards.filter(c => c.frontFile || c.frontImage);
  const extractedCount = cards.filter(c =>
    c.status === 'done' || c.status === 'partial' || c.status === 'failed' || c.status === 'confirmed',
  ).length;

  const processNextCard = async () => {
    const idx = processingIndexRef.current;
    const list = cardsRef.current;
    if (idx >= list.length) {
      setExtracting(false);
      flowRef.current = 'crop';
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
    if (flowRef.current !== 'extract') return;
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
    flowRef.current = 'extract';
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
    const savedIds = new Set(saveableCards.map(c => c.id));
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

    const count = savedIds.size;
    setSaveSuccessMsg(`${count} contact${count === 1 ? '' : 's'} saved`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);

    // Drop saved cards, keep failed + unconfirmed. Top up with a fresh empty slot.
    setCards(prev => {
      const remaining = prev.filter(c => !savedIds.has(c.id));
      return remaining.length > 0 ? remaining : [{ id: uuid() }];
    });
    setCountdowns({});
    processingIndexRef.current = -1;
    flowRef.current = 'crop';
  };

  const reset = () => {
    setCards([{ id: uuid() }]);
    setCountdowns({});
    setExtracting(false);
    setMinimized(false);
    processingIndexRef.current = -1;
    flowRef.current = 'crop';
    cropTargetRef.current = null;
    setCropOpen(false);
    resetProcessor();
  };

  const extractionStarted = processingIndexRef.current >= 0;
  const showSave = !extracting && saveableCards.length > 0;

  return (
    <>
      {/* ── Floating OCR bubble (when minimized) ─────────────────────────── */}
      {minimized && (
        <div
          className="fixed bottom-24 right-6 z-[59] cursor-pointer"
          onClick={() => setMinimized(false)}
        >
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg border border-border/50 bg-background/95 backdrop-blur-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
            {extracting ? (
              <>
                <div className="relative">
                  <ScanBarcode className="w-5 h-5 text-primary" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    Extracting {extractedCount}/{validCards.length}
                  </span>
                  <div className="w-24 h-1 bg-muted rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${validCards.length > 0 ? (extractedCount / validCards.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                </div>
                <span className="text-sm font-medium text-green-700">
                  {saveableCards.length} contact{saveableCards.length !== 1 ? 's' : ''} saved!
                </span>
              </>
            )}
          </div>
        </div>
      )}
      <Dialog open={open && !minimized} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
        <DialogContent className="max-w-3xl p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <ScanBarcode className="w-5 h-5 text-primary" />
                  Scan & Upload Cards
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Upload or scan up to {maxCards} cards at once</p>
              </div>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {extractedCount} / {validCards.length} extracted
              </Badge>
            </div>
          </DialogHeader>

          <div className="px-6 py-4 max-h-[55vh] overflow-y-auto space-y-3">
            <BatchCardList
              cards={cards}
              countdowns={countdowns}
              validCount={validCards.length}
              extractedCount={extractedCount}
              extracting={extracting}
              saveSuccessMsg={saveSuccessMsg}
              maxCards={maxCards}
              onAddCard={addCard}
              onPickFile={handlePickFile}
              onUpdateNote={updateNote}
              onRemove={removeCard}
              onCancelCountdown={cancelCountdown}
            />
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

      <CardCropEditor
        isOpen={cropOpen}
        imageSrc={state.status === 'crop_pending' ? state.imageUrl : ''}
        initialBounds={state.status === 'crop_pending' ? state.detectedBounds : undefined}
        currentSide={cropSide}
        onConfirm={(blob, side) => handleCropConfirm(blob, side)}
        onRedo={handleCropRedo}
      />
    </>
  );
};
