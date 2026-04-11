---
type: adr
number: "010"
title: Dual-mode migration with auth-first strategy
status: accepted
date: 2026-04-11
---

# ADR-010: Dual-mode Migration with Auth-First Strategy

## Context

Flow currently stores all data in localStorage with no authentication. The target state is [[supabase-tables|Supabase PostgreSQL]] with RLS policies enforcing per-user isolation. We need a migration path that doesn't break the existing app while incrementally wiring up Supabase. See [[contexts]] for current v1 state owners and [[services]] for the persistence layer.

The `packages/supabase-client/` package already provides `useAuth`, `supabase` client, and `useRealtimeQuery` — but nothing in `src/` consumes them yet.

## Decision

### Phase M1: Auth shell (this milestone)

Add Supabase authentication as a **hard gate** before the app loads. No data migration yet — localStorage continues to own all persistence. The auth layer establishes:

1. `AuthProvider` wrapping the app (consumes `useAuth` from `@ofative/supabase-client`)
2. `ProtectedLayout` — redirects unauthenticated users to `/login`
3. `user.id` available via `useAuthContext()` to all components inside the protected boundary
4. Login and signup pages using existing shadcn/ui components

### Future phases: data migration

When contexts migrate from localStorage to Supabase:

- Each context (Calendar, Task, Note) will read `user.id` from `useAuthContext()` and pass it to Supabase queries
- The `id_mapping` table (already in the v2 schema) tracks v1 localStorage IDs to v2 Supabase UUIDs
- Contexts switch from `localStorage.getItem` to Supabase client calls one at a time
- RLS policies (already defined, 100% coverage) enforce user isolation at the database level

### Why auth-first, not data-first

1. **RLS requires `auth.uid()`** — Supabase queries without a session return empty results. Auth must exist before any data migration works.
2. **User identity is a prerequisite** for the `user_id` column on every table.
3. **Auth is self-contained** — it can ship without touching any existing data logic, making it low-risk.
4. **Testable in isolation** — login/signup can be verified without migrating any data.

## Consequences

- Users must create a Supabase account to access the app (even though data is still in localStorage)
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are required env vars
- The anon key is safe in `VITE_` prefix — it's public by Supabase design and gated by RLS
- Data contexts (Calendar, Task, Note) are unchanged — they still use localStorage
- The `AuthProvider` must be inside `BrowserRouter` (for `Navigate`) but outside the data providers (which only mount for authenticated users)

## Related

- [[contexts]] · [[services]] · [[supabase-tables]] · [[shared-packages]]
- [[workflow-state]] · [[codebase-scan]]
