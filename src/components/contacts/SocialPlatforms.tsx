import React, { useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SOCIAL_PLATFORMS, getPlatformDef } from '@/constants/socialPlatforms';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SocialEntry {
  platform: string;
  value: string;
  label: string;
}

export interface SocialPlatformsProps {
  socials: SocialEntry[];
  onChange: (socials: SocialEntry[]) => void;
  readOnly?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a clickable URL from a platform + handle. Returns null if not linkable. */
function socialUrl(platform: string, value: string): string | null {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const prefixes: Record<string, string> = {
    linkedin: 'https://linkedin.com/in/',
    twitter: 'https://x.com/',
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    github: 'https://github.com/',
    youtube: 'https://youtube.com/@',
    tiktok: 'https://tiktok.com/@',
    telegram: 'https://t.me/',
  };
  const prefix = prefixes[platform];
  return prefix ? `${prefix}${value.replace(/^@/, '')}` : null;
}

// ─── Badge ───────────────────────────────────────────────────────────────────

function PlatformBadge({ platformKey }: { platformKey: string }) {
  const def = getPlatformDef(platformKey);
  return (
    <span
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold leading-none select-none"
      style={{ backgroundColor: def.bg, color: def.text }}
    >
      {def.short}
    </span>
  );
}

// ─── Editable Handle ─────────────────────────────────────────────────────────

function EditableHandle({
  value,
  platform,
  autoFocus,
  onChange,
}: {
  value: string;
  platform: string;
  autoFocus?: boolean;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(autoFocus ?? false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        placeholder="handle or URL"
        className="flex-1 min-w-0 rounded-md border border-neutral-300 bg-white px-2 py-0.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-indigo-500"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(value); setEditing(true); }}
      className="flex-1 min-w-0 truncate rounded-md px-2 py-0.5 text-left text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
    >
      {value || <span className="italic text-neutral-400">add handle…</span>}
    </button>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SocialPlatforms({ socials, onChange, readOnly = false }: SocialPlatformsProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [newlyAdded, setNewlyAdded] = useState<string | null>(null);

  const addedKeys = new Set(socials.map((s) => s.platform));

  const addPlatform = (key: string, label: string) => {
    if (addedKeys.has(key)) return;
    onChange([...socials, { platform: key, value: '', label }]);
    setNewlyAdded(key);
    setPopoverOpen(false);
  };

  const removePlatform = (idx: number) => {
    onChange(socials.filter((_, i) => i !== idx));
  };

  const updateValue = (idx: number, value: string) => {
    onChange(socials.map((s, i) => (i === idx ? { ...s, value } : s)));
  };

  const handleCustomSubmit = () => {
    const name = customInput.trim();
    if (!name) return;
    const key = name.toLowerCase().replace(/\s+/g, '-');
    if (addedKeys.has(key)) return;
    addPlatform(key, name);
    setCustomInput('');
  };

  // ── Empty state ──────────────────────────────────────────────────────────
  if (socials.length === 0 && readOnly) {
    return (
      <p id="social-platforms-empty" className="text-sm text-neutral-400 italic py-2">
        No social platforms added
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* ── Rows ──────────────────────────────────────────────────────────── */}
      {socials.map((entry, idx) => {
        const def = getPlatformDef(entry.platform);
        const url = socialUrl(entry.platform, entry.value);

        return (
          <div
            key={entry.platform}
            className="group flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
          >
            <PlatformBadge platformKey={entry.platform} />

            <span className="shrink-0 text-sm font-medium text-neutral-700 dark:text-neutral-300 w-20 truncate">
              {def.name}
            </span>

            {readOnly ? (
              url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0 truncate text-sm text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {entry.value}
                </a>
              ) : (
                <span className="flex-1 min-w-0 truncate text-sm text-neutral-500">
                  {entry.value}
                </span>
              )
            ) : (
              <EditableHandle
                value={entry.value}
                platform={entry.platform}
                autoFocus={newlyAdded === entry.platform}
                onChange={(v) => {
                  updateValue(idx, v);
                  if (newlyAdded === entry.platform) setNewlyAdded(null);
                }}
              />
            )}

            {!readOnly && (
              <button
                type="button"
                onClick={() => removePlatform(idx)}
                className="shrink-0 rounded-md p-0.5 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500 focus-visible:opacity-100"
                aria-label={`Remove ${def.name}`}
              >
                <X size={14} />
              </button>
            )}
          </div>
        );
      })}

      {/* ── Add button + popover ──────────────────────────────────────────── */}
      {!readOnly && (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              id="social-add-btn"
              variant="ghost"
              size="sm"
              className="mt-1 self-start gap-1.5 text-neutral-500 hover:text-indigo-600"
            >
              <Plus size={14} />
              Add platform
            </Button>
          </PopoverTrigger>

          <PopoverContent align="start" className="w-72 p-3">
            {/* Platform pills grid */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SOCIAL_PLATFORMS.filter((p) => !addedKeys.has(p.key)).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => addPlatform(p.key, p.name)}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:ring-1 hover:ring-indigo-400"
                  style={{ backgroundColor: p.bg, color: p.text }}
                >
                  {p.short}
                  <span className="text-[11px]">{p.name}</span>
                </button>
              ))}
              {SOCIAL_PLATFORMS.every((p) => addedKeys.has(p.key)) && (
                <span className="text-xs text-neutral-400 italic">All platforms added</span>
              )}
            </div>

            {/* Custom platform input */}
            <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2">
              <input
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                placeholder="Or type a custom platform name…"
                className="w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs outline-none placeholder:text-neutral-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-indigo-500"
              />
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
