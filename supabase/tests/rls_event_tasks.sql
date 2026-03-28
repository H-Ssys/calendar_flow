-- RLS tests for: event_tasks (linking table)
-- Policy: "Link events-tasks" FOR ALL — user must have access to BOTH event AND task
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

INSERT INTO tasks (id, user_id, title) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Task A');

INSERT INTO event_tasks (event_id, task_id) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001');

-- Test 1: anon cannot see event_tasks
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM event_tasks), 0,
  'anon cannot see event_tasks'
);

-- Test 2: user A sees own link
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM event_tasks), 1,
  'user A sees own event_tasks link'
);

-- Test 3: user B cannot see user A link
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM event_tasks), 0,
  'user B cannot see user A event_tasks link'
);

-- Test 4: user A can delete own link
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$DELETE FROM event_tasks WHERE event_id = 'e0000001-0000-0000-0000-000000000001'$$,
  'user A can delete own event_tasks link'
);

-- Test 5: user A can insert link for own entities
SELECT lives_ok(
  $$INSERT INTO event_tasks (event_id, task_id) VALUES ('e0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001')$$,
  'user A can insert event_tasks link for own entities'
);

SELECT * FROM finish();
ROLLBACK;
