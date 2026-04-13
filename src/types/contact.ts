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
