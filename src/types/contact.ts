export interface OcrResult {
  name?: string | null;
  title?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  phone_alt?: string | null;
  address?: string | null;
  website?: string | null;
  language?: string | null;
  raw_text: string;
}

export interface SocialEntry {
  platform: string;
  value: string;
  label: string;
}

export interface PhoneEntry {
  type: string; // 'mobile' | 'work' | 'home' | 'direct' | 'fax' | 'other'
  value: string;
  isPrimary: boolean;
}

export interface CropBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type CardProcessorState =
  | { status: 'idle' }
  | { status: 'preprocessing' }
  | { status: 'crop_pending'; imageUrl: string; detectedBounds?: CropBounds }
  | { status: 'uploading' }
  | { status: 'ocr_running' }
  | { status: 'ocr_success'; front: OcrResult; back?: OcrResult }
  | { status: 'ocr_partial'; front: OcrResult; back?: OcrResult; missingFields: string[] }
  | { status: 'ocr_failure'; error: string };

export interface Contact {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  department?: string;
  industry?: string;
  phone?: string;
  email?: string;
  linkedIn?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  frontCardImage?: string;
  backCardImage?: string;
  note?: string;
  tags?: string[];
  starred?: boolean;
  createdAt: string; // ISO string
  linkedEventIds?: string[];
  linkedTaskIds?: string[];
  linkedNoteIds?: string[];
  color?: string;
  front_image_url: string | null;
  back_image_url: string | null;
  front_ocr: OcrResult | null;
  back_ocr: OcrResult | null;
  alt_language: string | null;
  socials: SocialEntry[];
  phones: PhoneEntry[];
  pipeline_stage: string;
  bio: string | null;
  deleted_at: string | null;
  last_contacted_at: string | null;
}

export interface BatchCard {
  id: string;
  frontImage?: string;
  backImage?: string;
  note?: string;
}

export const getInitials = (contact: Contact): string => {
  if (contact.firstName && contact.lastName) {
    return `${contact.firstName[0]}${contact.lastName[0]}`.toUpperCase();
  }
  const parts = contact.displayName.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return contact.displayName.slice(0, 2).toUpperCase();
};

export const CONTACT_COLORS = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];
