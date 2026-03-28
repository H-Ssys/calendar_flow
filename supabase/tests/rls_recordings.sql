-- RLS tests for: recordings
-- Policy: "Own recordings" FOR ALL USING (user_id = auth.uid())
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

INSERT INTO recordings (id, user_id, file_url) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://storage.test/rec1.mp3');

-- Test 1: anon cannot see recordings
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM recordings), 0,
  'anon cannot see recordings'
);

-- Test 2: user A sees own recording
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM recordings), 1,
  'user A sees own recording'
);

-- Test 3: user B cannot see user A recording
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM recordings), 0,
  'user B cannot see user A recordings'
);

-- Test 4: user A can insert own recording
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$INSERT INTO recordings (user_id, file_url) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://storage.test/rec2.mp3')$$,
  'user A can insert own recording'
);

-- Test 5: user A can delete own recording
SELECT lives_ok(
  $$DELETE FROM recordings WHERE id = 'c0000001-0000-0000-0000-000000000001'$$,
  'user A can delete own recording'
);

SELECT * FROM finish();
ROLLBACK;
