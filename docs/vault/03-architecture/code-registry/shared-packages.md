---
type: registry
category: shared-packages
updated: 2026-04-11
scan: step-6
---

# Shared Packages Registry

Three workspace packages under `packages/` — the v2 data layer intended to replace v1 localStorage.

---

## Package: @ofative/shared-types (`packages/shared-types/`)

- **Version**: 0.0.1 | **Main**: `src/index.ts`
- **Dependencies**: typescript ^5.7.0
- **Purpose**: Supabase-generated types — the v2 data model (26 tables)

### Exported Types (from `database.types.ts`)

#### Union Types (from CHECK constraints)
| Type | Values |
|------|--------|
| `TaskStatus` | `'todo' \| 'in_progress' \| 'review' \| 'done' \| 'cancelled'` |
| `Priority` | `'low' \| 'medium' \| 'high' \| 'critical'` |
| `Visibility` | `'private' \| 'team' \| 'specific'` |
| `OutcomeEmoji` | `'great' \| 'ok' \| 'rough'` |
| `RecordingStatus` | `'pending' \| 'processing' \| 'done' \| 'failed'` |
| `AssetModule` | `'contacts' \| 'notes' \| 'events' \| 'tasks' \| 'recordings' \| 'general'` |
| `TeamDefaultRole` | `'admin' \| 'member' \| 'viewer'` |
| `TeamMemberRole` | `'owner' \| 'admin' \| 'member' \| 'viewer' \| 'guest'` |
| `InvitationRole` | `'admin' \| 'member' \| 'viewer' \| 'guest'` |
| `InvitationStatus` | `'pending' \| 'accepted' \| 'declined' \| 'expired' \| 'revoked'` |
| `RsvpStatus` | `'pending' \| 'accepted' \| 'tentative' \| 'declined'` |
| `CommentEntityType` | `'event' \| 'task' \| 'note'` |
| `DevicePlatform` | `'ios' \| 'android' \| 'web'` |
| `FocusSessionType` | `'focus' \| 'short_break' \| 'long_break'` |
| `IdMappingEntityType` | `'event' \| 'task' \| 'note' \| 'contact' \| 'journal'` |

#### JSONB Interfaces
| Interface | Purpose |
|-----------|---------|
| `TeamSettings` | `Record<string, unknown>` on teams table |
| `NotificationPrefs` | `{ events, tasks, comments: boolean }` |
| `JournalSlot` | `{ hour, plan, actual, outcome }` |
| `JournalReflections` | `{ gratitude?, standardize?, not_good?, improvements?, encouragement?, notes? }` |
| `RecurringEventOverride` | `{ title?, description?, [key]: unknown }` |

#### Table Row/Insert/Update Types (26 tables)

| # | Table | Row Interface | Key Fields |
|---|-------|---------------|------------|
| 1 | profiles | `ProfileRow` | id, display_name, avatar_url, timezone, language, theme |
| 2 | contacts | `ContactRow` | user_id, team_id, name, email, phone, company, title, tags[], avatar_color, is_favorite, front/back_image_url |
| 3 | events | `EventRow` | user_id, team_id, title, start_time, end_time, all_day, color, recurrence_rule, visibility |
| 4 | tasks | `TaskRow` | user_id, team_id, title, status, priority, due_date, tags[], scheduled_date/slot_id, outcome_emoji/rating, time_spent |
| 5 | notes | `NoteRow` | user_id, title, content, vault_path, tags[], backlinks[], is_pinned, is_daily_note, siyuan_block_id |
| 6 | recordings | `RecordingRow` | user_id, note_id, file_url, transcript, summary, status |
| 7 | assets | `AssetRow` | user_id, module, file_url, file_name, metadata |
| 8 | teams | `TeamRow` | name, created_by, default_role, max_members, settings |
| 9 | team_members | `TeamMemberRow` | team_id, user_id, role, notification_prefs |
| 10 | team_invitations | `TeamInvitationRow` | team_id, invited_by, invitee_email, role, status, invite_token |
| 11 | shared_calendars | `SharedCalendarRow` | team_id, name, color, is_default |
| 12 | event_participants | `EventParticipantRow` | event_id, user_id, rsvp_status |
| 13 | comments | `CommentRow` | user_id, entity_type, entity_id, content, mentions[] |
| 14 | team_activity | `TeamActivityRow` | team_id, user_id, action, entity_type, metadata |
| 15 | notifications | `NotificationRow` | user_id, type, title, body, is_read |
| 16 | journal_entries | `JournalEntryRow` | user_id, date, yearly/monthly/daily_goal, slots[], reflections |
| 17 | task_activity | `TaskActivityRow` | task_id, user_id, action, old_value, new_value |
| 18 | subtasks | `SubtaskRow` | parent_task_id, title, is_completed, sort_order |
| 19 | recurring_event_occurrences | `RecurringEventOccurrenceRow` | event_id, occurrence_date, is_cancelled, override_data |
| 20 | device_tokens | `DeviceTokenRow` | user_id, token, platform |
| 21 | focus_sessions | `FocusSessionRow` | user_id, task_id, started_at, duration_minutes, session_type |
| 22 | contact_embeddings | `ContactEmbeddingRow` | contact_id, embedding (vector 1536), metadata |
| 23 | ai_cache | `AiCacheRow` | user_id, query_hash, response_json, expires_at |
| 24 | ai_correction_memory | `AiCorrectionMemoryRow` | user_id, contact_id, mistaken_text, incorrect/correct_field, feedback_summary (generated) |
| 25 | id_mapping | `IdMappingRow` | entity_type, v1_id, v2_id, migrated_at |
| 26 | linking tables | `ContactEvent/Task/NoteRow`, `EventTask/NoteRow` | composite PK, no separate id |

#### Database Interface
- `Database.public.Tables` — typed Supabase client with Row/Insert/Update per table
- `Database.public.Functions.user_team_ids` — RLS helper returning user's team IDs

---

## Package: @ofative/supabase-client (`packages/supabase-client/`)

- **Version**: 0.0.1 | **Main**: `src/index.ts`
- **Dependencies**: `@supabase/supabase-js ^2.49.0`, `@tanstack/react-query ^5.65.0`
- **Peer**: `react ^18 || ^19`
- **Dev**: `@ofative/shared-types workspace:*`

### client.ts
- **Purpose**: Initialize typed Supabase client
- **Env vars**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Export**: `supabase` — `SupabaseClient<Database>`
- **Pattern**: Module-level singleton, typed with `Database` from shared-types

### useAuth.ts
- **Purpose**: React hook for Supabase auth state
- **Export**: `useAuth() → AuthState`
- **Interface**: `AuthState { user, session, loading, signIn, signOut, signUp }`
- **Pattern**: `useState` + `onAuthStateChange` listener, memoized callbacks
- **Auth methods**: email/password sign-in, sign-up with optional metadata, sign-out

### useRealtimeQuery.ts
- **Purpose**: React Query + Supabase Realtime subscription hook
- **Export**: `useRealtimeQuery<T>(queryKey, queryFn, realtimeConfig) → UseQueryResult<T>`
- **Interface**: `RealtimeConfig { table, filter?, event? }`
- **Pattern**: Channel name `rt-{table}-{filter ?? 'all'}` prevents subscription collisions. On postgres_changes event, invalidates the React Query cache. This is the ONLY allowed Realtime pattern — components never call `supabase.channel()` directly.

### globalSearch.ts
- **Purpose**: Cmd+K global search across all entity types
- **Export**: `globalSearch(query, jwt) → Promise<SearchResult[]>`
- **Interface**: `SearchResult { type, id, title, snippet?, score }`
- **Pattern**: `Promise.allSettled` fan-out across events, tasks, notes, contacts (Supabase textSearch) + SiYuan full-text search via FastAPI proxy. Partial failure is NOT total failure. Results scored: events 1.0, tasks 0.9, contacts 0.85, notes 0.8, SiYuan 0.7.

### index.ts — Re-exports
- `supabase` (client)
- `useRealtimeQuery`, `useAuth`, `globalSearch`
- Types: `SearchResult`, `AuthState`, `RealtimeConfig`

---

## Package: @ofative/ui (`packages/ui/`)

- **Version**: 0.0.1 | **Private**: true
- **Exports**: `./tokens` → `tokens/index.ts`, `./tailwind.config` → `tailwind.config.ts`
- **Peer**: `tailwindcss ^3.4.0`

### Design tokens — see `docs/vault/06-design/system.md` for full values

**Barrel export** (`tokens/index.ts`):
- `COLORS`, `EVENT_COLORS`, `TASK_PRIORITY_COLORS`, `PDCA_OUTCOME_COLORS`
- `FONT_FAMILY`, `FONT_SIZE`, `FONT_WEIGHT`, `LINE_HEIGHT`
- `SPACING`, `SHADOWS`, `RADII`

### tailwind.config.ts
- **Purpose**: Shared Tailwind preset consuming all token files
- **Usage**: `import ofativePreset from '@ofative/ui/tailwind.config'; export default { presets: [ofativePreset], content: [...] }`
- **Maps**: colors (primary/secondary/neutral/success/warning/error/info), fontFamily (sans/mono), fontSize (with lineHeight tuples), spacing (px strings), boxShadow (none/sm/md/lg), borderRadius (none/sm/md/lg/xl/full)

---

## v1 vs v2 Gap Analysis

### Types: `src/types/` (v1) vs `packages/shared-types/` (v2)

| Entity | v1 Location | v2 Location | Migration Status |
|--------|-------------|-------------|-----------------|
| **Tasks** | `src/types/task.ts` | `shared-types: TaskRow` | **PARTIAL** — v2 adds team_id, assigned_to, visibility, parent_task_id. v1 has extra: actualResult, lessonsLearned, category, color, order, activityLog[], linkedEventIds/TaskIds. v1 uses `'in-progress'` (hyphen), v2 uses `'in_progress'` (underscore). v1 has `'urgent'` priority, v2 uses `'critical'`. |
| **Notes** | `src/types/note.ts` | `shared-types: NoteRow` | **PARTIAL** — v2 adds team_id, vault_path, backlinks[], is_daily_note, siyuan fields, visibility. v1 has extra: excerpt, category, isFavorite, linkedDate, linkedEventIds. |
| **Journal** | `src/types/dailyJournal.ts` | `shared-types: JournalEntryRow` | **PARTIAL** — v2 flattens structure (slots/reflections as JSONB). v1 has extra: timezone, title, urgentTasks[], attachments[]. v1 TimeSlot has done/deadline/linkedIds not in v2 JournalSlot. v1 reflections has 6 named fields, v2 has 6 matching keys. |
| **Events** | inline in CalendarContext | `shared-types: EventRow` | **NOT MIGRATED** — v1 events defined implicitly in CalendarContext with category system, event logs. v2 has team_id, shared_calendar_id, visibility, recurrence_rule. |
| **Contacts** | none in src/types/ | `shared-types: ContactRow` | **v2 only** — no v1 type exists, contacts were added in Phase 3. |
| **Recordings** | none | `shared-types: RecordingRow` | **v2 only** |
| **Teams** | none | `shared-types: TeamRow` + members/invitations | **v2 only** |
| **Subtasks** | nested in v1 `Task.subtasks[]` | `shared-types: SubtaskRow` | **STRUCTURAL CHANGE** — v1 inline array, v2 separate table with sort_order |
| **Task Activity** | v1 `Task.activityLog[]` | `shared-types: TaskActivityRow` | **STRUCTURAL CHANGE** — v1 inline array, v2 separate table with old/new_value |

### Key Type Mismatches Needing Migration Adapters

| Field | v1 | v2 | Action needed |
|-------|----|----|--------------|
| Task status | `'in-progress'` | `'in_progress'` | String replace |
| Task priority | `'urgent'` | `'critical'` | Enum rename |
| Dates | `Date` objects | ISO `string` | `toISOString()` on write, `new Date()` on read |
| Subtasks | `Task.subtasks[]` inline | `subtasks` table | Extract to separate table |
| Activity log | `Task.activityLog[]` inline | `task_activity` table | Extract to separate table |
| Note excerpt | computed client-side | not in v2 | Keep as client-side computation |
| Note isFavorite | boolean | not in v2 (only is_pinned) | Map to is_pinned or add column |
| Journal timezone | per-entry | per-profile | Read from profiles.timezone |

### Data Layer: `src/context/` (v1) vs `packages/supabase-client/` (v2)

| Concern | v1 Pattern | v2 Pattern | Status |
|---------|-----------|-----------|--------|
| **Persistence** | `localStorage` + JSON parse/stringify | Supabase PostgreSQL | v2 ready, v1 still active |
| **State management** | React Context + `useReducer`-style | React Query + Supabase client | v2 scaffolded, not wired |
| **Auth** | None (single-user) | Supabase Auth (`useAuth` hook) | v2 ready |
| **Realtime** | None | `useRealtimeQuery` (postgres_changes) | v2 ready |
| **Search** | Client-side filter in context | `globalSearch` (Supabase textSearch + SiYuan) | v2 ready |
| **Tasks CRUD** | `TaskContext.addTask/updateTask/deleteTask` + localStorage | Not yet — need to build `useTasks()` hook | **GAP** |
| **Notes CRUD** | `NoteContext.addNote/updateNote/deleteNote` + localStorage | Not yet — need to build `useNotes()` hook | **GAP** |
| **Events CRUD** | `CalendarContext` + localStorage with event logs | Not yet — need to build `useEvents()` hook | **GAP** |
| **Journal CRUD** | Not in context (page-level state) | Not yet — need to build `useJournal()` hook | **GAP** |
| **Contacts CRUD** | None in v1 | Not yet — need to build `useContacts()` hook | **GAP** |
| **Settings** | `CalendarContext` + multiple localStorage keys | `profiles` table | **GAP** — settings scattered across localStorage keys |

### Migration Recommendations

1. **Build v2 CRUD hooks** in `packages/supabase-client/`: `useTasks`, `useNotes`, `useEvents`, `useJournal`, `useContacts` — each wrapping `useRealtimeQuery` + Supabase mutations
2. **Create adapter layer** for v1 → v2 type mapping (status enum rename, Date ↔ string, inline arrays → separate tables)
3. **Use `id_mapping` table** (already in v2 schema) to track v1 localStorage IDs → v2 Supabase UUIDs during migration
4. **Phase out contexts gradually** — wire new pages to v2 hooks, keep v1 contexts for backward compat until all pages migrated
5. **Settings migration** — consolidate CalendarContext's 8+ localStorage keys into `profiles` table
