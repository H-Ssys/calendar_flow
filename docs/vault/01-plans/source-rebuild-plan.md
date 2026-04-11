# Source Rebuild Plan — From Dist to Source v3

## Strategy
Use the minified JS as a spec + Antigravity for visual reference to rebuild missing components on top of the early source (Smart_calendar).

## Phase Order (by dependency)

### R1: Foundation (no new features, fix what exists)
- [ ] Update AuthContext to match dist (signIn/signUp/signOut pattern)
- [ ] Update Supabase client config to match dist
- [ ] Add TopActionBar (cmdk search + notifications + view switcher)
- [ ] Add Sidebar team switcher slot (empty, wired in R3)
- Verify: Login works, calendar/tasks/notes load with Supabase data

### R2: Contacts (standalone, no deps on Teams)
- [ ] Create ContactProvider + contactSupabaseService
- [ ] Create SmartContacts page (list, detail, edit, favorites)
- [ ] Add contact type definitions
- [ ] Wire route /contacts
- Verify: CRUD contacts, favorites, linked entities

### R3: Teams (depends on R1 auth)
- [ ] Create TeamProvider + team Supabase service
- [ ] Create Teams page (list, create, members)
- [ ] Create JoinPage (/join/:token)
- [ ] Wire team switcher in sidebar
- [ ] Add teamActivityService
- Verify: Create team, invite via token, switch workspaces

### R4: Polish and Parity
- [ ] Command palette search across all data types
- [ ] Notification bell (upcoming events + overdue tasks)
- [ ] Urgent task floating notifications
- [ ] Keyboard shortcuts
- [ ] i18n keys parity check
- Verify: Feature parity with running dist

## Antigravity Workflow
1. Open app in Antigravity browser
2. Screenshot each page/component
3. Feed screenshots to Claude Code as visual spec
4. Claude Code rebuilds component matching screenshot + dist logic
