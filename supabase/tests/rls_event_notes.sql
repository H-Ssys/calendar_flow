-- RLS tests for: event_notes (linking table)
-- Policy: "Link events-notes" FOR ALL — user must have access to BOTH event AND note
BEGIN;
SELECT plan(5);

-- Setup
INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'usera@test.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'userb@test.com');

INSERT INTO profiles (id, display_name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'User A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'User B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, user_id, title, start_time, end_time) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Event A', NOW(), NOW() + INTERVAL '1 hour');

INSERT INTO notes (id, user_id, title) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Note A');

INSERT INTO event_notes (event_id, note_id) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001');

-- Test 1: anon cannot see event_notes
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM event_notes), 0,
  'anon cannot see event_notes'
);

-- Test 2: user A sees own link
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM event_notes), 1,
  'user A sees own event_notes link'
);

-- Test 3: user B cannot see user A link
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM event_notes), 0,
  'user B cannot see user A event_notes link'
);

-- Test 4: user A can delete own link
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$DELETE FROM event_notes WHERE event_id = 'e0000001-0000-0000-0000-000000000001'$$,
  'user A can delete own event_notes link'
);

-- Test 5: user A can insert link for own entities
SELECT lives_ok(
  $$INSERT INTO event_notes (event_id, note_id) VALUES ('e0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001')$$,
  'user A can insert event_notes link for own entities'
);

SELECT * FROM finish();
ROLLBACK;
