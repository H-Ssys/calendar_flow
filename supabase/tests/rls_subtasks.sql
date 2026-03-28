-- RLS tests for: subtasks
-- Policy: "Access subtasks" FOR ALL — accessible if user owns/is assigned/team parent task
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

INSERT INTO tasks (id, user_id, assigned_to, title) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Parent Task');

INSERT INTO subtasks (id, parent_task_id, title) VALUES
  ('fb000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'Subtask 1');

-- Test 1: anon cannot see subtasks
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM subtasks), 0,
  'anon cannot see subtasks'
);

-- Test 2: user A (task owner) sees subtasks
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM subtasks), 1,
  'user A (task owner) sees subtasks'
);

-- Test 3: user B (assigned) sees subtasks
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM subtasks), 1,
  'user B (assigned to parent) sees subtasks'
);

-- Test 4: user C cannot see subtasks
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', true);
SELECT is(
  (SELECT count(*)::int FROM subtasks), 0,
  'user C cannot see subtasks'
);

-- Test 5: user A can insert subtask
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$INSERT INTO subtasks (parent_task_id, title) VALUES ('f0000001-0000-0000-0000-000000000001', 'Subtask 2')$$,
  'user A can insert subtask'
);

-- Test 6: user A can update subtask
SELECT lives_ok(
  $$UPDATE subtasks SET is_completed = true WHERE id = 'fb000001-0000-0000-0000-000000000001'$$,
  'user A can update subtask'
);

SELECT * FROM finish();
ROLLBACK;
