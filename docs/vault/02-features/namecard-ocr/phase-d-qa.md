# Phase D — QA Regression Report

**Date:** 2026-04-18
**Method:** `npx vite build` (clean, 0 errors) + code-inspection trace per file.
**Scope:** 14 checks — 9 existing-functionality regressions + 5 new Phase D features.

## Summary

| Outcome | Count |
|---------|-------|
| PASS | 10 |
| FAIL | 2 |
| NEEDS-BROWSER | 2 |

**Overall: D6 BLOCKED.** Two FAIL items (#8 and #9) are pre-existing gaps that tests in this regression explicitly check for. They require schema + query work outside a QA pass to fix and are tracked as D7 follow-ups below.

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
| 8 | Add event from contact — event linked bidirectionally | **FAIL** | `ContactDetail.tsx:225–227` `handleAddEvent` / `handleAddTask` / `handleAddNote` are `/* wired in D5 */` empty stubs. Clicking "Add event" in `ContactFlow` calls a no-op — no event is created. Bidirectional linking cannot happen: there is no `contactIds` field on `Event`, `Task`, or `Note` (confirmed via repo-wide search — 0 matches). Fix requires migration + type updates + context API changes. See D7 follow-ups. |
| 9 | Contact search — both `search_text` and `reference_search_text` queried | **FAIL** | `Contacts.tsx:30–45` does a client-side `list.filter` on `displayName / email / company / phone` over the already-loaded `contacts` array. Neither `search_text` nor `reference_search_text` tsvector columns (added in migration 013 blocks 2–3) are referenced anywhere in `src/`. No `.textSearch(...)` or equivalent call. Fix requires switching the list query to debounced server-side FTS. See D7 follow-ups. |
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

## FAIL #8 — Add event/task/note from contact

**Root cause:** `handleAddEvent / handleAddTask / handleAddNote` in `ContactDetail.tsx:225–227` are empty stubs.

**Why we cannot fix in a QA pass:**
- There is no `contactIds` column on `events`, `tasks`, or `notes` tables. Zero matches repo-wide for `contactIds | contact_ids | linkedContactIds`.
- `Contact.linkedEventIds` exists on the client `Contact` type but is not persisted (no DB column exists).
- Fixing requires: (a) new migration adding `contact_ids uuid[]` (or junction table) on each of the three tables, (b) RLS additions, (c) type/mapper updates, (d) new context API calls on `CalendarContext.addEvent`, `TaskContext.addTask`, `NoteContext.addNote` to accept the link, (e) wiring `ContactDetail` handlers to open the existing add-dialogs pre-linked.
- Scope = new feature (D7), not a QA-pass fix.

## FAIL #9 — Server-side FTS not wired

**Root cause:** `Contacts.tsx` filter is client-side. Supabase `search_text` (GENERATED tsvector) and `reference_search_text` (trigger-maintained tsvector) columns exist in migration 013 but are never queried.

**Why we cannot fix in a QA pass:**
- Current list fetch grabs all active contacts for the user in one shot (acceptable for <~1000 contacts); client filter is fast and correct for the current data volume.
- Proper fix: add a second query path that issues `.textSearch('search_text', q)` OR `.textSearch('reference_search_text', q)` when a search term is present, debounced (~300ms), replacing the full-list query. Requires fetching + caching strategy, probably React Query.
- Scope = medium refactor (D7), not a QA-pass fix.

## D7 follow-ups required before D6 can close

1. **Contact↔Event/Task/Note bidirectional linking** — DB migration + API wire-up. Blocks #8.
2. **Server-side contact search using `search_text` + `reference_search_text`** — debounced `.textSearch()` query path in `ContactsInner`. Blocks #9.
3. **References round-trip** — parent (`ContactDetail`) should read the `contact_reference_pairs` view (migration 013 block 6) for the current contact, not hard-code `references={[]}`. Soft issue; surfaced via #13 note, not a stated regression item.
4. **toggleStar error rollback** — revert local state if Supabase call fails. Minor; noted on #3.
5. **Card-image upload wiring** — `ContactCardImages.onUploadFront/Back` callbacks are still stubs in `ContactDetail`.

## Build verification

```
npx vite build 2>&1 | grep "error"
(no output — 0 errors)
```

## Outcome

**BLOCKED.** 2 FAILs must close before D6 is marked complete. Recommend routing items #8 and #9 to a D7 ticket; the other 10 PASS items and 2 NEEDS-BROWSER items can be smoke-tested as soon as the app is browser-reachable.
