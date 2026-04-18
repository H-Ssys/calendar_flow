/**
 * Maps between v1 Contact (src/types/contact.ts) and v2 contacts row (Supabase).
 *
 * v1 Contact                       v2 contacts column
 * ─────────────────────────────    ────────────────────────────────────
 * id                          →    id
 * displayName                 ↔    name (also mirrored to full_name on write)
 * firstName/lastName          ←    split from name on read (not persisted)
 * company                     ↔    company
 * jobTitle                    ↔    title
 * industry                    ↔    industry
 * phone                       ↔    phone
 * email                       ↔    email
 * website                     ↔    website
 * address                     ↔    address
 * note                        ↔    notes
 * color                       ↔    avatar_color
 * starred                     ↔    is_favorite
 * tags                        ↔    tags
 * createdAt                   ↔    created_at
 * front_image_url             ↔    front_image_url
 * back_image_url              ↔    back_image_url
 * front_ocr / back_ocr        ↔    front_ocr / back_ocr (jsonb)
 * alt_language                ↔    alt_language
 * socials / phones            ↔    socials / phones (jsonb)
 * bio                         ↔    bio
 * pipeline_stage              ↔    pipeline_stage
 * deleted_at                  ↔    deleted_at
 * last_contacted_at           ↔    last_contacted_at
 *
 * v1-only (no DB column — dropped on write, defaulted on read):
 *   department, linkedIn, city, country, altFirstName/altLastName/altCompany/
 *   altJobTitle/altAddress, frontCardImage/backCardImage (legacy aliases),
 *   linkedEventIds/linkedTaskIds/linkedNoteIds (populated from linking tables)
 */

import type { Contact, OcrResult, SocialEntry, PhoneEntry } from '@/types/contact';

// Row shape from active_contacts view — looser than shared-types ContactRow
// because 013 + 013b added columns (full_name, front_ocr, etc.) that haven't
// been regenerated into shared-types yet.
export interface ContactRowLoose {
  id: string;
  user_id: string;
  name: string | null;
  full_name?: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  address: string | null;
  website: string | null;
  industry: string | null;
  notes: string | null;
  avatar_color: string | null;
  is_favorite: boolean | null;
  tags: string[] | null;
  front_image_url: string | null;
  back_image_url: string | null;
  front_ocr: OcrResult | null;
  back_ocr: OcrResult | null;
  alt_language: string | null;
  socials: SocialEntry[] | null;
  phones: PhoneEntry[] | null;
  bio: string | null;
  pipeline_stage: string | null;
  deleted_at: string | null;
  last_contacted_at: string | null;
  created_at: string;
}

function splitName(full: string): { firstName?: string; lastName?: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function mapV2ToV1(row: ContactRowLoose): Contact {
  const displayName = row.full_name ?? row.name ?? '';
  const { firstName, lastName } = splitName(displayName);
  return {
    id: row.id,
    displayName,
    firstName,
    lastName,
    company: row.company ?? undefined,
    jobTitle: row.title ?? undefined,
    industry: row.industry ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    website: row.website ?? undefined,
    address: row.address ?? undefined,
    note: row.notes ?? undefined,
    color: row.avatar_color ?? undefined,
    starred: row.is_favorite ?? false,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    front_image_url: row.front_image_url,
    back_image_url: row.back_image_url,
    front_ocr: row.front_ocr,
    back_ocr: row.back_ocr,
    alt_language: row.alt_language,
    socials: row.socials ?? [],
    phones: row.phones ?? [],
    bio: row.bio,
    pipeline_stage: row.pipeline_stage ?? 'contact',
    deleted_at: row.deleted_at,
    last_contacted_at: row.last_contacted_at,
    linkedEventIds: [],
    linkedTaskIds: [],
    linkedNoteIds: [],
  };
}

// Build an insert payload. `contacts.name` is NOT NULL, so we always resolve one.
export function mapV1ToV2Insert(
  data: Partial<Contact>,
  userId: string,
): Record<string, unknown> {
  const fullName =
    data.displayName?.trim() ||
    [data.firstName, data.lastName].filter(Boolean).join(' ').trim() ||
    'Unnamed Contact';

  return stripUndefined({
    user_id: userId,
    name: fullName,
    full_name: fullName,
    email: data.email ?? null,
    phone: data.phone ?? null,
    company: data.company ?? null,
    title: data.jobTitle ?? null,
    industry: data.industry ?? null,
    address: data.address ?? null,
    website: data.website ?? null,
    notes: data.note ?? null,
    avatar_color: data.color ?? null,
    is_favorite: data.starred ?? false,
    tags: data.tags ?? [],
    front_image_url: data.front_image_url ?? data.frontCardImage ?? null,
    back_image_url: data.back_image_url ?? data.backCardImage ?? null,
    front_ocr: data.front_ocr ?? null,
    back_ocr: data.back_ocr ?? null,
    alt_language: data.alt_language ?? null,
    socials: data.socials ?? [],
    phones: data.phones ?? [],
    bio: data.bio ?? null,
    pipeline_stage: data.pipeline_stage ?? 'contact',
    last_contacted_at: data.last_contacted_at ?? null,
  });
}

// Build an UPDATE payload — include only fields actually present in the patch.
export function mapV1UpdateToV2(updates: Partial<Contact>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  if (updates.displayName !== undefined ||
      updates.firstName !== undefined ||
      updates.lastName !== undefined) {
    const fullName =
      updates.displayName?.trim() ||
      [updates.firstName, updates.lastName].filter(Boolean).join(' ').trim();
    if (fullName) {
      patch.name = fullName;
      patch.full_name = fullName;
    }
  }
  if (updates.email !== undefined)             patch.email = updates.email ?? null;
  if (updates.phone !== undefined)             patch.phone = updates.phone ?? null;
  if (updates.company !== undefined)           patch.company = updates.company ?? null;
  if (updates.jobTitle !== undefined)          patch.title = updates.jobTitle ?? null;
  if (updates.industry !== undefined)          patch.industry = updates.industry ?? null;
  if (updates.address !== undefined)           patch.address = updates.address ?? null;
  if (updates.website !== undefined)           patch.website = updates.website ?? null;
  if (updates.note !== undefined)              patch.notes = updates.note ?? null;
  if (updates.color !== undefined)             patch.avatar_color = updates.color ?? null;
  if (updates.starred !== undefined)           patch.is_favorite = updates.starred;
  if (updates.tags !== undefined)              patch.tags = updates.tags ?? [];
  if (updates.front_image_url !== undefined)   patch.front_image_url = updates.front_image_url;
  if (updates.back_image_url !== undefined)    patch.back_image_url = updates.back_image_url;
  if (updates.front_ocr !== undefined)         patch.front_ocr = updates.front_ocr;
  if (updates.back_ocr !== undefined)          patch.back_ocr = updates.back_ocr;
  if (updates.alt_language !== undefined)      patch.alt_language = updates.alt_language;
  if (updates.socials !== undefined)           patch.socials = updates.socials;
  if (updates.phones !== undefined)            patch.phones = updates.phones;
  if (updates.bio !== undefined)               patch.bio = updates.bio;
  if (updates.pipeline_stage !== undefined)    patch.pipeline_stage = updates.pipeline_stage;
  if (updates.deleted_at !== undefined)        patch.deleted_at = updates.deleted_at;
  if (updates.last_contacted_at !== undefined) patch.last_contacted_at = updates.last_contacted_at;

  return patch;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}
