-- RLS tests for: team_members
-- Policies: View (fellow members), Join (accepted invite or owner/admin adds), Leave/Remove (self or owner/admin)
BEGIN;
SELECT plan(7);

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

INSERT INTO team_members (id, team_id, user_id, role) VALUES
  ('aa000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner'),
  ('aa000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'member');

-- Test 1: anon cannot see team_members
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM team_members), 0,
  'anon cannot see team_members'
);

-- Test 2: user A (member) sees fellow members
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM team_members), 2,
  'user A sees all team members'
);

-- Test 3: user C (non-member) cannot see team_members
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', true);
SELECT is(
  (SELECT count(*)::int FROM team_members), 0,
  'user C (non-member) cannot see team members'
);

-- Test 4: user C cannot insert themselves without invitation
SELECT throws_ok(
  $$INSERT INTO team_members (team_id, user_id, role) VALUES ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'member')$$,
  NULL,
  'user C cannot join team without invitation'
);

-- Test 5: user A (owner) can add member via owner/admin path
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$INSERT INTO team_members (team_id, user_id, role) VALUES ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'member')$$,
  'user A (owner) can add member'
);

-- Test 6: user B can leave (delete self)
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT lives_ok(
  $$DELETE FROM team_members WHERE id = 'aa000002-0000-0000-0000-000000000002'$$,
  'user B can leave team (delete self)'
);

-- Test 7: user A (owner) can remove member
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$DELETE FROM team_members WHERE user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  'user A (owner) can remove member'
);

SELECT * FROM finish();
ROLLBACK;
