import React, { useRef } from 'react';
import { BatchCard, OcrResult } from '@/types/contact';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CardStatus = 'waiting' | 'processing' | 'done' | 'partial' | 'failed' | 'confirmed';

export interface ExtractedData {
  name: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  front_ocr: OcrResult | null;
  back_ocr: OcrResult | null;
  alt_language: string | null;
}

export interface ProcessedCard extends BatchCard {
  frontFile?: File;
  backFile?: File;
  frontBlob?: Blob | null;
  backBlob?: Blob | null;
  status?: CardStatus;
  extracted?: ExtractedData;
  missingFields?: string[];
  error?: string;
}

const MiniDropZone: React.FC<{
  label: string;
  image?: string;
  onPickFile: (file: File) => void;
}> = ({ label, image, onPickFile }) => {
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onPickFile(file);
    e.target.value = '';
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

const STATUS_DOT_STYLES: Record<CardStatus, string> = {
  waiting: 'bg-neutral-400',
  processing: 'bg-blue-500 animate-pulse',
  done: 'bg-green-500',
  partial: 'bg-amber-500',
  failed: 'bg-red-500',
  confirmed: 'bg-green-600',
};

const StatusDot: React.FC<{ status: CardStatus | undefined }> = ({ status }) => {
  const cls = status ? STATUS_DOT_STYLES[status] : 'bg-neutral-300';
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

export interface BatchCardItemProps {
  card: ProcessedCard;
  index: number;
  countdown?: number;
  onPickFile: (cardId: string, side: 'front' | 'back', file: File) => void;
  onUpdateNote: (cardId: string, note: string) => void;
  onRemove: (cardId: string) => void;
  onCancelCountdown: (idx: number) => void;
}

export const BatchCardItem: React.FC<BatchCardItemProps> = ({
  card, index, countdown, onPickFile, onUpdateNote, onRemove, onCancelCountdown,
}) => {
  return (
    <div className="p-3 rounded-lg border border-border bg-muted/10">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          <span>Card #{index + 1}</span>
          <StatusDot status={card.status} />
          <span className="normal-case tracking-normal text-[11px] text-foreground/80">
            {statusLabel(card)}
          </span>
          {countdown !== undefined && countdown > 0 && (
            <button
              onClick={() => onCancelCountdown(index)}
              className="normal-case tracking-normal text-[11px] text-primary hover:underline"
            >
              Auto-save in {countdown}s · Cancel
            </button>
          )}
        </div>
        <button
          onClick={() => onRemove(card.id)}
          className="p-0.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-[1fr_1fr_180px] gap-3 items-start">
        <MiniDropZone
          label="FRONT"
          image={card.frontImage}
          onPickFile={file => onPickFile(card.id, 'front', file)}
        />
        <MiniDropZone
          label="BACK"
          image={card.backImage}
          onPickFile={file => onPickFile(card.id, 'back', file)}
        />
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">NOTE</div>
          <Textarea
            value={card.note || ''}
            onChange={e => onUpdateNote(card.id, e.target.value)}
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
  );
};
