# Ofative Calendar Platform — Test Strategy

## Test Layers

### 1. Unit & Integration Tests (Vitest)

- **Target**: 80% line coverage minimum
- **Runner**: Vitest with jsdom environment
- **Location**: Co-located with source — `*.test.ts` files next to the module they test
  - `packages/supabase-client/src/*.test.ts`
  - `packages/shared-types/src/*.test.ts`
  - `calendar-main/src/**/*.test.ts`
- **Run**: `pnpm test` (via Turborepo)

### 2. End-to-End Tests (Playwright)

- **Location**: `e2e/` at the project root
- **Browsers**: Chromium, Firefox
- **Key Scenarios**:
  - Auth flow (sign up, sign in, sign out)
  - Create event with recurrence
  - Invite user to team, accept invitation
  - Global search (Cmd+K) across events, tasks, notes, contacts
  - Realtime sync (two tabs, one creates event, other sees it)
- **Run**: `pnpm exec playwright test`

### 3. RLS Policy Tests (pgTAP)

- **Target**: 100% coverage of all RLS policies across 26 tables
- **Location**: `supabase/tests/`
- **Runner**: `supabase test db`
- **Pattern**: For each table, test that:
  - Owner can CRUD their own rows
  - Team member can read team-visible rows
  - Non-member cannot access any rows
  - Guest permissions expire correctly

### 4. Backend API Tests (pytest)

- **Location**: `backend/tests/`
- **Runner**: pytest with httpx async client
- **Key Scenarios**:
  - JWT validation middleware
  - SiYuan proxy endpoints (notes CRUD)
  - Transcription endpoint (Whisper)
  - OCR endpoint (GenKit)
  - Rate limiting enforcement
  - Health and readiness checks

## Configuration Files

| Tool       | Config File            |
|------------|------------------------|
| Vitest     | `vitest.config.ts`     |
| Playwright | `playwright.config.ts` |
| pgTAP      | `supabase/config.toml` |
| pytest     | `backend/pyproject.toml` |

## CI Integration

Tests run in Turborepo pipeline:
- `turbo run test` — runs Vitest across all packages
- Playwright and pgTAP run as separate CI steps (require services)
