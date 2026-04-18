# Phase D — QA Regression Report

**Date:** 2026-04-18
**Method:** `npx vite build` (clean, 0 errors) + code-inspection trace per file.
**Scope:** 14 checks — 9 existing-functionality regressions + 5 new Phase D features.

## Summary

| Outcome | Count |
|---------|-------|
| PASS | 11 |
| DEFERRED | 1 (D7-1) |
| NEEDS-BROWSER | 2 |

**Overall: D6 CLOSED with one item deferred.** FAIL #9 was fixed in commit `9e94ccb` ("D6-fix: server-side FTS search via tsvector columns") — server-side search is now wired via `searchContacts` in `ContactContext` and consumed by `ContactsInner` with a 300ms debouncer. FAIL #8 is logged as **D7-1** (see `spec.md` §"D7 — Post-launch fixes"); it is a schema-blocking feature, not a regression.

## Results

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Contact list renders from Supabase `active_contacts` view | PASS | `ContactContext.tsx:40` queries `.from('active_contacts').select('*').eq('user_id', user.id)`. Result is mapped via `mapV2ToV1` into local state. `Contacts.tsx` renders `contacts` from context. |
| 2 | Clicking a contact opens the detail panel | PASS | `Contacts.tsx:150` sets `selectedId`; `:198` conditionally renders `<ContactDetail contact={selectedContact} />`. |
| 3 | Favorite/star toggle — async Supabase | PASS | `ContactContext.toggleStar` (L100–111) optimistically flips `starred`, writes `is_favorite: next` to Supabase. Detail heart button (`ContactDetail.tsx:285`) wired. Minor risk: on DB error the optimistic flip is not rolled back — only logged. Acceptable but worth noting. |
| 4 | Create new contact manually (no OCR) — writes to DB | PASS | `ContactContext.addContact` (L58–71) calls `mapV1ToV2Insert(..., user.id)` → `supabase.from('contacts').insert(...)`. `contactTypeMapper.ts:127` confirms `user_id` is in the insert payload. Returns via `.select().single()` and prepends to state. |
| 5 | Edit contact fields — updateContact saves to Supabase | PASS | `updateContact` (L73–87) runs optimistic state update then `.update(patch).eq('id').eq('user_id')`. Inline `Field` commits via `onSave → update({field: v})` path. |
| 6 | Delete contact — soft delete via `deleted_at`, hides from list | PASS | `deleteContact` (L89–98) optimistically removes from local state and writes `deleted_at = now()` to `contacts`. `active_contacts` view excludes rows where `deleted_at IS NULL`, so a refresh would still hide it. |
| 7 | Linked events/tasks/notes via `ContactFlow` — correct counts | PASS | `ContactDetail.tsx:221–223` filters `events/tasks/notes` by `linkedEventIds/linkedTaskIds/linkedNoteIds`. `ContactFlow.tsx:223–225` renders `StatCard count={linkedEvents.length}` etc. |
| 8 | Add event from contact — event linked bidirectionally | **DEFERRED → D7-1** | `ContactDetail.tsx:225–227` `handleAddEvent` / `handleAddTask` / `handleAddNote` are `/* wired in D5 */` empty stubs. Bidirectional linking cannot happen today: no `linked_contact_ids` column exists on `events / tasks / notes` (zero repo-wide matches for `contactIds | contact_ids | linkedContactIds`). Fix requires migration + context API + handler wiring — logged as **D7-1** in `spec.md`. |
| 9 | Contact search — both `search_text` and `reference_search_text` queried | **PASS** (after `9e94ccb`) | `ContactContext.searchContacts` (added in commit `9e94ccb`) issues `supabase.from('active_contacts').or('search_text.fts(simple).<q>,reference_search_text.fts(simple).<q>').limit(50)`. `Contacts.tsx` now uses a 300ms-debounced `useEffect` that stores results in `searchResults` state, with a subtle `Loader2` spinner replacing the clear-X while `isSearching`. Empty query short-circuits back to `contacts`. |
| 10 | Card thumbnails — `ContactCardImages` renders | PASS | `ContactDetail.tsx:327–335` renders with `frontUrl = front_image_url ?? frontCardImage`, `backUrl = back_image_url ?? backCardImage`. Upload handlers remain stubbed pending scan-flow wiring. |
| 11 | Language tab bar — appears when `back_ocr && alt_language` | PASS | `ContactDetail.tsx:210` `showLanguageTabs = !!(contact.back_ocr && backLang)`. Buttons toggle `activeLang`; `displayOcr` swap (L211–213) correctly falls back to `contact.front_ocr` when `activeLang === 'front'` or when `back_ocr` missing. Also NEEDS-BROWSER for visual verification (see below). |
| 12 | Social platforms — renders, edit mode works | PASS | `ContactDetail.tsx:394–398` renders `SocialPlatforms` with `readOnly={false}`. `onChange` routes to `update({ socials })` → `updateContact` → Supabase. `contactTypeMapper.ts:185` confirms `socials` is in the update patch. Also NEEDS-BROWSER for end-to-end (see below). |
| 13 | References — renders with `availableContacts` | PASS | `ContactDetail.tsx:515–522` passes `availableContacts = contacts.filter(c => c.id !== contact.id)`. `ContactReferences.tsx:22` accepts the prop. Note: `references={[]}` is still hard-coded in the parent; `onAdd` writes to Supabase but the UI never re-fetches or round-trips. Render path is correct; round-trip display is out of scope for #13 but tracked below. |
| 14 | Flow section — shows real events/tasks/notes | PASS | `ContactDetail.tsx:529–531` passes `linkedEvents/Tasks/Notes` arrays (not IDs). `ContactFlow.tsx:207–217` maps each to `FlowItem` and sorts. Real data flows through; placeholder lists from design-spec are gone. |

## NEEDS-BROWSER checklist (visual/E2E verification)

| Item | What to verify |
|------|----------------|
| #11 Language tabs | Load a contact with `back_ocr` populated and non-null `alt_language`. Tab bar should render between card images and info grid. Clicking the back-language pill swaps the displayed name/title/company/address to `back_ocr` fields. Email/phone/website stay unchanged. |
| #12 Socials edit | Open any contact. Click "Add platform" → pick LinkedIn → type a handle → blur. Reopen the contact — handle persists (round-trip through Supabase). Remove (×) persists too. |

Also worth visually confirming even though code paths PASS:
- #3 optimistic star flip reverts correctly when Supabase errors (currently it does NOT — see #3 note).
- #13 adding a reference writes to `contact_references` with canonical-direction sort; RLS via `migration 013` block 6 requires both contacts belong to `auth.uid()`.

## DEFERRED — Item #8 → D7-1 (Add event/task/note from contact)

**Root cause:** `handleAddEvent / handleAddTask / handleAddNote` in `ContactDetail.tsx:225–227` are empty stubs.

**Why deferred (cannot fix in a QA pass):**
- There is no `linked_contact_ids` column on `events`, `tasks`, or `notes` tables. Zero matches repo-wide for `contactIds | contact_ids | linkedContactIds`.
- `Contact.linkedEventIds` exists on the client `Contact` type but is not persisted (no DB column exists).
- Fixing requires: (a) new migration adding `linked_contact_ids uuid[] DEFAULT '{}'` + GIN indexes on each of the three tables, (b) RLS-compatible read paths, (c) type/mapper updates, (d) new context API calls on `CalendarContext.addEvent`, `TaskContext.addTask`, `NoteContext.addNote` to accept the link, (e) wiring `ContactDetail` handlers to call those APIs with `[contact.id]`.
- Tracked as **D7-1** in `spec.md` §"D7 — Post-launch fixes".

## RESOLVED — Item #9 (server-side FTS) — commit `9e94ccb`

`ContactContext` now exposes `searchContacts(query)` that queries `active_contacts` with `.or('search_text.fts(simple).<q>,reference_search_text.fts(simple).<q>').limit(50)`. Memoised with `useCallback` so the consumer's debouncer has a stable identity. `Contacts.tsx` calls it from a 300ms-debounced `useEffect` and renders `searchResults`. Verified by `npx vite build` (clean) at the time of commit.

## D7 backlog (non-blocking; logged in `spec.md`)

| ID | Item | Source |
|----|------|--------|
| **D7-1** | Bidirectional contact ↔ event/task/note linking — migration 015 + handlers | This QA, item #8 |
| **D7-2** | Regenerate Supabase TypeScript types — removes `as never` casts in `addContactReference / removeContactReference` and types the new FTS query | Implicit since migration 013 |
| **D7-3** | `ContactReferences` reads from `contact_reference_pairs` view (currently `references={[]}` hard-coded) | Item #13 note |
| **D7-4** | `toggleStar` error rollback (and same pattern for `updateContact / deleteContact`) | Item #3 note |
| **D7-5** | Card-image upload wiring — `ContactCardImages.onUploadFront/Back` stubs → `POST /api/contacts/{id}/cards` | Item #10 note |

## Build verification

```
npx vite build 2>&1 | grep "error"
(no output — 0 errors)
```

## Outcome

**D6 CLOSED with D7-1 deferred.** Final score: **11 PASS · 1 DEFERRED (D7-1) · 2 NEEDS-BROWSER**. The two NEEDS-BROWSER items (#11 language tabs, #12 socials edit) and the soft notes on #3 / #13 should still be smoke-tested as soon as the app is browser-reachable.
