---
type: registry
category: supabase-tables
updated: 2026-04-09
---

# Supabase Tables Registry

**Status**: EMPTY — no migrations checked into this repo (`supabase/migrations/` not present).

Per CLAUDE.md, Phase 3 (auth + RLS for core types) is marked complete on the live Supabase instance, but no migration SQL is tracked here. **Action item**: dump the live schema into `supabase/migrations/` so RLS policies can be audited from source.

## Required for every future entry
- Table name
- Columns (name, type, nullable, default)
- RLS enabled? (must be YES)
- RLS policies (SELECT/INSERT/UPDATE/DELETE — must filter by `auth.uid()`)
- Indexes
- Foreign keys
