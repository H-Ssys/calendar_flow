-- RLS tests for: ai_cache
-- Policy: "Own ai_cache" FOR ALL USING (user_id = auth.uid())
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

INSERT INTO ai_cache (id, user_id, query_hash, response_json) VALUES
  ('ca000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'hash123', '{"result":"cached"}');

-- Test 1: anon cannot see ai_cache
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM ai_cache), 0,
  'anon cannot see ai_cache'
);

-- Test 2: user A sees own cache
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM ai_cache), 1,
  'user A sees own ai_cache'
);

-- Test 3: user B cannot see user A cache
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM ai_cache), 0,
  'user B cannot see user A ai_cache'
);

-- Test 4: user A can insert own cache entry
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$INSERT INTO ai_cache (user_id, query_hash, response_json) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'hash456', '{"result":"new"}')$$,
  'user A can insert own ai_cache entry'
);

-- Test 5: user A can delete own cache entry
SELECT lives_ok(
  $$DELETE FROM ai_cache WHERE id = 'ca000001-0000-0000-0000-000000000001'$$,
  'user A can delete own ai_cache entry'
);

SELECT * FROM finish();
ROLLBACK;
