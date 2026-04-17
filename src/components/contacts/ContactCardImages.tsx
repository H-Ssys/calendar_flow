import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ContactCardImagesProps {
  frontUrl?: string;
  backUrl?: string;
  onUploadFront: () => void;
  onUploadBack: () => void;
  contactName: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ContactCardImages({
  frontUrl,
  backUrl,
  onUploadFront,
  onUploadBack,
  contactName,
}: ContactCardImagesProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxSide, setLightboxSide] = useState<'front' | 'back'>('front');

  const openLightbox = (url: string, side: 'front' | 'back') => {
    setLightboxUrl(url);
    setLightboxSide(side);
  };

  const closeLightbox = () => setLightboxUrl(null);

  return (
    <>
      {/* ── Thumbnail grid ─────────────────────────────────────────────── */}
      <div className="flex gap-3 max-[480px]:flex-col">
        {/* Front side */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {frontUrl ? (
            <button
              id="contact-card-front-thumb"
              type="button"
              onClick={() => openLightbox(frontUrl, 'front')}
              className="group relative w-full overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              style={{ aspectRatio: '1.75 / 1' }}
            >
              <img
                src={frontUrl}
                alt={`${contactName} — front side`}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              />
              {/* Hover overlay */}
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/20">
                <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-neutral-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100 shadow-sm">
                  View
                </span>
              </span>
            </button>
          ) : (
            <button
              id="contact-card-front-upload"
              type="button"
              onClick={onUploadFront}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 transition-colors hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              style={{ aspectRatio: '1.75 / 1' }}
            >
              <Camera size={22} strokeWidth={1.5} />
              <span className="text-xs font-medium">Add front side</span>
            </button>
          )}
          <span className="inline-flex self-start rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            Front
          </span>
        </div>

        {/* Back side */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {backUrl ? (
            <button
              id="contact-card-back-thumb"
              type="button"
              onClick={() => openLightbox(backUrl, 'back')}
              className="group relative w-full overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              style={{ aspectRatio: '1.75 / 1' }}
            >
              <img
                src={backUrl}
                alt={`${contactName} — back side`}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/20">
                <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-neutral-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100 shadow-sm">
                  View
                </span>
              </span>
            </button>
          ) : (
            <button
              id="contact-card-back-upload"
              type="button"
              onClick={onUploadBack}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50/50 text-neutral-300 transition-colors hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-500 dark:border-neutral-800 dark:bg-neutral-950/40 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              style={{ aspectRatio: '1.75 / 1' }}
            >
              <Camera size={20} strokeWidth={1.5} />
              <span className="text-[11px] font-medium">Add back side (optional)</span>
            </button>
          )}
          <span className="inline-flex self-start rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            Back
          </span>
        </div>
      </div>

      {/* ── Lightbox Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!lightboxUrl} onOpenChange={(open) => !open && closeLightbox()}>
        <DialogContent
          className="max-w-[90vw] max-h-[90vh] w-auto h-auto border-0 bg-transparent p-0 shadow-none [&>button]:text-white [&>button]:hover:text-white/80 [&>button]:bg-black/40 [&>button]:rounded-full [&>button]:p-1.5"
        >
          <DialogTitle className="sr-only">
            {contactName} — {lightboxSide === 'front' ? 'Front' : 'Back'} side
          </DialogTitle>
          <DialogDescription className="sr-only">
            Full-size view of the {lightboxSide} side of {contactName}'s business card.
          </DialogDescription>

          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt={`${contactName} — ${lightboxSide} side (full size)`}
              className="max-h-[85vh] max-w-[88vw] rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
