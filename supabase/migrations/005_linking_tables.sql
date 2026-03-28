-- Migration: 005_linking_tables
-- Tables: contact_events, contact_tasks, contact_notes, event_tasks, event_notes

CREATE TABLE IF NOT EXISTS public.contact_events (
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, event_id)
);

ALTER TABLE public.contact_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.contact_tasks (
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, task_id)
);

ALTER TABLE public.contact_tasks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.contact_notes (
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, note_id)
);

ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.event_tasks (
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, task_id)
);

ALTER TABLE public.event_tasks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.event_notes (
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, note_id)
);

ALTER TABLE public.event_notes ENABLE ROW LEVEL SECURITY;
