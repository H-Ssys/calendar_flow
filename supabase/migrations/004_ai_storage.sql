-- Migration: 004_ai_storage
-- Tables: device_tokens, focus_sessions, contact_embeddings, ai_cache, ai_correction_memory, id_mapping

-- =============================================
-- DEVICE TOKENS (Push notifications: APNS/FCM)
-- =============================================
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios','android','web')),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FOCUS SESSIONS (Pomodoro timer persistence)
-- =============================================
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  session_type TEXT DEFAULT 'focus' CHECK (session_type IN ('focus','short_break','long_break')),
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CONTACT EMBEDDINGS (AI vector search)
-- =============================================
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.contact_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contact_embeddings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- AI CACHE
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  query_hash TEXT NOT NULL,
  response_json JSONB NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, query_hash)
);

ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

-- =============================================
-- AI CORRECTION MEMORY
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_correction_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID NOT NULL,
  mistaken_text TEXT NOT NULL,
  incorrect_field TEXT NOT NULL,
  correct_field TEXT NOT NULL,
  feedback_summary TEXT GENERATED ALWAYS AS (
    'User moved "' || mistaken_text || '" from ' || incorrect_field || ' to ' || correct_field
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_correction_memory ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ID MAPPING (v1.0 string IDs -> v2.0 UUIDs)
-- =============================================
CREATE TABLE IF NOT EXISTS public.id_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('event','task','note','contact','journal')),
  v1_id TEXT NOT NULL,
  v2_id UUID NOT NULL,
  migrated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, v1_id)
);

ALTER TABLE public.id_mapping ENABLE ROW LEVEL SECURITY;
