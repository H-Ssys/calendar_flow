-- RLS tests for: shared_calendars
-- Policies: View (team members), Manage (owner/admin)
BEGIN;
SELECT plan(6);

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

INSERT INTO shared_calendars (id, team_id, name, created_by) VALUES
  ('ac000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Shared Cal', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- Test 1: anon cannot see shared_calendars
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM shared_calendars), 0,
  'anon cannot see shared_calendars'
);

-- Test 2: user A (owner) sees shared calendar
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM shared_calendars), 1,
  'user A (owner) sees shared calendar'
);

-- Test 3: user B (member) sees shared calendar
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM shared_calendars), 1,
  'user B (member) sees shared calendar'
);

-- Test 4: user C (non-member) cannot see shared calendar
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', true);
SELECT is(
  (SELECT count(*)::int FROM shared_calendars), 0,
  'user C (non-member) cannot see shared calendar'
);

-- Test 5: user A (owner) can manage (update) shared calendar
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$UPDATE shared_calendars SET name = 'Updated Cal' WHERE id = 'ac000001-0000-0000-0000-000000000001'$$,
  'user A (owner) can update shared calendar'
);

-- Test 6: user B (member) cannot manage shared calendar
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM (
    UPDATE shared_calendars SET name = 'Hacked' WHERE id = 'ac000001-0000-0000-0000-000000000001' RETURNING 1
  ) t), 0,
  'user B (member) cannot update shared calendar'
);

SELECT * FROM finish();
ROLLBACK;
