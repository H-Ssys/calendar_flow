-- RLS tests for: events
-- Policies: View (own+team+participant), Create (own+team member), Update (own+team admin), Delete (own+team admin)
BEGIN;
SELECT plan(11);

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

-- Personal event for user A
INSERT INTO events (id, user_id, title, start_time, end_time) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Personal Event', NOW(), NOW() + INTERVAL '1 hour');

-- Team event
INSERT INTO events (id, user_id, team_id, title, start_time, end_time) VALUES
  ('e0000002-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Team Event', NOW(), NOW() + INTERVAL '1 hour');

-- Event where user C is participant
INSERT INTO events (id, user_id, title, start_time, end_time) VALUES
  ('e0000003-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Invite Event', NOW(), NOW() + INTERVAL '1 hour');
INSERT INTO event_participants (event_id, user_id, rsvp_status) VALUES
  ('e0000003-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'accepted');

-- ============================================================
-- Test 1: anon cannot SELECT events
-- ============================================================
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM events), 0,
  'anon cannot see events'
);

-- ============================================================
-- Test 2: user A sees own personal event
-- ============================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT ok(
  (SELECT count(*)::int FROM events) >= 3,
  'user A sees personal + team + own invite events'
);

-- ============================================================
-- Test 3: user B (team member) sees team event but not personal
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM events WHERE id = 'e0000002-0000-0000-0000-000000000002'), 1,
  'user B sees team event'
);
SELECT is(
  (SELECT count(*)::int FROM events WHERE id = 'e0000001-0000-0000-0000-000000000001'), 0,
  'user B cannot see user A personal event'
);

-- ============================================================
-- Test 4: user C sees event where they are participant
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', true);
SELECT is(
  (SELECT count(*)::int FROM events WHERE id = 'e0000003-0000-0000-0000-000000000003'), 1,
  'user C sees event as participant'
);

-- ============================================================
-- Test 5: user A can insert own personal event
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$INSERT INTO events (user_id, title, start_time, end_time) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'New Event', NOW(), NOW() + INTERVAL '1 hour')$$,
  'user A can insert own event'
);

-- ============================================================
-- Test 6: user B can insert team event
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT lives_ok(
  $$INSERT INTO events (user_id, team_id, title, start_time, end_time) VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'B Team Event', NOW(), NOW() + INTERVAL '1 hour')$$,
  'user B (member) can insert team event'
);

-- ============================================================
-- Test 7: user A (owner) can update team event
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$UPDATE events SET title = 'Updated Team Event' WHERE id = 'e0000002-0000-0000-0000-000000000002'$$,
  'user A (owner) can update team event'
);

-- ============================================================
-- Test 8: user B (member) cannot update team event (needs owner/admin)
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM (
    UPDATE events SET title = 'Hacked' WHERE id = 'e0000002-0000-0000-0000-000000000002' RETURNING 1
  ) t), 0,
  'user B (member) cannot update team event'
);

-- ============================================================
-- Test 9: user A can delete own event
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$DELETE FROM events WHERE id = 'e0000001-0000-0000-0000-000000000001'$$,
  'user A can delete own event'
);

-- ============================================================
-- Test 10: user C cannot see user A personal events
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', true);
SELECT is(
  (SELECT count(*)::int FROM events WHERE id = 'e0000001-0000-0000-0000-000000000001'), 0,
  'user C cannot see user A personal event'
);

SELECT * FROM finish();
ROLLBACK;
