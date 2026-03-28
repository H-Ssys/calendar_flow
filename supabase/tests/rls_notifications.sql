-- RLS tests for: notifications
-- Policy: "Own notifications" FOR ALL USING (user_id = auth.uid())
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

INSERT INTO notifications (id, user_id, type, title) VALUES
  ('dd000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'reminder', 'Your meeting starts soon');

-- Test 1: anon cannot see notifications
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM notifications), 0,
  'anon cannot see notifications'
);

-- Test 2: user A sees own notifications
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM notifications), 1,
  'user A sees own notifications'
);

-- Test 3: user B cannot see user A notifications
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM notifications), 0,
  'user B cannot see user A notifications'
);

-- Test 4: user A can insert own notification
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$INSERT INTO notifications (user_id, type, title) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'task_due', 'Task is due')$$,
  'user A can insert own notification'
);

-- Test 5: user A can delete own notification
SELECT lives_ok(
  $$DELETE FROM notifications WHERE id = 'dd000001-0000-0000-0000-000000000001'$$,
  'user A can delete own notification'
);

SELECT * FROM finish();
ROLLBACK;
