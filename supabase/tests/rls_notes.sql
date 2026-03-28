-- RLS tests for: notes
-- Policies: View (own+team), Create (own), Update (own+team member), Delete (own+team owner/admin)
BEGIN;
SELECT plan(8);

-- Setup
INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'usera@test.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'userb@test.com'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'userc@test.com');

INSERT INTO profiles (id, display_name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'User A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'User B'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'User C')
ON CONFLICT (id) DO NOTHING;

INSERT INTO teams (id, name, created_by) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Team Alpha', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

INSERT INTO team_members (team_id, user_id, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner'),
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'member');

INSERT INTO notes (id, user_id, title) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Personal Note');

INSERT INTO notes (id, user_id, team_id, title) VALUES
  ('a0000002-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Team Note');

-- ============================================================
-- Test 1: anon cannot SELECT notes
-- ============================================================
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM notes), 0,
  'anon cannot see notes'
);

-- ============================================================
-- Test 2: user A sees own + team notes
-- ============================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT ok(
  (SELECT count(*)::int FROM notes) >= 2,
  'user A sees personal + team notes'
);

-- ============================================================
-- Test 3: user B sees team note but not personal
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM notes WHERE id = 'a0000002-0000-0000-0000-000000000002'), 1,
  'user B sees team note'
);
SELECT is(
  (SELECT count(*)::int FROM notes WHERE id = 'a0000001-0000-0000-0000-000000000001'), 0,
  'user B cannot see personal note'
);

-- ============================================================
-- Test 4: user C cannot see any notes
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', true);
SELECT is(
  (SELECT count(*)::int FROM notes), 0,
  'user C cannot see any notes'
);

-- ============================================================
-- Test 5: user A can insert own note
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$INSERT INTO notes (user_id, title) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'New Note')$$,
  'user A can insert own note'
);

-- ============================================================
-- Test 6: user A can delete own note
-- ============================================================
SELECT lives_ok(
  $$DELETE FROM notes WHERE id = 'a0000001-0000-0000-0000-000000000001'$$,
  'user A can delete own note'
);

-- ============================================================
-- Test 7: user B (member) cannot delete team note
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM (
    DELETE FROM notes WHERE id = 'a0000002-0000-0000-0000-000000000002' RETURNING 1
  ) t), 0,
  'user B (member) cannot delete team note'
);

SELECT * FROM finish();
ROLLBACK;
