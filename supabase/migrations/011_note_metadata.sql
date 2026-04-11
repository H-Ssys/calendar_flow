-- Migration: 011_note_metadata
-- Adds JSONB metadata column to notes for v1-specific fields with no v2 equivalent.
-- Stores: category, isFavorite, linkedDate, linkedEventIds, linkedTaskIds, linkedContactIds
-- Cross-module links can be migrated to linking tables (event_notes, contact_notes)
-- in a future milestone.

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- RLS note: existing notes RLS policies cover this column — no new policy needed.
