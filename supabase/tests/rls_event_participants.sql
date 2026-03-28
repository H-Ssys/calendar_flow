-- RLS tests for: event_participants
-- Policies: View (event owner + team), Manage RSVP (own user_id)
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

INSERT INTO events (id, user_id, title, start_time, end_time) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Meeting', NOW(), NOW() + INTERVAL '1 hour');

INSERT INTO event_participants (id, event_id, user_id, rsvp_status) VALUES
  ('ep000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'pending');

-- Test 1: anon cannot see event_participants
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM event_participants), 0,
  'anon cannot see event_participants'
);

-- Test 2: user A (event owner) sees participants
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM event_participants), 1,
  'user A (event owner) sees participants'
);

-- Test 3: user C (not involved) cannot see participants
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', true);
SELECT is(
  (SELECT count(*)::int FROM event_participants), 0,
  'user C cannot see participants'
);

-- Test 4: user B can manage own RSVP (update)
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT lives_ok(
  $$UPDATE event_participants SET rsvp_status = 'accepted' WHERE id = 'ep000001-0000-0000-0000-000000000001'$$,
  'user B can update own RSVP'
);

-- Test 5: user B can insert own participant record
SELECT lives_ok(
  $$INSERT INTO event_participants (event_id, user_id, rsvp_status) VALUES ('e0000001-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'accepted') ON CONFLICT DO NOTHING$$,
  'user B can insert own participant record'
);

-- Test 6: user C cannot manage user B RSVP
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', true);
SELECT is(
  (SELECT count(*)::int FROM (
    UPDATE event_participants SET rsvp_status = 'declined' WHERE id = 'ep000001-0000-0000-0000-000000000001' RETURNING 1
  ) t), 0,
  'user C cannot update user B RSVP'
);

SELECT * FROM finish();
ROLLBACK;
