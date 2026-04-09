-- RLS tests for: recurring_event_occurrences
-- Policy: "View occurrences" FOR SELECT — follows parent event RLS (own + team)
BEGIN;
SELECT plan(4);

-- Setup
INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'usera@test.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'userb@test.com');

INSERT INTO profiles (id, display_name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'User A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'User B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, user_id, title, start_time, end_time, recurrence_rule) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Weekly Standup', NOW(), NOW() + INTERVAL '30 min', 'FREQ=WEEKLY');

INSERT INTO recurring_event_occurrences (id, event_id, occurrence_date, start_time, end_time) VALUES
  ('ro000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001', '2026-03-28', NOW(), NOW() + INTERVAL '30 min');

-- Test 1: anon cannot see occurrences
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM recurring_event_occurrences), 0,
  'anon cannot see recurring_event_occurrences'
);

-- Test 2: user A (event owner) sees occurrences
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM recurring_event_occurrences), 1,
  'user A (event owner) sees occurrences'
);

-- Test 3: user B cannot see occurrences
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM recurring_event_occurrences), 0,
  'user B cannot see user A occurrences'
);

-- Test 4: user A sees occurrence after team event setup
-- (just verify policy is SELECT only — no INSERT/UPDATE policy tested since only SELECT is defined)
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT ok(
  (SELECT count(*)::int FROM recurring_event_occurrences WHERE event_id = 'e0000001-0000-0000-0000-000000000001') = 1,
  'user A sees specific occurrence by event_id'
);

SELECT * FROM finish();
ROLLBACK;
