/**
 * Maps between v1 Note (src/types/note.ts) and v2 NoteRow (Supabase).
 *
 * Field mapping reference:
 *
 * v1 Note                          v2 notes table
 * ─────────────────────────────    ────────────────────────────────────
 * id: string                  →   id: string (UUID)
 * title: string               →   title: string
 * content: string             →   content: string
 * tags: string[]              →   tags: string[]
 * color: string               →   color: string
 * isPinned: boolean           →   is_pinned: boolean
 * wordCount: number           →   word_count: number
 * createdAt: Date             →   created_at: string (ISO)
 * updatedAt: Date             →   updated_at: string (ISO)
 *
 * --- v1 fields with NO v2 column → stored in notes.metadata JSONB ---
 * category: string            →   metadata.category
 * isFavorite: boolean         →   metadata.isFavorite
 * linkedDate?: Date           →   metadata.linkedDate (ISO)
 * linkedEventIds: string[]    →   metadata.linkedEventIds
 *
 * --- v1 derived (not stored) ---
 * excerpt: string             →   recomputed from content on read
 *
 * --- v2 fields with no v1 equivalent (defaulted) ---
 *                             ←   user_id (from auth)
 *                             ←   team_id (null)
 *                             ←   vault_path ('/')
 *                             ←   backlinks ([])
 *                             ←   is_daily_note (false)
 *                             ←   visibility ('private')
 *                             ←   siyuan_block_id/notebook_id/synced_at (null)
 */

import type { Note } from '@/types/note';
import type { NoteRow, NoteInsert } from '@ofative/shared-types';
import { getExcerpt, getWordCount } from '@/services/noteService';

export type NoteRowWithMetadata = NoteRow & { metadata: Record<string, unknown> };

// ── Date helpers ─────────────────────────────────────────────────────
function toIso(d: Date | string | undefined | null): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : String(d);
}
function fromIso(s: string | null | undefined): Date | undefined {
  return s ? new Date(s) : undefined;
}

/**
 * Convert a v1 Note to a v2 NoteInsert.
 */
export function mapV1ToV2(note: Note, userId: string): NoteInsert & { metadata: Record<string, unknown> } {
  return {
    id: note.id,
    user_id: userId,
    title: note.title,
    content: note.content,
    tags: note.tags ?? [],
    color: note.color ?? '#f8fafc',
    is_pinned: note.isPinned,
    word_count: note.wordCount ?? getWordCount(note.content),
    visibility: 'private',
    vault_path: '/',
    backlinks: [],
    is_daily_note: false,
    created_at: toIso(note.createdAt) ?? undefined,
    updated_at: toIso(note.updatedAt) ?? undefined,
    metadata: buildMetadata(note),
  } as NoteInsert & { metadata: Record<string, unknown> };
}

/**
 * Convert v2 NoteRow to a v1 Note.
 */
export function mapV2ToV1(row: NoteRowWithMetadata): Note {
  const meta = row.metadata ?? {};
  return {
    id: row.id,
    title: row.title,
    content: row.content ?? '',
    excerpt: getExcerpt(row.content ?? ''),
    tags: row.tags ?? [],
    category: (meta.category as string) ?? '',
    color: row.color ?? '#f8fafc',
    isPinned: row.is_pinned,
    isFavorite: (meta.isFavorite as boolean) ?? false,
    linkedDate: meta.linkedDate ? fromIso(meta.linkedDate as string) : undefined,
    linkedEventIds: (meta.linkedEventIds as string[]) ?? [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    wordCount: row.word_count ?? 0,
  };
}

/**
 * Convert a v1 partial update to a v2 partial update.
 * Metadata-touching updates require existingMetadata for correct merge.
 */
export function mapV1UpdateToV2(
  updates: Partial<Note>,
  existingMetadata: Record<string, unknown> = {}
): Partial<NoteInsert> & { metadata?: Record<string, unknown> } {
  const v2: Partial<NoteInsert> & { metadata?: Record<string, unknown> } = {};

  if (updates.title !== undefined) v2.title = updates.title;
  if (updates.content !== undefined) {
    v2.content = updates.content;
    v2.word_count = getWordCount(updates.content);
  }
  if (updates.wordCount !== undefined && updates.content === undefined) {
    v2.word_count = updates.wordCount;
  }
  if (updates.tags !== undefined) v2.tags = updates.tags;
  if (updates.color !== undefined) v2.color = updates.color;
  if (updates.isPinned !== undefined) v2.is_pinned = updates.isPinned;

  // Always bump updated_at on any write (provider also sets updatedAt locally)
  if (updates.updatedAt !== undefined) {
    v2.updated_at = toIso(updates.updatedAt) ?? undefined;
  }

  // Merge metadata if any v1-only field changed
  const metaKeys: (keyof Note)[] = ['category', 'isFavorite', 'linkedDate', 'linkedEventIds'];
  const touchesMeta = metaKeys.some((k) => updates[k] !== undefined);
  if (touchesMeta) {
    v2.metadata = {
      ...existingMetadata,
      ...(updates.category !== undefined ? { category: updates.category } : {}),
      ...(updates.isFavorite !== undefined ? { isFavorite: updates.isFavorite } : {}),
      ...(updates.linkedDate !== undefined
        ? { linkedDate: updates.linkedDate ? toIso(updates.linkedDate) : null }
        : {}),
      ...(updates.linkedEventIds !== undefined ? { linkedEventIds: updates.linkedEventIds } : {}),
    };
  }

  return v2;
}

// ── Internal helpers ─────────────────────────────────────────────────
function buildMetadata(n: Note): Record<string, unknown> {
  return {
    category: n.category ?? '',
    isFavorite: n.isFavorite ?? false,
    ...(n.linkedDate ? { linkedDate: toIso(n.linkedDate) } : {}),
    linkedEventIds: n.linkedEventIds ?? [],
  };
}
