---
type: registry
category: supabase-tables
updated: 2026-04-11
scan: step-7
---

# Supabase Tables Registry

8 migrations, 26 public tables, 30 RLS test files, 37 indexes, 5 functions, 13 triggers. Read by [[api-endpoints]] and (post-migration) [[contexts]]; typed via [[shared-packages]] and [[types]].

---

## Migration Index

| # | File | Tables | Purpose |
|---|------|--------|---------|
| 001 | `001_core_tables.sql` | profiles, contacts, events, tasks, notes, recordings, assets | Core data model (7 tables) |
| 002 | `002_team_tables.sql` | teams, team_members, team_invitations, shared_calendars, event_participants, comments, team_activity, notifications | Team + collaboration (8 tables) |
| 003 | `003_journal_tasks.sql` | journal_entries, task_activity, subtasks, recurring_event_occurrences | Journal + task extensions (4 tables) |
| 004 | `004_ai_storage.sql` | device_tokens, focus_sessions, contact_embeddings, ai_cache, ai_correction_memory, id_mapping | AI + device + migration (6 tables) |
| 005 | `005_linking_tables.sql` | contact_events, contact_tasks, contact_notes, event_tasks, event_notes | Junction tables (5 tables) |
| 006 | `006_rls_policies.sql` | — | All RLS policies + `user_team_ids()` helper |
| 007 | `007_indexes.sql` | — | 37 strategic indexes |
| 008 | `008_functions_triggers.sql` | — | 5 functions + 13 triggers |

---

## Tables (by migration)

### profiles (Migration 001)
- **Columns**: `id UUID PK → auth.users`, display_name TEXT, avatar_url TEXT, timezone TEXT='UTC', language TEXT='en', theme TEXT='light', created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
- **RLS**: `"Own profile"` — FOR ALL WHERE `id = auth.uid()`
- **Indexes**: (PK only)
- **Triggers**: `set_updated_at`, `handle_new_user` (auto-creates on auth.users INSERT)
- **Used by**: useAuth hook (planned), profile settings page

### contacts (Migration 001)
- **Columns**: `id UUID PK`, user_id UUID FK→auth.users NOT NULL, team_id UUID FK→teams, name TEXT NOT NULL, email TEXT, phone TEXT, company TEXT, title TEXT, address TEXT, website TEXT, industry TEXT, reference TEXT, notes TEXT, avatar_color TEXT='#8b5cf6', is_favorite BOOL, is_verified BOOL, front_image_url TEXT, back_image_url TEXT, tel_phone TEXT, fax TEXT, other_phone TEXT, other_email TEXT, tags TEXT[], fts tsvector (GENERATED), created_at, updated_at
- **RLS**: View (own + team), Create (own), Update (own + team member/admin), Delete (own + team admin)
- **Indexes**: `idx_contacts_user`, `idx_contacts_team`, `idx_contacts_fts` (GIN)
- **Triggers**: `set_updated_at`
- **Used by**: OCR endpoint → flow-api, globalSearch, contact_embeddings

### events (Migration 001)
- **Columns**: `id UUID PK`, user_id UUID FK→auth.users NOT NULL, team_id UUID FK→teams, shared_calendar_id UUID FK→shared_calendars, created_by UUID FK→auth.users, title TEXT NOT NULL, description TEXT, start_time TIMESTAMPTZ NOT NULL, end_time TIMESTAMPTZ NOT NULL, all_day BOOL, color TEXT='#3b82f6', recurrence_rule TEXT, location TEXT, visibility TEXT CHECK(private/team/specific), created_at, updated_at
- **RLS**: View (own personal + team + participant), Create (own + team member+), Update (own + team admin), Delete (own + team admin)
- **Indexes**: `idx_events_user_time` (user_id, start_time), `idx_events_team`, `idx_events_recurrence` (partial)
- **Triggers**: `set_updated_at`, `cleanup_event_comments`
- **Used by**: CalendarContext (v1), globalSearch

### tasks (Migration 001)
- **Columns**: `id UUID PK`, user_id UUID FK→auth.users NOT NULL, team_id UUID FK→teams, assigned_to UUID FK→auth.users, created_by UUID FK→auth.users, title TEXT NOT NULL, description TEXT, status TEXT CHECK(todo/in_progress/review/done/cancelled), priority TEXT CHECK(low/medium/high/critical), due_date TIMESTAMPTZ, start_date TIMESTAMPTZ, parent_task_id UUID FK→tasks (self-ref), visibility TEXT, tags TEXT[], scheduled_date DATE, scheduled_slot_id TEXT, outcome_emoji TEXT CHECK(great/ok/rough), outcome_rating INT 1-5, time_spent INT=0, completed_at TIMESTAMPTZ, created_at, updated_at
- **RLS**: View (own + assigned + team), Create (own + team member+), Update (own + assigned + team admin)
- **Indexes**: `idx_tasks_user_due`, `idx_tasks_team`, `idx_tasks_assigned`, `idx_tasks_status` (user+status+due)
- **Triggers**: `set_updated_at`, `cleanup_task_comments`
- **Used by**: TaskContext (v1), globalSearch, focus_sessions

### notes (Migration 001)
- **Columns**: `id UUID PK`, user_id UUID FK→auth.users NOT NULL, team_id UUID FK→teams, title TEXT NOT NULL, content TEXT='', vault_path TEXT='/', tags TEXT[], backlinks UUID[], is_pinned BOOL, is_daily_note BOOL, color TEXT='#f8fafc', word_count INT=0, visibility TEXT, siyuan_block_id TEXT, siyuan_notebook_id TEXT, siyuan_synced_at TIMESTAMPTZ, fts tsvector (GENERATED), created_at, updated_at
- **RLS**: View (own + team), Create (own), Update (own + team member+), Delete (own + team admin)
- **Indexes**: `idx_notes_user`, `idx_notes_fts` (GIN), `idx_notes_siyuan` (partial)
- **Triggers**: `set_updated_at`, `cleanup_note_comments`
- **Used by**: NoteContext (v1), globalSearch, SiYuan sync service

### recordings (Migration 001)
- **Columns**: `id UUID PK`, user_id UUID FK→auth.users NOT NULL, note_id UUID FK→notes (SET NULL), file_url TEXT NOT NULL, file_size BIGINT, duration_seconds INT, transcript TEXT, summary TEXT, status TEXT CHECK(pending/processing/done/failed), created_at
- **RLS**: `"Own recordings"` — FOR ALL WHERE `user_id = auth.uid()`
- **Indexes**: `idx_recordings_status` (partial: pending/processing)
- **Used by**: Transcription endpoint (stub)

### assets (Migration 001)
- **Columns**: `id UUID PK`, user_id UUID FK→auth.users NOT NULL, module TEXT CHECK(contacts/notes/events/tasks/recordings/general) NOT NULL, file_url TEXT NOT NULL, file_name TEXT NOT NULL, file_type TEXT, file_size BIGINT, metadata JSONB='{}', created_at
- **RLS**: `"Own assets"` — FOR ALL WHERE `user_id = auth.uid()`
- **Indexes**: `idx_assets_user_module`
- **Used by**: File upload (planned)

### teams (Migration 002)
- **Columns**: `id UUID PK`, name TEXT NOT NULL, description TEXT, avatar_url TEXT, color TEXT='#6366f1', created_by UUID FK→auth.users (SET NULL), default_role TEXT CHECK(admin/member/viewer), max_members INT=50, is_active BOOL=TRUE, settings JSONB='{}', created_at, updated_at
- **RLS**: View (members), Manage (owner/admin), Delete (owner only)
- **Indexes**: (PK only)
- **Triggers**: `set_updated_at`

### team_members (Migration 002)
- **Columns**: `id UUID PK`, team_id UUID FK→teams NOT NULL, user_id UUID FK→auth.users NOT NULL, role TEXT CHECK(owner/admin/member/viewer/guest) NOT NULL='member', display_name TEXT, joined_at TIMESTAMPTZ, invited_by UUID FK→auth.users, expires_at TIMESTAMPTZ, notification_prefs JSONB
- **RLS**: View (team members), Join (via accepted invitation OR admin), Leave/Remove (self OR admin)
- **Indexes**: `idx_team_members_user`, `idx_team_members_team`
- **Constraint**: UNIQUE(team_id, user_id)

### team_invitations (Migration 002)
- **Columns**: `id UUID PK`, team_id UUID FK→teams NOT NULL, invited_by UUID FK→auth.users NOT NULL, invitee_email TEXT, invitee_user_id UUID FK→auth.users, role TEXT CHECK(admin/member/viewer/guest), status TEXT CHECK(pending/accepted/declined/expired/revoked), invite_token TEXT UNIQUE (random 32 bytes hex), message TEXT, expires_at TIMESTAMPTZ=NOW()+7days, responded_at, created_at
- **RLS**: Create (team admin), View (team members + invitee), Respond (invitee only)
- **Indexes**: `idx_invitations_token`, `idx_invitations_email`

### shared_calendars (Migration 002)
- **Columns**: `id UUID PK`, team_id UUID FK→teams NOT NULL, name TEXT NOT NULL, description TEXT, color TEXT='#3b82f6', created_by UUID FK→auth.users, is_default BOOL, created_at, updated_at
- **RLS**: View (team members), Manage (team admin)
- **Triggers**: `set_updated_at`

### event_participants (Migration 002)
- **Columns**: `id UUID PK`, event_id UUID FK→events NOT NULL, user_id UUID FK→auth.users NOT NULL, rsvp_status TEXT CHECK(pending/accepted/tentative/declined), responded_at
- **RLS**: View (event owner + team), Manage RSVP (own user_id)
- **Constraint**: UNIQUE(event_id, user_id)

### comments (Migration 002)
- **Columns**: `id UUID PK`, user_id UUID FK→auth.users NOT NULL, entity_type TEXT CHECK(event/task/note) NOT NULL, entity_id UUID NOT NULL, content TEXT NOT NULL, parent_comment_id UUID FK→comments (self-ref, CASCADE), mentions UUID[], created_at, updated_at
- **RLS**: View (can access parent entity), Create (own), Update/Delete (own only)
- **Indexes**: `idx_comments_entity` (entity_type, entity_id)
- **Triggers**: `set_updated_at`

### team_activity (Migration 002)
- **Columns**: `id UUID PK`, team_id UUID FK→teams NOT NULL, user_id UUID FK→auth.users (SET NULL), action TEXT NOT NULL, entity_type TEXT, entity_id UUID, metadata JSONB='{}', created_at
- **RLS**: Create (team members)
- **Indexes**: `idx_team_activity_team` (team_id, created_at DESC)
- **Retention**: 90 days via `cleanup_old_activity_data()`

### notifications (Migration 002)
- **Columns**: `id UUID PK`, user_id UUID FK→auth.users NOT NULL, team_id UUID FK→teams, type TEXT NOT NULL, title TEXT NOT NULL, body TEXT, entity_type TEXT, entity_id UUID, is_read BOOL=FALSE, created_at
- **RLS**: `"Own notifications"` — FOR ALL WHERE `user_id = auth.uid()`
- **Indexes**: `idx_notifications_user` (user_id, is_read), `idx_notifications_unread` (partial, DESC)
- **Retention**: 30 days for read notifications via `cleanup_old_activity_data()`

### journal_entries (Migration 003)
- **Columns**: `id UUID PK`, user_id UUID FK→auth.users NOT NULL, date DATE NOT NULL, yearly_goal TEXT, monthly_goal TEXT, daily_goal TEXT, daily_result TEXT, slots JSONB='[]', reflections JSONB='{}', created_at, updated_at
- **RLS**: `"Own journal"` — FOR ALL WHERE `user_id = auth.uid()`
- **Indexes**: `idx_journal_user_date` (user_id, date)
- **Constraint**: UNIQUE(user_id, date)
- **Triggers**: `set_updated_at`
- **Used by**: DailyJournal page (v1 → localStorage, v2 → this table)

### task_activity (Migration 003)
- **Columns**: `id UUID PK`, task_id UUID FK→tasks NOT NULL, user_id UUID FK→auth.users (SET NULL), action TEXT NOT NULL, old_value JSONB, new_value JSONB, created_at
- **RLS**: View (task owner + assigned + team), Create (own)
- **Indexes**: `idx_task_activity_task` (task_id, created_at DESC)
- **Retention**: 180 days via `cleanup_old_activity_data()`

### subtasks (Migration 003)
- **Columns**: `id UUID PK`, parent_task_id UUID FK→tasks NOT NULL, title TEXT NOT NULL, is_completed BOOL=FALSE, sort_order INT=0, created_at
- **RLS**: `"Access subtasks"` — FOR ALL via parent task access check
- **Indexes**: `idx_subtasks_parent` (parent_task_id, sort_order)

### recurring_event_occurrences (Migration 003)
- **Columns**: `id UUID PK`, event_id UUID FK→events NOT NULL, occurrence_date DATE NOT NULL, start_time TIMESTAMPTZ NOT NULL, end_time TIMESTAMPTZ NOT NULL, is_cancelled BOOL=FALSE, override_data JSONB
- **RLS**: View (parent event accessible)
- **Indexes**: `idx_occurrences_event` (event_id, occurrence_date)
- **Constraint**: UNIQUE(event_id, occurrence_date)

### device_tokens (Migration 004)
- **Columns**: `id UUID PK`, user_id UUID FK→auth.users NOT NULL, token TEXT NOT NULL, platform TEXT CHECK(ios/android/web) NOT NULL, last_seen_at TIMESTAMPTZ, created_at
- **RLS**: `"Own tokens"` — FOR ALL WHERE `user_id = auth.uid()`
- **Indexes**: `idx_device_tokens_user`
- **Constraint**: UNIQUE(user_id, token)

### focus_sessions (Migration 004)
- **Columns**: `id UUID PK`, user_id UUID FK→auth.users NOT NULL, task_id UUID FK→tasks (SET NULL), started_at TIMESTAMPTZ NOT NULL, ended_at TIMESTAMPTZ, duration_minutes INT, session_type TEXT CHECK(focus/short_break/long_break), completed BOOL=FALSE, created_at
- **RLS**: `"Own focus sessions"` — FOR ALL WHERE `user_id = auth.uid()`
- **Indexes**: `idx_focus_sessions_user` (user+started DESC), `idx_focus_sessions_task` (partial), `idx_focus_sessions_user_date` (partial: completed focus), `idx_focus_sessions_completed` (partial: task+duration)

### contact_embeddings (Migration 004)
- **Columns**: `id UUID PK`, contact_id UUID FK→contacts NOT NULL, embedding vector(1536), metadata JSONB, created_at
- **RLS**: `"Own embeddings"` — via parent contact ownership
- **Indexes**: `idx_embeddings_vec` (HNSW, vector_cosine_ops)
- **Extension**: `vector` (pgvector)
- **Used by**: embed endpoint (flow-api)

### ai_cache (Migration 004)
- **Columns**: `id UUID PK`, user_id UUID FK→auth.users NOT NULL, query_hash TEXT NOT NULL, response_json JSONB NOT NULL, expires_at TIMESTAMPTZ=NOW()+30days, created_at
- **RLS**: `"Own ai_cache"` — FOR ALL WHERE `user_id = auth.uid()`
- **Indexes**: `idx_ai_cache_expiry` (partial)
- **Constraint**: UNIQUE(user_id, query_hash)
- **Cleanup**: `cleanup_expired_ai_cache()` function

### ai_correction_memory (Migration 004)
- **Columns**: `id UUID PK`, user_id UUID FK→auth.users NOT NULL, contact_id UUID NOT NULL, mistaken_text TEXT NOT NULL, incorrect_field TEXT NOT NULL, correct_field TEXT NOT NULL, feedback_summary TEXT (GENERATED: `'User moved "{mistaken_text}" from {incorrect_field} to {correct_field}'`), created_at
- **RLS**: `"Own ai_corrections"` — FOR ALL WHERE `user_id = auth.uid()`
- **Used by**: OCR self-learning prompt (flow-api)

### id_mapping (Migration 004)
- **Columns**: `id UUID PK`, entity_type TEXT CHECK(event/task/note/contact/journal) NOT NULL, v1_id TEXT NOT NULL, v2_id UUID NOT NULL, migrated_at TIMESTAMPTZ
- **RLS**: `"Own migration records"` — via ownership of mapped v2 entity
- **Indexes**: `idx_id_mapping_entity` (entity_type, v1_id)
- **Constraint**: UNIQUE(entity_type, v1_id)
- **Used by**: v1→v2 data migration

### Linking Tables (Migration 005)

All 5 tables: composite PK, CASCADE on both FKs, RLS requires access to BOTH linked entities.

| Table | PK | FK1 | FK2 |
|-------|----|----|-----|
| contact_events | (contact_id, event_id) | contacts.id | events.id |
| contact_tasks | (contact_id, task_id) | contacts.id | tasks.id |
| contact_notes | (contact_id, note_id) | contacts.id | notes.id |
| event_tasks | (event_id, task_id) | events.id | tasks.id |
| event_notes | (event_id, note_id) | events.id | notes.id |

---

## Functions (Migration 006 + 008)

| Function | Language | Security | Purpose |
|----------|----------|----------|---------|
| `user_team_ids()` | SQL | DEFINER, STABLE | Returns team IDs for current user — used by ALL team RLS policies |
| `handle_new_user()` | plpgsql | DEFINER | Auto-creates profile row on auth.users INSERT |
| `set_updated_at()` | plpgsql | INVOKER | Sets `updated_at = NOW()` on row update |
| `delete_entity_comments()` | plpgsql | INVOKER | Deletes orphan comments when parent event/task/note deleted |
| `cleanup_expired_ai_cache()` | plpgsql | DEFINER | Deletes expired ai_cache rows, returns count |
| `cleanup_old_activity_data()` | plpgsql | DEFINER | Retention: team_activity 90d, task_activity 180d, read notifications 30d |

## Triggers (Migration 008)

| Trigger | Table | Event | Function |
|---------|-------|-------|----------|
| `on_auth_user_created` | auth.users | AFTER INSERT | `handle_new_user()` |
| `set_*_updated_at` (x9) | profiles, contacts, events, tasks, notes, teams, shared_calendars, comments, journal_entries | BEFORE UPDATE | `set_updated_at()` |
| `cleanup_*_comments` (x3) | events, tasks, notes | BEFORE DELETE | `delete_entity_comments()` |

---

## RLS Test Coverage

**30 test files — 100% table coverage.** Every public table has a dedicated RLS test.

| Table | Test File | # Tests | Operations Tested |
|-------|-----------|---------|------------------|
| profiles | rls_profiles.sql | 5 | SELECT, UPDATE |
| contacts | rls_contacts.sql | 9 | SELECT, INSERT, DELETE (personal + team) |
| events | rls_events.sql | 11 | SELECT, INSERT, UPDATE, DELETE (personal + team + participant) |
| tasks | rls_tasks.sql | 10 | SELECT, INSERT, UPDATE (owner + team + assigned) |
| notes | rls_notes.sql | 8 | SELECT, INSERT, DELETE (personal + team) |
| recordings | rls_recordings.sql | 5 | SELECT, INSERT, DELETE |
| assets | rls_assets.sql | 5 | SELECT, INSERT, DELETE |
| teams | rls_teams.sql | 8 | SELECT, UPDATE, DELETE (owner vs member) |
| team_members | rls_team_members.sql | 7 | SELECT, INSERT, DELETE |
| team_invitations | rls_team_invitations.sql | 7 | SELECT, INSERT, UPDATE |
| shared_calendars | rls_shared_calendars.sql | 6 | SELECT, UPDATE |
| event_participants | rls_event_participants.sql | 6 | SELECT, INSERT, UPDATE |
| comments | rls_comments.sql | 8 | SELECT, INSERT, UPDATE, DELETE |
| team_activity | rls_team_activity.sql | 4 | INSERT |
| notifications | rls_notifications.sql | 5 | SELECT, INSERT, DELETE |
| journal_entries | rls_journal_entries.sql | 5 | SELECT, INSERT, UPDATE |
| task_activity | rls_task_activity.sql | 6 | SELECT, INSERT |
| subtasks | rls_subtasks.sql | 6 | SELECT, INSERT, UPDATE |
| recurring_event_occurrences | rls_recurring_event_occurrences.sql | 4 | SELECT |
| device_tokens | rls_device_tokens.sql | 5 | SELECT, INSERT, DELETE |
| focus_sessions | rls_focus_sessions.sql | 5 | SELECT, INSERT, DELETE |
| contact_embeddings | rls_contact_embeddings.sql | 5 | SELECT, INSERT, DELETE |
| ai_cache | rls_ai_cache.sql | 5 | SELECT, INSERT, DELETE |
| ai_correction_memory | rls_ai_correction_memory.sql | 5 | SELECT, INSERT, DELETE |
| id_mapping | rls_id_mapping.sql | 5 | SELECT, INSERT, DELETE |
| contact_events | rls_contact_events.sql | 5 | SELECT, INSERT, DELETE |
| contact_tasks | rls_contact_tasks.sql | 5 | SELECT, INSERT, DELETE |
| contact_notes | rls_contact_notes.sql | 5 | SELECT, INSERT, DELETE |
| event_tasks | rls_event_tasks.sql | 5 | SELECT, INSERT, DELETE |
| event_notes | rls_event_notes.sql | 5 | SELECT, INSERT, DELETE |

**Total**: 178 RLS test assertions. All test cross-user isolation. No security gaps found.

---

## Schema Dump Analysis

**Source**: `supabase-schema-dump.sql` (9,556 lines, PostgreSQL 15.8)

### Extensions Enabled (10)
| Extension | Schema | Purpose |
|-----------|--------|---------|
| `vector` | public | pgvector — HNSW/IVFFlat vector search |
| `uuid-ossp` | extensions | UUID generation |
| `pg_trgm` | public | Trigram similarity (fuzzy search) |
| `pgcrypto` | extensions | Cryptographic functions |
| `pgjwt` | extensions | JWT signing/verification |
| `pg_net` | extensions | HTTP client from SQL |
| `pg_stat_statements` | extensions | Query performance tracking |
| `pgsodium` | pgsodium | Encryption (Vault) |
| `supabase_vault` | vault | Secret management |
| `pg_graphql` | graphql | GraphQL API |

### Schema Drift (Live DB vs Migrations)

| Table in Live DB | In Migrations? | Status |
|-----------------|----------------|--------|
| `public.daily_journals` | NO | **DRIFT** — exists in live DB, not in migrations |
| `public.user_settings` | NO | **DRIFT** — exists in live DB, not in migrations |
| All 26 migration tables | YES | OK |

**2 drifted tables** created directly on the live DB without migration files. These should either be added as migration 009 or dropped if superseded (daily_journals may be the predecessor to journal_entries; user_settings may be predecessor to profiles).

### Custom Types
- No custom ENUMs in public schema — all constraints use CHECK on TEXT columns (good: avoids ALTER TYPE migrations)
- auth schema has 5 ENUMs (aal_level, code_challenge_method, factor_status, factor_type, one_time_token_type) — Supabase-managed

---

## Cross-Reference: Frontend Context → Tables

| Frontend Layer | Read Tables | Write Tables | Status |
|---------------|-------------|-------------|--------|
| **CalendarContext** (v1, localStorage) | — | — | NOT WIRED to Supabase |
| → should read/write | events, recurring_event_occurrences, event_participants, shared_calendars | events, recurring_event_occurrences | **GAP** |
| **TaskContext** (v1, localStorage) | — | — | NOT WIRED to Supabase |
| → should read/write | tasks, subtasks, task_activity | tasks, subtasks, task_activity | **GAP** |
| **NoteContext** (v1, localStorage) | — | — | NOT WIRED to Supabase |
| → should read/write | notes | notes | **GAP** |
| **DailyJournal** (v1, page-level state) | — | — | NOT WIRED to Supabase |
| → should read/write | journal_entries | journal_entries | **GAP** |
| **globalSearch** (v2, packages/) | events, tasks, notes, contacts | — | WIRED (read-only) |
| **useAuth** (v2, packages/) | profiles (via auth) | — | WIRED |
| **OCR endpoint** (flow-api) | ai_correction_memory | contacts (indirect) | WIRED |
| **Embed endpoint** (flow-api) | — | contact_embeddings | WIRED |
| **SiYuan sync** (not active) | notes | notes | NOT ACTIVE |

### Tables With No Frontend Consumer Yet

| Table | Reason |
|-------|--------|
| teams, team_members, team_invitations | Team features not built in frontend |
| comments | Comment UI not built |
| team_activity, notifications | Notification system not built |
| recordings | Recording/transcription UI not built |
| assets | File management UI not built |
| device_tokens | Push notification system not built |
| focus_sessions | Pomodoro timer not wired to Supabase |
| ai_cache | AI chat not implemented |
| id_mapping | Migration tool not built |

---

## Related

- Clients: [[contexts]] · [[services]] · [[api-endpoints]]
- Contracts: [[types]] · [[shared-packages]]
- Migration: [[adr-010-dual-mode-migration]]
