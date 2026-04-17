import React, { useState, useRef, useEffect } from 'react';
import { useContactContext } from '@/context/ContactContext';
import { Contact, CONTACT_COLORS } from '@/types/contact';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { User, Building2, Phone, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardCropEditor } from '@/components/contacts/CardCropEditor';
import { useCardProcessor } from '@/hooks/useCardProcessor';

interface NewContactFormProps {
  open: boolean;
  onClose: () => void;
  prefill?: Partial<Contact>;
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

export const NewContactForm: React.FC<NewContactFormProps> = ({ open, onClose, prefill }) => {
  const { addContact } = useContactContext();

  const [firstName, setFirstName] = useState(prefill?.firstName || '');
  const [lastName, setLastName] = useState(prefill?.lastName || '');
  const [company, setCompany] = useState(prefill?.company || '');
  const [jobTitle, setJobTitle] = useState(prefill?.jobTitle || '');
  const [department, setDepartment] = useState(prefill?.department || '');
  const [phone, setPhone] = useState(prefill?.phone || '');
  const [email, setEmail] = useState(prefill?.email || '');
  const [linkedIn, setLinkedIn] = useState(prefill?.linkedIn || '');
  const [website, setWebsite] = useState(prefill?.website || '');
  const [address, setAddress] = useState(prefill?.address || '');
  const [city, setCity] = useState(prefill?.city || '');
  const [country, setCountry] = useState(prefill?.country || '');
  const [frontCardImage, setFrontCardImage] = useState(prefill?.frontCardImage || '');
  const [backCardImage, setBackCardImage] = useState(prefill?.backCardImage || '');
  const [note, setNote] = useState(prefill?.note || '');
  const [color, setColor] = useState(prefill?.color || CONTACT_COLORS[0]);

  // OCR upload + consent state
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(
    prefill?.frontCardImage || null,
  );
  const [backPreview, setBackPreview] = useState<string | null>(
    prefill?.backCardImage || null,
  );
  const [frontBlob, setFrontBlob] = useState<Blob | null>(null);
  const [backBlob, setBackBlob] = useState<Blob | null>(null);
  const [showCropEditor, setShowCropEditor] = useState(false);
  const [currentSide, setCurrentSide] = useState<'front' | 'back'>('front');
  const [showOcrConsent, setShowOcrConsent] = useState(false);
  const [showAddBack, setShowAddBack] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { state, processFile, confirmCrop, reset: resetProcessor } = useCardProcessor({ mode: 'new' });

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'New Contact';

  const handleImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    side: 'front' | 'back',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCurrentSide(side);
    setOcrError(null);
    e.target.value = '';
    await processFile(file);
  };

  const handleCropConfirm = async (blob: Blob, side: 'front' | 'back') => {
    setShowCropEditor(false);
    const url = URL.createObjectURL(blob);
    if (side === 'front') {
      setFrontBlob(blob);
      setFrontPreview(url);
      setFrontCardImage(url);
      setShowOcrConsent(true);
    } else {
      setBackBlob(blob);
      setBackPreview(url);
      setBackCardImage(url);
      // Back side cropped — run OCR on it so alt_language + back_ocr populate.
      await confirmCrop(blob, 'back');
    }
  };

  const handleAutoFill = async () => {
    setShowOcrConsent(false);
    if (!frontBlob) return;
    await confirmCrop(frontBlob, 'front');
  };

  const handleManualEntry = () => {
    setShowOcrConsent(false);
    resetProcessor();
  };

  const handleAddBack = () => {
    setShowAddBack(false);
    setCurrentSide('back');
    backInputRef.current?.click();
  };

  const handleSkipBack = async () => {
    setShowAddBack(false);
    if (backBlob) {
      await confirmCrop(backBlob, 'back');
    }
  };

  // Auto-open the crop editor the moment preprocessing finishes.
  useEffect(() => {
    if (state.status === 'crop_pending') {
      setShowCropEditor(true);
    }
  }, [state.status]);

  useEffect(() => {
    if (state.status === 'ocr_success' || state.status === 'ocr_partial') {
      const { first, last } = splitName(state.front.name ?? '');
      if (first) setFirstName(first);
      if (last) setLastName(last);
      if (state.front.email) setEmail(state.front.email);
      if (state.front.phone) setPhone(state.front.phone);
      if (state.front.company) setCompany(state.front.company);
      if (state.front.title) setJobTitle(state.front.title);
      if (state.front.address) setAddress(state.front.address);
      if (state.front.website) setWebsite(state.front.website);
      setMissingFields(state.status === 'ocr_partial' ? state.missingFields : []);
      setOcrError(null);
      // Front-only result (no back yet): prompt to add a back side.
      if (!state.back && !backBlob) {
        setShowAddBack(true);
      }
    }
    if (state.status === 'ocr_failure') {
      setOcrError(state.error || "Card couldn't be read — filling manually");
      setMissingFields([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  const resetCardState = () => {
    setFrontBlob(null);
    setBackBlob(null);
    setFrontPreview(null);
    setBackPreview(null);
    setFrontCardImage('');
    setBackCardImage('');
    setShowCropEditor(false);
    setShowOcrConsent(false);
    setShowAddBack(false);
    setOcrError(null);
    setMissingFields([]);
    resetProcessor();
  };

  const handleCreate = () => {
    const payload: any = {
      displayName: displayName.trim() || 'New Contact',
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      company: company.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
      department: department.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      linkedIn: linkedIn.trim() || undefined,
      website: website.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      country: country.trim() || undefined,
      frontCardImage: frontCardImage || undefined,
      backCardImage: backCardImage || undefined,
      note: note.trim() || undefined,
      color,
      tags: [],
      starred: false,
      linkedEventIds: [],
      linkedTaskIds: [],
      linkedNoteIds: [],
    };
    if (state.status === 'ocr_success' || state.status === 'ocr_partial') {
      payload.front_ocr = state.front;
      payload.back_ocr = state.back ?? null;
      payload.alt_language = state.back?.language ?? null;
    }
    addContact(payload);
    setSuccessMessage('Contact saved! Add another or close.');
    setTimeout(() => {
      setSuccessMessage(null);
      resetCardState();
      setFirstName(''); setLastName(''); setCompany(''); setJobTitle('');
      setDepartment(''); setPhone(''); setEmail(''); setLinkedIn('');
      setWebsite(''); setAddress(''); setCity(''); setCountry('');
      setNote('');
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: color }}>
              {firstName ? firstName[0].toUpperCase() : '?'}
            </div>
            New Contact
          </DialogTitle>
          {/* Color picker */}
          <div className="flex gap-1.5 mt-1">
            {CONTACT_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn("w-5 h-5 rounded-full hover:scale-110 transition-transform", color === c && "ring-2 ring-primary ring-offset-1")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Business Card Upload (with OCR) */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div
              className="border-2 border-dashed border-border rounded-lg aspect-[1.75/1] flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors text-sm text-muted-foreground overflow-hidden"
              onClick={() => frontInputRef.current?.click()}
            >
              {frontPreview ? (
                <img src={frontPreview} alt="Front" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <span>Front side</span>
              )}
            </div>
            <div
              className="border-2 border-dashed border-border rounded-lg aspect-[1.75/1] flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors text-sm text-muted-foreground overflow-hidden"
              onClick={() => backInputRef.current?.click()}
            >
              {backPreview ? (
                <img src={backPreview} alt="Back" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <span>Back side (optional)</span>
              )}
            </div>
          </div>

          <input
            ref={frontInputRef}
            type="file"
            accept="image/*,.heic"
            hidden
            onChange={e => handleImageSelect(e, 'front')}
          />
          <input
            ref={backInputRef}
            type="file"
            accept="image/*,.heic"
            hidden
            onChange={e => handleImageSelect(e, 'back')}
          />

          {state.status === 'ocr_running' && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-primary">
              Reading card…
            </div>
          )}

          {missingFields.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              Some fields were empty: {missingFields.join(', ')}. Please review.
            </div>
          )}

          {ocrError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {ocrError}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          {/* Identity */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Identity
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} />
              <Input placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </section>

          {/* Company & Role */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Company & Role
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Company name" value={company} onChange={e => setCompany(e.target.value)} />
              <Input placeholder="Job title" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
              <Input placeholder="Department" value={department} onChange={e => setDepartment(e.target.value)} className="col-span-2" />
            </div>
          </section>

          {/* Contact Info */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Contact Info
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Input type="tel" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} />
              <Input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
              <Input placeholder="linkedin.com/in/..." value={linkedIn} onChange={e => setLinkedIn(e.target.value)} />
              <Input placeholder="Website URL" value={website} onChange={e => setWebsite(e.target.value)} />
            </div>
          </section>

          {/* Location */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Location
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Street address" value={address} onChange={e => setAddress(e.target.value)} className="col-span-2" />
              <Input placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
              <Input placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} />
            </div>
          </section>

          {/* Notes */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground">Notes</h4>
            <Textarea
              placeholder="Add a note about this contact..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="min-h-[70px] resize-none border-dashed text-sm"
            />
          </section>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} className="gap-1">
            Create Contact
          </Button>
        </DialogFooter>
      </DialogContent>

      <CardCropEditor
        isOpen={showCropEditor}
        imageSrc={state.status === 'crop_pending' ? state.imageUrl : ''}
        initialBounds={state.status === 'crop_pending' ? state.detectedBounds : undefined}
        currentSide={currentSide}
        onConfirm={(blob, side) => handleCropConfirm(blob, side)}
        onRedo={() => {
          setShowCropEditor(false);
          resetProcessor();
        }}
      />

      <AlertDialog open={showOcrConsent}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auto-fill from this card?</AlertDialogTitle>
            <AlertDialogDescription>
              Fields can be edited after. You'll be asked about a back side next.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleManualEntry}>
              Enter manually
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleAutoFill}>
              Fill automatically
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showAddBack}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add back side of card?</AlertDialogTitle>
            <AlertDialogDescription>
              Useful when the back has a secondary language or extra info. Optional.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipBack}>Skip</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddBack}>Add back side</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
