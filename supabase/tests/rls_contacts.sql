-- RLS tests for: contacts
-- Policies: View (own + team), Create (own), Update (own + team member), Delete (own + team owner/admin)
BEGIN;
SELECT plan(9);

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

-- Personal contact for user A
INSERT INTO contacts (id, user_id, name) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Personal Contact');

-- Team contact
INSERT INTO contacts (id, user_id, team_id, name) VALUES
  ('d0000002-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Team Contact');

-- ============================================================
-- Test 1: anon cannot SELECT contacts
-- ============================================================
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM contacts), 0,
  'anon cannot see contacts'
);

-- ============================================================
-- Test 2: user A sees own personal contact
-- ============================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT ok(
  (SELECT count(*)::int FROM contacts) >= 2,
  'user A sees own + team contacts'
);

-- ============================================================
-- Test 3: user B (team member) sees team contact but not personal
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM contacts WHERE id = 'd0000002-0000-0000-0000-000000000002'), 1,
  'user B (team member) sees team contact'
);
SELECT is(
  (SELECT count(*)::int FROM contacts WHERE id = 'd0000001-0000-0000-0000-000000000001'), 0,
  'user B cannot see user A personal contact'
);

-- ============================================================
-- Test 4: user C (not in team) cannot see any contacts
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', true);
SELECT is(
  (SELECT count(*)::int FROM contacts), 0,
  'user C (no team) cannot see any contacts'
);

-- ============================================================
-- Test 5: user A can INSERT own contact
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$INSERT INTO contacts (user_id, name) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'New Contact')$$,
  'user A can insert own contact'
);

-- ============================================================
-- Test 6: user B cannot INSERT as user A
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT throws_ok(
  $$INSERT INTO contacts (user_id, name) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Spoofed')$$,
  NULL,
  'user B cannot insert contact as user A'
);

-- ============================================================
-- Test 7: user A can delete own contact
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$DELETE FROM contacts WHERE id = 'd0000001-0000-0000-0000-000000000001'$$,
  'user A can delete own contact'
);

-- ============================================================
-- Test 8: user B (member) cannot delete team contact (needs owner/admin)
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM (
    DELETE FROM contacts WHERE id = 'd0000002-0000-0000-0000-000000000002' RETURNING 1
  ) t), 0,
  'user B (member) cannot delete team contact'
);

SELECT * FROM finish();
ROLLBACK;
