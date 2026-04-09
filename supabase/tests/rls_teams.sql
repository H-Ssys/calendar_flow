-- RLS tests for: teams
-- Policies: View (members), Update (owner/admin), Delete (owner only)
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

-- Test 1: anon cannot see teams
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM teams), 0,
  'anon cannot see teams'
);

-- Test 2: user A (owner) sees team
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM teams), 1,
  'user A (owner) sees team'
);

-- Test 3: user B (member) sees team
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM teams), 1,
  'user B (member) sees team'
);

-- Test 4: user C (non-member) cannot see team
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', true);
SELECT is(
  (SELECT count(*)::int FROM teams), 0,
  'user C (non-member) cannot see team'
);

-- Test 5: user A (owner) can update team
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$UPDATE teams SET name = 'Updated Team' WHERE id = '11111111-1111-1111-1111-111111111111'$$,
  'user A (owner) can update team'
);

-- Test 6: user B (member) cannot update team
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM (
    UPDATE teams SET name = 'Hacked' WHERE id = '11111111-1111-1111-1111-111111111111' RETURNING 1
  ) t), 0,
  'user B (member) cannot update team'
);

-- Test 7: user B (member) cannot delete team
SELECT is(
  (SELECT count(*)::int FROM (
    DELETE FROM teams WHERE id = '11111111-1111-1111-1111-111111111111' RETURNING 1
  ) t), 0,
  'user B (member) cannot delete team'
);

-- Test 8: user A (owner) can delete team
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$DELETE FROM teams WHERE id = '11111111-1111-1111-1111-111111111111'$$,
  'user A (owner) can delete team'
);

SELECT * FROM finish();
ROLLBACK;
