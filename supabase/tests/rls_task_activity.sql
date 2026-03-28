-- RLS tests for: task_activity
-- Policies: View (task owner/assigned/team), Create (own user_id)
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

INSERT INTO tasks (id, user_id, title) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Task');

INSERT INTO task_activity (id, task_id, user_id, action) VALUES
  ('fa000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'created');

-- Test 1: anon cannot see task_activity
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM task_activity), 0,
  'anon cannot see task_activity'
);

-- Test 2: user A (task owner) sees task activity
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM task_activity), 1,
  'user A (task owner) sees task activity'
);

-- Test 3: user B cannot see task activity for user A task
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM task_activity), 0,
  'user B cannot see user A task activity'
);

-- Test 4: user A can insert task activity
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$INSERT INTO task_activity (task_id, user_id, action) VALUES ('f0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'status_changed')$$,
  'user A can insert task activity'
);

-- Test 5: user B cannot insert activity as user A
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT throws_ok(
  $$INSERT INTO task_activity (task_id, user_id, action) VALUES ('f0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'hacked')$$,
  NULL,
  'user B cannot insert task activity as user A'
);

-- Test 6: user C cannot see task activity
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', true);
SELECT is(
  (SELECT count(*)::int FROM task_activity), 0,
  'user C cannot see task activity'
);

SELECT * FROM finish();
ROLLBACK;
