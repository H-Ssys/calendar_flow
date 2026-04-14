---
type: contract
feature: namecard-ocr
---

# Namecard OCR — API + Component Contract

## API contracts

### POST /api/contacts/ocr
Content-Type: multipart/form-data
Fields:
  front_image (UploadFile, required)
  back_image  (UploadFile, optional)
  user_id     (Form string, required)
Response:
  { front: OcrResult, back: OcrResult | null, processing_ms: number }

### POST /api/contacts/ocr/batch
Content-Type: multipart/form-data
Returns: { job_id: string }

### GET /api/contacts/ocr/status/{job_id}
Returns: { status: "pending"|"running"|"done"|"failed",
           progress: { done: number, total: number },
           results: OcrResult[] | null }

### POST /api/contacts/{id}/cards
Content-Type: multipart/form-data
Fields: side ("front"|"back"), image (UploadFile)
Returns: { url: string }

## OcrResult shape
{
  name, title, company, email, phone, phone_alt,
  address, website, language (ISO 639-1), raw_text
}
All fields optional except raw_text.

## Component interfaces

useCardProcessor(options?: { mode: "scan"|"new"|"batch" })
  Returns: { state: CardProcessorState, processFile, processBatch, reset }

CardCropEditor(props: {
  imageSrc: string,
  initialBounds?: { left, top, width, height },
  onConfirm: (blob: Blob, side: "front"|"back") => void,
  onRedo: () => void,
  isOpen: boolean
})

ContactCardImages(props: {
  frontUrl?: string, backUrl?: string,
  onUploadFront: () => void, onUploadBack: () => void,
  contactName: string
})

SocialPlatforms(props: {
  socials: SocialEntry[], onChange: (s: SocialEntry[]) => void, readOnly?: boolean
})

ContactReferences(props: {
  contactId: string, references: ReferenceEntry[],
  onAdd: (refId: string, label?: string) => void,
  onRemove: (refId: string) => void,
  onContactClick: (id: string) => void
})

ContactFlow(props: {
  contactId: string,
  linkedEventIds: string[], linkedTaskIds: string[], linkedNoteIds: string[],
  onAddEvent: () => void, onAddTask: () => void, onAddNote: () => void
})

## DB constraints (must never be violated by application code)

1. contacts.search_text is GENERATED ALWAYS — never UPDATE manually
2. contacts.reference_search_text is a plain tsvector — updated by trigger only
3. contact_references: always sort IDs before insert so source_contact_id < target_contact_id
4. All contact queries use active_contacts view (WHERE deleted_at IS NULL)
5. user_id is required on all new contacts rows — no anonymous contacts

## TypeScript Contact type — additions required

user_id:            string    // NEW — was missing entirely
front_image_url:    string | null
back_image_url:     string | null
front_ocr:          OcrResult | null
back_ocr:           OcrResult | null
alt_language:       string | null
socials:            SocialEntry[]
phones:             PhoneEntry[]
pipeline_stage:     string
bio:                string | null
birthday:           string | null  // ISO date
last_contacted_at:  string | null  // ISO datetime
deleted_at:         string | null  // soft delete

## Pre-scan reference (from 001_core_tables.sql)

`public.contacts` already ships with: `id, user_id (NOT NULL FK auth.users),
team_id, name (NOT NULL), email, phone, company, title, address, website,
industry, reference, notes, avatar_color, is_favorite, is_verified,
front_image_url, back_image_url, tel_phone, fax, other_phone, other_email,
tags[], fts (GENERATED), created_at, updated_at`. RLS is enabled in 001.

Migration 013 therefore:
- Uses `ADD COLUMN IF NOT EXISTS` for every new column (defensive)
- Adds ONLY: front_ocr, back_ocr, alt_language, socials, phones, pipeline_stage,
  bio, birthday, last_contacted_at, deleted_at, reference_search_text, search_text
- Creates new table `contact_references (source_contact_id, target_contact_id,
  label, created_at)` with CHECK (source_contact_id < target_contact_id) and RLS
- Creates view `active_contacts` as `SELECT * FROM contacts WHERE deleted_at IS NULL`
- Creates trigger to maintain `reference_search_text` from referenced contact names
