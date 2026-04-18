import React, { useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Contact } from '@/types/contact';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReferenceEntry {
  refId: string;
  name: string;
  company?: string;
  avatarColor?: string;
  label?: string;
}

export interface ContactReferencesProps {
  contactId: string;
  references: ReferenceEntry[];
  availableContacts?: Contact[];
  onAdd: (refId: string, label?: string) => void;
  onRemove: (refId: string) => void;
  onContactClick: (id: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LABEL_OPTIONS = [
  'Referred by',
  'Works with',
  'Reports to',
  'Introduced me to',
] as const;

const LABEL_COLORS: Record<string, { bg: string; text: string }> = {
  'Referred by':       { bg: '#E6F1FB', text: '#185FA5' },
  'Works with':        { bg: '#E1F5EE', text: '#0F6E56' },
  'Reports to':        { bg: '#FAEEDA', text: '#854F0B' },
  'Introduced me to':  { bg: '#EEEDFE', text: '#534AB7' },
};
const DEFAULT_LABEL_COLOR = { bg: '#F1EFE8', text: '#5F5E5A' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ContactReferences({
  contactId,
  references,
  availableContacts,
  onAdd,
  onRemove,
  onContactClick,
}: ContactReferencesProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const addedIds = new Set(references.map((r) => r.refId));
  const q = search.toLowerCase();

  const filteredContacts = (availableContacts ?? [])
    .filter((c) =>
      !addedIds.has(c.id) &&
      c.id !== contactId &&
      (c.displayName?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q)),
    )
    .map((c) => ({
      id: c.id,
      name: c.displayName,
      company: c.company,
      avatarColor: c.color ?? '#a3a3a3',
    }));

  const handleSelectContact = (id: string) => {
    onAdd(id);
    setPopoverOpen(false);
    setSearch('');
  };

  const handleNewContact = () => {
    if (!newName.trim()) return;
    const tempId = `temp-${Date.now()}`;
    onAdd(tempId);
    setNewName('');
    setNewEmail('');
    setPopoverOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* ── Chips ──────────────────────────────────────────────────────── */}
      {references.length === 0 ? (
        <p id="contact-refs-empty" className="text-sm text-neutral-400 italic py-1">
          No references yet
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {references.map((ref) => {
            const lc = ref.label ? (LABEL_COLORS[ref.label] ?? DEFAULT_LABEL_COLOR) : null;
            return (
              <div
                key={ref.refId}
                className="group relative inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white pl-1 pr-2.5 py-1 text-sm transition-colors hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600"
              >
                {/* Avatar */}
                <button
                  type="button"
                  onClick={() => onContactClick(ref.refId)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: ref.avatarColor ?? '#a3a3a3' }}
                  title={`Go to ${ref.name}`}
                >
                  {initials(ref.name)}
                </button>

                {/* Name */}
                <button
                  type="button"
                  onClick={() => onContactClick(ref.refId)}
                  className="font-medium text-neutral-700 dark:text-neutral-200 hover:underline truncate max-w-[120px]"
                >
                  {ref.name}
                </button>

                {/* Label badge */}
                {ref.label && lc && (
                  <span
                    className="rounded-full px-1.5 py-px text-[10px] font-semibold leading-tight"
                    style={{ backgroundColor: lc.bg, color: lc.text }}
                  >
                    {ref.label}
                  </span>
                )}

                {/* Remove */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemove(ref.refId); }}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-200 text-neutral-500 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 dark:bg-neutral-700 dark:text-neutral-400 dark:hover:bg-red-900 dark:hover:text-red-400"
                  aria-label={`Remove ${ref.name}`}
                >
                  <X size={10} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add button + Popover ────────────────────────────────────────── */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            id="contact-refs-add-btn"
            variant="ghost"
            size="sm"
            className="self-start gap-1.5 text-neutral-500 hover:text-indigo-600"
          >
            <Plus size={14} />
            Add reference
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-80 p-0">
          <Tabs defaultValue="existing" className="w-full">
            <TabsList className="w-full rounded-none border-b bg-transparent p-0 h-9">
              <TabsTrigger value="existing" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:shadow-none text-xs">
                Existing contacts
              </TabsTrigger>
              <TabsTrigger value="new" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:shadow-none text-xs">
                New contact
              </TabsTrigger>
            </TabsList>

            {/* ── Tab: Existing ────────────────────────────────────────── */}
            <TabsContent value="existing" className="mt-0 p-3">
              <div className="relative mb-2">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or company…"
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <div className="max-h-40 overflow-y-auto -mx-1">
                {filteredContacts.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-neutral-400 italic">
                    No contacts found
                  </p>
                ) : (
                  filteredContacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectContact(c.id)}
                      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: c.avatarColor }}
                      >
                        {initials(c.name)}
                      </span>
                      <span className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200 truncate">{c.name}</span>
                        {c.company && (
                          <span className="text-[11px] text-neutral-400 truncate">{c.company}</span>
                        )}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </TabsContent>

            {/* ── Tab: New contact ─────────────────────────────────────── */}
            <TabsContent value="new" className="mt-0 p-3 flex flex-col gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name *"
                className="h-8 text-xs"
              />
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Email (optional)"
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                onClick={handleNewContact}
                disabled={!newName.trim()}
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Add & link
              </Button>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  );
}
