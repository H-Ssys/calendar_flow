-- RLS tests for: focus_sessions
-- Policy: "Own focus sessions" FOR ALL USING (user_id = auth.uid())
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

INSERT INTO focus_sessions (id, user_id, started_at, duration_minutes, session_type) VALUES
  ('ff000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW(), 25, 'focus');

-- Test 1: anon cannot see focus_sessions
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM focus_sessions), 0,
  'anon cannot see focus_sessions'
);

-- Test 2: user A sees own sessions
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM focus_sessions), 1,
  'user A sees own focus sessions'
);

-- Test 3: user B cannot see user A sessions
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM focus_sessions), 0,
  'user B cannot see user A focus sessions'
);

-- Test 4: user A can insert own session
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$INSERT INTO focus_sessions (user_id, started_at, session_type) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW(), 'short_break')$$,
  'user A can insert own focus session'
);

-- Test 5: user A can delete own session
SELECT lives_ok(
  $$DELETE FROM focus_sessions WHERE id = 'ff000001-0000-0000-0000-000000000001'$$,
  'user A can delete own focus session'
);

SELECT * FROM finish();
ROLLBACK;
