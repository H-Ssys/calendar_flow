-- Migration: 001_core_tables
-- Core tables: profiles, contacts, events, tasks, notes, recordings, assets

-- =============================================
-- PROFILES (extends Supabase auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CONTACTS (merged calendar-main + Cardwise)
-- =============================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID,  -- FK to teams added in 002_team_tables.sql
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  title TEXT,
  address TEXT,
  website TEXT,
  industry TEXT,
  reference TEXT,
  notes TEXT,
  avatar_color TEXT DEFAULT '#8b5cf6',
  is_favorite BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  front_image_url TEXT,
  back_image_url TEXT,
  tel_phone TEXT,
  fax TEXT,
  other_phone TEXT,
  other_email TEXT,
  tags TEXT[] DEFAULT '{}',
  -- Generated FTS column for PostgREST textSearch compatibility
  fts tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      COALESCE(name,'') || ' ' ||
      COALESCE(company,'') || ' ' ||
      COALESCE(industry,'') || ' ' ||
      COALESCE(email,''))
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- EVENTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID,  -- FK to teams added in 002_team_tables.sql
  shared_calendar_id UUID,  -- FK to shared_calendars added in 002_team_tables.sql
  created_by UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  color TEXT DEFAULT '#3b82f6',
  recurrence_rule TEXT,
  location TEXT,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private','team','specific')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TASKS
-- =============================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID,  -- FK to teams added in 002_team_tables.sql
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','done','cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  due_date TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  parent_task_id UUID REFERENCES public.tasks(id),
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private','team','specific')),
  tags TEXT[] DEFAULT '{}',
  -- PDCA fields (from v1.0 audit)
  scheduled_date DATE,
  scheduled_slot_id TEXT,
  outcome_emoji TEXT CHECK (outcome_emoji IN ('great','ok','rough')),
  outcome_rating INTEGER CHECK (outcome_rating BETWEEN 1 AND 5),
  time_spent INTEGER DEFAULT 0,  -- minutes
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- NOTES (SiYuan-backed, Markdown synced to Supabase)
-- =============================================
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID,  -- FK to teams added in 002_team_tables.sql
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  vault_path TEXT DEFAULT '/',
  tags TEXT[] DEFAULT '{}',
  backlinks UUID[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT FALSE,
  is_daily_note BOOLEAN DEFAULT FALSE,
  color TEXT DEFAULT '#f8fafc',
  word_count INTEGER DEFAULT 0,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private','team','specific')),
  -- SiYuan sync fields
  siyuan_block_id TEXT,          -- SiYuan document block ID
  siyuan_notebook_id TEXT,       -- SiYuan notebook ID
  siyuan_synced_at TIMESTAMPTZ,  -- Last sync timestamp
  -- Generated FTS column for PostgREST textSearch compatibility
  fts tsvector GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(title,'') || ' ' || COALESCE(content,''))
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RECORDINGS
-- =============================================
CREATE TABLE IF NOT EXISTS public.recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  note_id UUID REFERENCES public.notes(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  duration_seconds INTEGER,
  transcript TEXT,
  summary TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ASSETS (unified storage index)
-- =============================================
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module TEXT NOT NULL CHECK (module IN ('contacts','notes','events','tasks','recordings','general')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
