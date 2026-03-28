-- RLS tests for: team_invitations
-- Policies: Create (owner/admin), View (team members + invitee), Respond (invitee only)
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

INSERT INTO team_members (team_id, user_id, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner'),
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'member');

INSERT INTO team_invitations (id, team_id, invited_by, invitee_user_id, invitee_email, status) VALUES
  ('ab000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'userc@test.com', 'pending');

-- Test 1: anon cannot see invitations
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM team_invitations), 0,
  'anon cannot see team_invitations'
);

-- Test 2: user A (team member) sees invitation
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM team_invitations), 1,
  'user A (owner) sees invitation'
);

-- Test 3: user C (invitee) sees invitation addressed to them
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', true);
SELECT is(
  (SELECT count(*)::int FROM team_invitations), 1,
  'user C (invitee) sees invitation'
);

-- Test 4: user A (owner) can create invitation
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$INSERT INTO team_invitations (team_id, invited_by, invitee_email, status) VALUES ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'newuser@test.com', 'pending')$$,
  'user A (owner) can create invitation'
);

-- Test 5: user B (member) cannot create invitation
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT throws_ok(
  $$INSERT INTO team_invitations (team_id, invited_by, invitee_email, status) VALUES ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'another@test.com', 'pending')$$,
  NULL,
  'user B (member) cannot create invitation'
);

-- Test 6: user C (invitee) can respond to invitation
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', true);
SELECT lives_ok(
  $$UPDATE team_invitations SET status = 'accepted', responded_at = NOW() WHERE id = 'ab000001-0000-0000-0000-000000000001'$$,
  'user C (invitee) can respond to invitation'
);

-- Test 7: user B cannot respond to invitation for user C
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM (
    UPDATE team_invitations SET status = 'declined' WHERE id = 'ab000001-0000-0000-0000-000000000001' RETURNING 1
  ) t), 0,
  'user B cannot respond to user C invitation'
);

SELECT * FROM finish();
ROLLBACK;
