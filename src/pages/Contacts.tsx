import React, { useState, useMemo } from 'react';
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar';
import { PageHeaderRight } from '@/components/PageHeaderRight';
import { ContactProvider, useContactContext } from '@/context/ContactContext';
import { ContactDetail } from '@/components/contacts/ContactDetail';
import { NewContactForm } from '@/components/contacts/NewContactForm';
import { ScanCardForm } from '@/components/contacts/ScanCardForm';
import { BatchUploadForm } from '@/components/contacts/BatchUploadForm';
import { Contact, getInitials } from '@/types/contact';
import { Users, Plus, Search, Heart, X, Upload, ChevronDown, ScanBarcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

// ── Inner component (needs context) ──────────────────────────────────
const ContactsInner: React.FC = () => {
  const { contacts, deleteContact, toggleStar } = useContactContext();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStarred, setFilterStarred] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [showScanCard, setShowScanCard] = useState(false);
  const [showBatchUpload, setShowBatchUpload] = useState(false);

  const selectedContact = selectedId ? contacts.find(c => c.id === selectedId) ?? null : null;

  const filteredContacts = useMemo(() => {
    let list = [...contacts];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.displayName.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
      );
    }
    if (filterStarred) list = list.filter(c => c.starred);
    // Starred first
    list.sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0));
    return list;
  }, [contacts, search, filterStarred]);

  // Group by first letter
  const grouped = useMemo(() => {
    const map: Record<string, Contact[]> = {};
    filteredContacts.forEach(c => {
      const key = c.displayName[0]?.toUpperCase() || '#';
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredContacts]);

  return (
    <div className="flex w-full h-screen bg-background overflow-hidden relative">
      <CalendarSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeaderRight />

        <div className="flex flex-1 overflow-hidden">
          {/* ── Left panel: Contacts list ── */}
          <div className="w-[300px] border-r border-border flex flex-col overflow-hidden bg-background flex-shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <Users className="w-4 h-4 text-primary flex-shrink-0" />
                <h2 className="text-sm font-semibold text-foreground truncate">Smart Contacts</h2>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                  {contacts.length}
                </span>
              </div>
              {/* Add contact dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="h-7 px-2 gap-1 flex-shrink-0">
                    <Plus className="w-3.5 h-3.5" />
                    <ChevronDown className="w-3 h-3 text-white/70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setShowNewContact(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> New Contact
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowScanCard(true)} className="gap-2">
                    <ScanBarcode className="w-4 h-4" /> Scan Card
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowBatchUpload(true)} className="gap-2">
                    <Upload className="w-4 h-4" /> Batch Upload
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-border space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setFilterStarred(!filterStarred)}
                className={cn(
                    "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors",
                    filterStarred ? "bg-rose-500/10 text-rose-500" : "text-muted-foreground hover:bg-muted"
                  )}
              >
                <Heart className={cn("w-3 h-3", filterStarred && "fill-rose-500 text-rose-500")} />
                Favourites only
              </button>
            </div>

            {/* Contact list */}
            <div className="flex-1 overflow-y-auto">
              {filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                  <Users className="w-10 h-10 text-muted-foreground/20" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">No contacts found</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {search ? 'Try a different search' : 'Add your first contact above'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="px-2 pb-4 pt-2">
                  {grouped.map(([letter, group]) => (
                    <div key={letter}>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {letter}
                      </div>
                      {group.map(contact => (
                        <div
                          key={contact.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedId(contact.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedId(contact.id);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all group mb-0.5 border text-left",
                            selectedId === contact.id
                              ? "bg-primary/10 border-primary/30"
                              : "border-transparent hover:bg-muted/70"
                          )}
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: contact.color || '#8B5CF6' }}
                          >
                            {getInitials(contact)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{contact.displayName}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {contact.jobTitle ? `${contact.jobTitle}${contact.company ? ` · ${contact.company}` : ''}` : contact.email || '—'}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            {contact.starred && (
                              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); deleteContact(contact.id); if (selectedId === contact.id) setSelectedId(null); }}
                              className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right panel: detail or empty state ── */}
          <div className="flex-1 flex overflow-hidden bg-background">
            {selectedContact ? (
              <ContactDetail
                contact={selectedContact}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-8">
                <div className="w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center">
                  <Users className="w-10 h-10 text-primary/30" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-muted-foreground">Select a contact</h2>
                  <p className="text-sm text-muted-foreground/70 mt-1">Choose from the list or add a new one</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <Button onClick={() => setShowNewContact(true)} size="sm" className="gap-1.5">
                    <Plus className="w-4 h-4" /> New Contact
                  </Button>
                  <Button onClick={() => setShowScanCard(true)} variant="outline" size="sm" className="gap-1.5">
                    <ScanBarcode className="w-4 h-4" /> Scan Card
                  </Button>
                  <Button onClick={() => setShowBatchUpload(true)} variant="outline" size="sm" className="gap-1.5">
                    <Upload className="w-4 h-4" /> Batch Upload
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <NewContactForm open={showNewContact} onClose={() => setShowNewContact(false)} />
      <ScanCardForm open={showScanCard} onClose={() => setShowScanCard(false)} />
      <BatchUploadForm open={showBatchUpload} onClose={() => setShowBatchUpload(false)} />
    </div>
  );
};

// ── Page wrapper with provider ────────────────────────────────────────
const Contacts: React.FC = () => (
  <ContactProvider>
    <ContactsInner />
  </ContactProvider>
);

export default Contacts;
