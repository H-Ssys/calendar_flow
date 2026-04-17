import React from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { BatchCardItem, ProcessedCard } from './BatchCardItem';

export interface BatchCardListProps {
  cards: ProcessedCard[];
  countdowns: Record<number, number>;
  validCount: number;
  extractedCount: number;
  extracting: boolean;
  saveSuccessMsg: string | null;
  maxCards: number;
  onAddCard: () => void;
  onPickFile: (cardId: string, side: 'front' | 'back', file: File) => void;
  onUpdateNote: (cardId: string, note: string) => void;
  onRemove: (cardId: string) => void;
  onCancelCountdown: (idx: number) => void;
}

export const BatchCardList: React.FC<BatchCardListProps> = ({
  cards,
  countdowns,
  validCount,
  extractedCount,
  extracting,
  saveSuccessMsg,
  maxCards,
  onAddCard,
  onPickFile,
  onUpdateNote,
  onRemove,
  onCancelCountdown,
}) => {
  return (
    <>
      {cards.map((card, i) => (
        <BatchCardItem
          key={card.id}
          card={card}
          index={i}
          countdown={countdowns[i]}
          onPickFile={onPickFile}
          onUpdateNote={onUpdateNote}
          onRemove={onRemove}
          onCancelCountdown={onCancelCountdown}
        />
      ))}

      {cards.length < maxCards && (
        <button
          onClick={onAddCard}
          className="w-full h-10 border-2 border-dashed border-border rounded-lg flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add more business card ({cards.length}/{maxCards})
        </button>
      )}

      {extracting && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm text-primary font-medium">Extracting contacts... {extractedCount}/{validCount}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${validCount > 0 ? (extractedCount / validCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {saveSuccessMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          {saveSuccessMsg} — add more cards or close.
        </div>
      )}
    </>
  );
};
