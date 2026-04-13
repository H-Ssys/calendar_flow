import React, { useState } from 'react';
import { useContactContext } from '@/context/ContactContext';
import { Contact, CONTACT_COLORS } from '@/types/contact';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, User, Building2, Phone, Mail, MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewContactFormProps {
  open: boolean;
  onClose: () => void;
  prefill?: Partial<Contact>;
}

interface ImageDropZoneProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
}

const ImageDropZone: React.FC<ImageDropZoneProps> = ({ label, value, onChange }) => {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onChange(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
      <label className={cn(
        "aspect-[3.5/2] flex flex-col items-center justify-center rounded-lg cursor-pointer transition-colors",
        "border-2 border-dashed border-border hover:bg-primary/5 hover:border-primary/30",
        value ? "p-0 overflow-hidden" : "gap-2"
      )}>
        {value ? (
          <img src={value} alt={label} className="w-full h-full object-cover" />
        ) : (
          <>
            <Upload className="w-6 h-6 text-muted-foreground/40" />
            <span className="text-xs text-muted-foreground text-center px-2">Click or drag image</span>
          </>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>
    </div>
  );
};

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

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'New Contact';

  const handleCreate = () => {
    addContact({
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
    });
    onClose();
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
          {/* Business Card Images */}
          <div className="grid grid-cols-2 gap-4">
            <ImageDropZone label="Front Card" value={frontCardImage} onChange={setFrontCardImage} />
            <ImageDropZone label="Back Card" value={backCardImage} onChange={setBackCardImage} />
          </div>

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
    </Dialog>
  );
};
