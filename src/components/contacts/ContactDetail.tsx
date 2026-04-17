import React, { useState } from 'react';
import { Contact, getInitials, CONTACT_COLORS } from '@/types/contact';
import { useContactContext } from '@/context/ContactContext';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  X, Trash2, Phone, MapPin, Building2,
  Calendar, FileText, Heart, Tag, Pencil, Check,
  Languages, Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ContactCardImages } from '@/components/contacts/ContactCardImages';
import { SocialPlatforms } from '@/components/contacts/SocialPlatforms';
import { ContactReferences } from '@/components/contacts/ContactReferences';
import { ContactFlow } from '@/components/contacts/ContactFlow';
import { getLanguageDisplayName } from '@/constants/languageDisplayNames';

interface ContactDetailProps {
  contact: Contact;
  onClose: () => void;
}

/* ── Inline-editable field ─────────────────────────────────────────── */
interface FieldProps {
  label: string;
  value?: string;
  placeholder?: string;
  type?: string;
  onSave: (v: string) => void;
}

const Field: React.FC<FieldProps> = ({ label, value, placeholder, type = 'text', onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  const commit = () => { onSave(draft); setEditing(false); };

  return (
    <div className="space-y-0.5 group">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
      {editing ? (
        <div className="flex gap-1 items-center">
          <input
            autoFocus
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
            className="flex-1 text-sm text-foreground bg-background border border-border rounded px-2 py-1 focus:outline-none focus:border-primary"
          />
          <button onClick={commit} className="p-1 text-primary hover:bg-primary/10 rounded flex-shrink-0">
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          className="text-sm font-medium text-left w-full flex items-center gap-1 group/field"
          onClick={() => { setDraft(value || ''); setEditing(true); }}
          title={`Click to edit ${label}`}
        >
          <span className={cn("flex-1 truncate", !value && "text-muted-foreground/40 italic font-normal text-xs")}>
            {value || (placeholder || '—')}
          </span>
          <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover/field:opacity-100 flex-shrink-0 transition-opacity" />
        </button>
      )}
    </div>
  );
};

/* ── Edit contact modal ──────────────────────────────────────────────── */
interface EditContactModalProps {
  contact: Contact;
  onSave: (data: Partial<Contact>) => void;
  onClose: () => void;
}

const EditContactModal: React.FC<EditContactModalProps> = ({ contact, onSave, onClose }) => {
  const [firstName, setFirstName] = useState(contact.firstName || '');
  const [lastName, setLastName] = useState(contact.lastName || '');
  const [company, setCompany] = useState(contact.company || '');
  const [jobTitle, setJobTitle] = useState(contact.jobTitle || '');
  const [department, setDepartment] = useState(contact.department || '');
  const [phone, setPhone] = useState(contact.phone || '');
  const [email, setEmail] = useState(contact.email || '');
  const [linkedIn, setLinkedIn] = useState(contact.linkedIn || '');
  const [website, setWebsite] = useState(contact.website || '');
  const [address, setAddress] = useState(contact.address || '');
  const [city, setCity] = useState(contact.city || '');
  const [country, setCountry] = useState(contact.country || '');
  const [note, setNote] = useState(contact.note || '');

  const handleSave = () => {
    const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || contact.displayName;
    onSave({ firstName, lastName, displayName, company, jobTitle, department, phone, email, linkedIn, website, address, city, country, note });
    onClose();
  };

  const inputCls = "w-full h-9 px-3 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls = "text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="bg-background rounded-xl shadow-2xl border border-border w-[560px] max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Edit Contact</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Identity */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground">Identity</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>First Name</label><input className={inputCls} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" /></div>
              <div><label className={labelCls}>Last Name</label><input className={inputCls} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" /></div>
            </div>
          </section>
          {/* Company */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground">Company & Role</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Company</label><input className={inputCls} value={company} onChange={e => setCompany(e.target.value)} placeholder="Company" /></div>
              <div><label className={labelCls}>Job Title</label><input className={inputCls} value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Job title" /></div>
              <div className="col-span-2"><label className={labelCls}>Department</label><input className={inputCls} value={department} onChange={e => setDepartment(e.target.value)} placeholder="Department" /></div>
            </div>
          </section>
          {/* Contact */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground">Contact Info</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Phone</label><input type="tel" className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555..." /></div>
              <div><label className={labelCls}>Email</label><input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@..." /></div>
              <div><label className={labelCls}>LinkedIn</label><input className={inputCls} value={linkedIn} onChange={e => setLinkedIn(e.target.value)} placeholder="linkedin.com/in/..." /></div>
              <div><label className={labelCls}>Website</label><input className={inputCls} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." /></div>
            </div>
          </section>
          {/* Location */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground">Location</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className={labelCls}>Address</label><input className={inputCls} value={address} onChange={e => setAddress(e.target.value)} placeholder="Street address" /></div>
              <div><label className={labelCls}>City</label><input className={inputCls} value={city} onChange={e => setCity(e.target.value)} placeholder="City" /></div>
              <div><label className={labelCls}>Country</label><input className={inputCls} value={country} onChange={e => setCountry(e.target.value)} placeholder="Country" /></div>
            </div>
          </section>
          {/* Notes */}
          <section className="space-y-1.5">
            <h4 className="text-xs font-semibold text-muted-foreground">Notes</h4>
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note..." className="min-h-[70px] resize-none text-sm border-dashed" />
          </section>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="h-9 px-4 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSave} className="h-9 px-4 text-sm bg-[#18181b] text-white dark:bg-white dark:text-black rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
      <div className="fixed inset-0 -z-10 bg-black/20" onClick={onClose} />
    </div>
  );
};

/* ── Main component ─────────────────────────────────────────────────── */
export const ContactDetail: React.FC<ContactDetailProps> = ({ contact, onClose }) => {
  const {
    updateContact, deleteContact, toggleStar,
    addContactReference, removeContactReference,
  } = useContactContext();
  const [tagInput, setTagInput] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [showAlt, setShowAlt] = useState(false);
  const [activeLang, setActiveLang] = useState<'front' | 'back'>('front');

  const hasAlt = !!(contact.altFirstName || contact.altLastName || contact.altCompany || contact.altJobTitle || contact.altAddress);
  const altDisplayName = [contact.altFirstName, contact.altLastName].filter(Boolean).join(' ') || null;

  const update = (data: Partial<Contact>) => updateContact(contact.id, data);
  const handleDelete = () => { deleteContact(contact.id); onClose(); };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || contact.tags?.includes(t)) return;
    update({ tags: [...(contact.tags || []), t] });
    setTagInput('');
  };

  const initials = getInitials(contact);

  // ── Language tab + OCR-derived display ────────────────────────────────
  const frontLang = contact.front_ocr?.language ?? 'en';
  const backLang = contact.alt_language;
  const showLanguageTabs = !!(contact.back_ocr && backLang);
  const displayOcr = activeLang === 'back' && contact.back_ocr
    ? contact.back_ocr
    : contact.front_ocr;

  // ── Flow + references wiring ──────────────────────────────────────────
  const contactReferences: [] = [];
  const navigateToContact = (_id: string) => { /* wired in D5 */ };
  const handleAddEvent = () => { /* wired in D5 */ };
  const handleAddTask = () => { /* wired in D5 */ };
  const handleAddNote = () => { /* wired in D5 */ };

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* ── Top bar ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Avatar with color picker */}
            <div className="relative group/avatar">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow flex-shrink-0"
                style={{ backgroundColor: contact.color || '#8B5CF6' }}
              >
                {initials}
              </div>
              <div className="absolute top-full left-0 mt-1 hidden group-hover/avatar:flex flex-wrap gap-1 bg-background border border-border rounded-lg p-1.5 shadow-xl z-20 w-28">
                {CONTACT_COLORS.map(c => (
                  <button key={c} onClick={() => update({ color: c })}
                    className={cn("w-4 h-4 rounded-full hover:scale-110 transition-transform", contact.color === c && "ring-2 ring-primary ring-offset-1")}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground leading-tight truncate">
                {showAlt && altDisplayName ? altDisplayName : contact.displayName}
              </h2>
              {showAlt && altDisplayName && contact.displayName && (
                <p className="text-[10px] text-muted-foreground/60 truncate">{contact.displayName}</p>
              )}
              {(showAlt ? (contact.altJobTitle || contact.altCompany) : (contact.jobTitle || contact.company)) && (
                <p className="text-xs text-muted-foreground truncate">
                  {showAlt
                    ? [contact.altJobTitle || contact.jobTitle, contact.altCompany || contact.company].filter(Boolean).join(' · ')
                    : [contact.jobTitle, contact.company].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Alt language toggle */}
            <button
              onClick={() => setShowAlt(!showAlt)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                showAlt
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-primary"
              )}
              title={showAlt ? 'Show primary language' : 'Show alternative language'}
            >
              <Languages className="w-4 h-4" />
            </button>
            {/* Heart (favourite) */}
            <button
              onClick={() => toggleStar(contact.id)}
              className={cn("p-1.5 rounded-md transition-colors", contact.starred ? "text-rose-500" : "text-muted-foreground hover:bg-muted hover:text-rose-500")}
              title={contact.starred ? 'Remove from favourites' : 'Add to favourites'}
            >
              <Heart className={cn("w-4 h-4", contact.starred && "fill-rose-500")} />
            </button>
            {/* Edit — opens full modal */}
            <button
              onClick={() => setShowEdit(true)}
              className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
              title="Edit contact"
            >
              <Pencil className="w-4 h-4" />
            </button>
            {/* Delete */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-colors" title="Delete contact">
                  <Trash2 className="w-4 h-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{contact.displayName}"?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently remove this contact.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md transition-colors">
              <X className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Business card images */}
          <div className="px-4 py-3 border-b border-border">
            <ContactCardImages
              frontUrl={contact.front_image_url ?? contact.frontCardImage ?? undefined}
              backUrl={contact.back_image_url ?? contact.backCardImage ?? undefined}
              onUploadFront={() => { /* wire to scan flow in D5 */ }}
              onUploadBack={() => { /* wire to scan flow in D5 */ }}
              contactName={contact.displayName ?? ''}
            />
          </div>

          {/* Language tab bar + OCR-derived display — only when back_ocr + alt_language */}
          {showLanguageTabs && backLang && (
            <div className="px-4 py-3 border-b border-border bg-primary/[0.02]">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setActiveLang('front')}
                  className={cn(
                    'text-xs px-3 py-1 rounded-full border transition-colors',
                    activeLang === 'front'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground'
                  )}
                >
                  {getLanguageDisplayName(frontLang)}
                </button>
                <button
                  onClick={() => setActiveLang('back')}
                  className={cn(
                    'text-xs px-3 py-1 rounded-full border transition-colors',
                    activeLang === 'back'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground'
                  )}
                >
                  {getLanguageDisplayName(backLang)}
                </button>
              </div>
              {displayOcr && (
                <div className="space-y-0.5">
                  {displayOcr.name && (
                    <div className="text-sm font-semibold text-foreground truncate">{displayOcr.name}</div>
                  )}
                  {(displayOcr.title || displayOcr.company) && (
                    <div className="text-xs text-muted-foreground truncate">
                      {[displayOcr.title, displayOcr.company].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {displayOcr.address && (
                    <div className="text-xs text-muted-foreground/80 truncate">{displayOcr.address}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Info sections — 2 col grid */}
          <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
            <div className="px-4 py-3 space-y-2.5">
              <h4 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" /> Contact Info
              </h4>
              <Field label="Phone" value={contact.phone} placeholder="Add phone" type="tel" onSave={v => update({ phone: v })} />
              <Field label="Email" value={contact.email} placeholder="Add email" type="email" onSave={v => update({ email: v })} />
              <Field label="LinkedIn" value={contact.linkedIn} placeholder="linkedin.com/in/..." onSave={v => update({ linkedIn: v })} />
              <Field label="Website" value={contact.website} placeholder="https://..." onSave={v => update({ website: v })} />
              <div className="pt-1">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Social Platforms</div>
                <SocialPlatforms
                  socials={contact.socials ?? []}
                  onChange={(socials) => update({ socials })}
                  readOnly={false}
                />
              </div>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              <h4 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Company & Role
              </h4>
              <Field label="Company" value={contact.company} placeholder="Company name" onSave={v => update({ company: v })} />
              <Field label="Job Title" value={contact.jobTitle} placeholder="Job title" onSave={v => update({ jobTitle: v })} />
              <Field label="Department" value={contact.department} placeholder="Department" onSave={v => update({ department: v })} />
              <Field label="Industry" value={contact.industry} placeholder="Industry" onSave={v => update({ industry: v })} />
            </div>
          </div>

          {/* Alt language section — shown when toggle is active */}
          {showAlt && (
            <div className="px-4 py-3 border-b border-border bg-primary/[0.02]">
              <h4 className="text-[10px] uppercase tracking-wider font-semibold text-primary/70 flex items-center gap-1 mb-2">
                <Languages className="w-3 h-3" /> Alternative Language {contact.alt_language ? `(${contact.alt_language})` : ''}
              </h4>
              {hasAlt ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {contact.altFirstName && (
                    <div className="space-y-0.5">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">First Name</div>
                      <div className="text-sm font-medium">{contact.altFirstName}</div>
                    </div>
                  )}
                  {contact.altLastName && (
                    <div className="space-y-0.5">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Last Name</div>
                      <div className="text-sm font-medium">{contact.altLastName}</div>
                    </div>
                  )}
                  {contact.altCompany && (
                    <div className="space-y-0.5">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Company</div>
                      <div className="text-sm font-medium">{contact.altCompany}</div>
                    </div>
                  )}
                  {contact.altJobTitle && (
                    <div className="space-y-0.5">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Job Title</div>
                      <div className="text-sm font-medium">{contact.altJobTitle}</div>
                    </div>
                  )}
                  {contact.altAddress && (
                    <div className="space-y-0.5 col-span-2">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Address</div>
                      <div className="text-sm font-medium">{contact.altAddress}</div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic">
                  No alternative language data yet. Scan a dual-language business card to populate.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
            <div className="px-4 py-3 space-y-2.5">
              <h4 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Location & Web
              </h4>
              <Field label="Address" value={contact.address} placeholder="Street address" onSave={v => update({ address: v })} />
              <Field label="City" value={contact.city} placeholder="City" onSave={v => update({ city: v })} />
              <Field label="Country" value={contact.country} placeholder="Country" onSave={v => update({ country: v })} />
            </div>
            <div className="px-4 py-3 space-y-3">
              {/* Tags */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Tags
                </h4>
                <div className="flex flex-wrap gap-1">
                  {contact.tags?.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs gap-1 px-2 py-0.5 h-5">
                      {tag}
                      <button onClick={() => update({ tags: contact.tags?.filter(t => t !== tag) })} className="hover:text-destructive">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="Add tag..."
                    className="flex-1 h-7 px-2 text-xs border border-dashed border-border rounded bg-background focus:outline-none focus:border-primary"
                  />
                  <button onClick={addTag} className="text-xs px-2 h-7 bg-muted rounded border border-border hover:bg-muted/70 transition-colors">Add</button>
                </div>
              </div>
              {/* Notes */}
              <div className="space-y-1">
                <h4 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Notes
                </h4>
                <Textarea
                  value={contact.note || ''}
                  onChange={e => update({ note: e.target.value })}
                  placeholder="Add a note..."
                  className="min-h-[56px] text-sm resize-none border-dashed"
                />
              </div>
            </div>
          </div>

          {/* References */}
          <div className="px-4 py-3 border-b border-border space-y-2">
            <h4 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> References
            </h4>
            <ContactReferences
              contactId={contact.id}
              references={contactReferences}
              onAdd={(refId, label) => addContactReference(contact.id, refId, label)}
              onRemove={(refId) => removeContactReference(contact.id, refId)}
              onContactClick={(id) => navigateToContact(id)}
            />
          </div>

          {/* Flow — Events, Tasks, Notes */}
          <div className="px-4 py-3 border-b border-border">
            <ContactFlow
              contactId={contact.id}
              linkedEventIds={contact.linkedEventIds ?? []}
              linkedTaskIds={contact.linkedTaskIds ?? []}
              linkedNoteIds={contact.linkedNoteIds ?? []}
              onAddEvent={() => handleAddEvent()}
              onAddTask={() => handleAddTask()}
              onAddNote={() => handleAddNote()}
            />
          </div>

          {/* Footer */}
          <div className="px-4 py-2 text-[10px] text-muted-foreground/40 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            Added {format(new Date(contact.createdAt), 'MMM d, yyyy')}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <EditContactModal
          contact={contact}
          onSave={update}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
};
