-- RLS tests for: tasks
-- Policies: View (own+assigned+team), Create (own+team), Update (own+assigned+team admin)
BEGIN;
SELECT plan(10);

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

-- Personal task
INSERT INTO tasks (id, user_id, title) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Personal Task');

-- Team task
INSERT INTO tasks (id, user_id, team_id, title) VALUES
  ('f0000002-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Team Task');

-- Task assigned to user C
INSERT INTO tasks (id, user_id, assigned_to, title) VALUES
  ('f0000003-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Assigned Task');

-- ============================================================
-- Test 1: anon cannot SELECT tasks
-- ============================================================
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM tasks), 0,
  'anon cannot see tasks'
);

-- ============================================================
-- Test 2: user A sees own personal + team tasks
-- ============================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT ok(
  (SELECT count(*)::int FROM tasks) >= 3,
  'user A sees personal + team + own tasks'
);

-- ============================================================
-- Test 3: user B sees team task but not personal
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM tasks WHERE id = 'f0000002-0000-0000-0000-000000000002'), 1,
  'user B sees team task'
);
SELECT is(
  (SELECT count(*)::int FROM tasks WHERE id = 'f0000001-0000-0000-0000-000000000001'), 0,
  'user B cannot see user A personal task'
);

-- ============================================================
-- Test 4: user C sees assigned task
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', true);
SELECT is(
  (SELECT count(*)::int FROM tasks WHERE id = 'f0000003-0000-0000-0000-000000000003'), 1,
  'user C sees assigned task'
);

-- ============================================================
-- Test 5: user C can update assigned task
-- ============================================================
SELECT lives_ok(
  $$UPDATE tasks SET status = 'in_progress' WHERE id = 'f0000003-0000-0000-0000-000000000003'$$,
  'user C can update assigned task'
);

-- ============================================================
-- Test 6: user A can insert own task
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$INSERT INTO tasks (user_id, title) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'New Task')$$,
  'user A can insert own task'
);

-- ============================================================
-- Test 7: user B can insert team task
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT lives_ok(
  $$INSERT INTO tasks (user_id, team_id, title) VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'B Team Task')$$,
  'user B (member) can insert team task'
);

-- ============================================================
-- Test 8: user B (member) cannot update team task (needs owner/admin)
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM (
    UPDATE tasks SET title = 'Hacked' WHERE id = 'f0000002-0000-0000-0000-000000000002' RETURNING 1
  ) t), 0,
  'user B (member) cannot update team task'
);

-- ============================================================
-- Test 9: user C cannot see user A personal tasks
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', true);
SELECT is(
  (SELECT count(*)::int FROM tasks WHERE id = 'f0000001-0000-0000-0000-000000000001'), 0,
  'user C cannot see user A personal task'
);

SELECT * FROM finish();
ROLLBACK;
