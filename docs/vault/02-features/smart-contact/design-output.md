# Smart Contact — Design Output

> Captured from: http://app.187.77.154.212.sslip.io
> Phase: 5 | Date: 2026-04-12

---

## Components

| Component | File Path | Trigger |
|---|---|---|
| `ContactDetail` | `src/components/contacts/ContactDetail.tsx` | Click a contact in list |
| `NewContactForm` | `src/components/contacts/NewContactForm.tsx` | "+ New Contact" button |
| `ScanCardForm` | `src/components/contacts/ScanCardForm.tsx` | "Scan Card" button |
| `BatchUploadForm` | `src/components/contacts/BatchUploadForm.tsx` | "Batch Upload" button |
| `ContactList` | `src/components/contacts/ContactList.tsx` | Main contacts panel |

---

## 1. ContactDetail

**Props Interface**
```tsx
interface ContactDetailProps {
  contact: Contact;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Contact>) => void;
}
```

**Layout:** Right-side panel, `w-[380px] border-l border-border h-full flex flex-col`

**Sections:**
- Header: avatar initials + name + title + company + X button
- Stats row: `grid grid-cols-3` — linked events / tasks / notes
- Business card images: `grid grid-cols-2 gap-3`, `aspect-[3.5/2]`
- Data sections: Contact Info, Company & Role, Location, Social

**Key Classes:**
```
panel:     rounded-none border-l border-border h-full
avatar:    w-16 h-16 rounded-full bg-primary/10 text-2xl font-bold text-primary
stat:      bg-muted/30 rounded-lg px-3 py-2 text-center
section:   text-[10px] uppercase tracking-wider font-semibold text-muted-foreground
field:     flex items-center justify-between group
label:     text-xs text-muted-foreground
value:     text-sm font-medium text-foreground
card-img:  aspect-[3.5/2] rounded-lg border border-border overflow-hidden object-cover
```

---

## 2. NewContactForm

**Props Interface**
```tsx
interface NewContactFormProps {
  open: boolean;
  onClose: () => void;
  onCreated: (contact: Contact) => void;
}
```

**Layout:** `Dialog max-w-2xl p-0`, scrollable body `max-h-[70vh]`

**Sections:**
1. Card image drop zones (2 columns: Front / Back), `aspect-[3.5/2]`
2. Identity: first name + last name (grid 2)
3. Company & Role: company + title + department
4. Contact Info: phone + email + LinkedIn + website (grid 2)
5. Location: address + city + country

**Key Classes:**
```
dialog:     max-w-2xl rounded-xl p-0
drop-zone:  aspect-[3.5/2] border-2 border-dashed border-border rounded-lg
            flex flex-col items-center justify-center cursor-pointer
            hover:bg-primary/5 hover:border-primary/30 transition-colors
section:    text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2
grid:       grid grid-cols-2 gap-3
input:      h-9 text-sm (shadcn Input)
footer:     flex justify-end gap-2 pt-4 border-t border-border
```

---

## 3. ScanCardForm

**Props Interface**
```tsx
interface ScanCardFormProps {
  open: boolean;
  onClose: () => void;
  onExtracted: (data: Partial<Contact>) => void;
}
```

**Layout:** `Dialog max-w-lg`, compact 2-column camera capture grid

**Sections:**
1. Camera preview slots × 2 (Front / Back), `aspect-[3.5/2] bg-muted/30`
2. Capture button row (primary for front, outline for back)
3. Optional note textarea `min-h-[70px] border-dashed`

**Key Classes:**
```
preview:    aspect-[3.5/2] bg-muted/30 border-2 border-dashed border-border rounded-lg
            flex flex-col items-center justify-center cursor-pointer
capture-btn:w-full h-10 (primary variant for front, outline for back)
note:       min-h-[70px] resize-none border-dashed text-sm
extract-btn:gap-1 (Sparkles icon + "Extract Info")
```

**AI Integration Point:** `onExtracted` receives parsed contact data from OCR/AI service.

---

## 4. BatchUploadForm

**Props Interface**
```tsx
interface BatchUploadFormProps {
  open: boolean;
  onClose: () => void;
  maxCards?: number; // default 20
  onExtractAll: (contacts: Partial<Contact>[]) => void;
}
```

**Layout:** `Dialog max-w-3xl p-0`, scrollable list of card rows

**Card Row Grid:** `grid grid-cols-[1fr_1fr_200px] gap-3`

**Sections:**
- Header: title + counter Badge (`{extracted} / {total} contacts`)
- Scrollable list of CardRow components: Front drop | Back drop | Note textarea
- "Add more cards" dashed button at bottom
- Footer: Cancel + "Extract N Contacts" (disabled until ≥1 front image)

**Key Classes:**
```
dialog:     max-w-3xl p-0 rounded-xl
card-row:   p-3 rounded-lg border border-border bg-muted/10
card-label: text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1
drop-slot:  aspect-[3.5/2] border-2 border-dashed border-border rounded-lg
            cursor-pointer hover:bg-primary/5 hover:border-primary/30
note:       h-full min-h-[80px] resize-none text-sm border-dashed
add-btn:    w-full border-dashed h-10 border-2 border-border text-muted-foreground
extract-btn:gap-1 (Sparkles icon + count)
```

---

## Shared Design Tokens

| Token | Value |
|---|---|
| Drop zone default | `border-2 border-dashed border-border rounded-lg` |
| Drop zone hover | `hover:bg-primary/5 hover:border-primary/30 transition-colors` |
| Business card ratio | `aspect-[3.5/2]` |
| Section label | `text-[10px] uppercase tracking-wider font-semibold text-muted-foreground` |
| Field label | `text-xs text-muted-foreground` |
| Primary action | `bg-[#18181b] text-white gap-1 (Sparkles/Check icon)` |
| AI extract icon | `<Sparkles className="w-4 h-4" />` |
| Note field | `min-h-[60-80px] resize-none border-dashed text-sm` |
| Dialog scroll area | `max-h-[60-70vh] overflow-y-auto` |

---

## Contact Type Interface

```tsx
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
  jobTitle?: string;
  department?: string;
  phone?: string;
  email?: string;
  linkedIn?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  frontCardImage?: string;  // URL
  backCardImage?: string;   // URL
  note?: string;
  tags?: string[];
  createdAt: Date;
  linkedEventIds?: string[];
  linkedTaskIds?: string[];
  linkedNoteIds?: string[];
}
```
