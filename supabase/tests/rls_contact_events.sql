-- RLS tests for: contact_events (linking table)
-- Policy: "Link contacts-events" FOR ALL — user must have access to BOTH contact AND event
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

INSERT INTO contacts (id, user_id, name) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Contact A');

INSERT INTO events (id, user_id, title, start_time, end_time) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Event A', NOW(), NOW() + INTERVAL '1 hour');

INSERT INTO contact_events (contact_id, event_id) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001');

-- Test 1: anon cannot see contact_events
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM contact_events), 0,
  'anon cannot see contact_events'
);

-- Test 2: user A sees own link
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM contact_events), 1,
  'user A sees own contact_events link'
);

-- Test 3: user B cannot see user A link
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM contact_events), 0,
  'user B cannot see user A contact_events link'
);

-- Test 4: user A can insert link for own entities
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$DELETE FROM contact_events WHERE contact_id = 'd0000001-0000-0000-0000-000000000001'$$,
  'user A can delete own contact_events link'
);

-- Test 5: user A can re-insert link
SELECT lives_ok(
  $$INSERT INTO contact_events (contact_id, event_id) VALUES ('d0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001')$$,
  'user A can insert contact_events link for own entities'
);

SELECT * FROM finish();
ROLLBACK;
