-- RLS tests for: device_tokens
-- Policy: "Own tokens" FOR ALL USING (user_id = auth.uid())
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

INSERT INTO device_tokens (id, user_id, token, platform) VALUES
  ('de000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fcm-token-abc', 'android');

-- Test 1: anon cannot see device_tokens
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM device_tokens), 0,
  'anon cannot see device_tokens'
);

-- Test 2: user A sees own tokens
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM device_tokens), 1,
  'user A sees own device tokens'
);

-- Test 3: user B cannot see user A tokens
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM device_tokens), 0,
  'user B cannot see user A device tokens'
);

-- Test 4: user A can insert own token
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$INSERT INTO device_tokens (user_id, token, platform) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'apns-token-xyz', 'ios')$$,
  'user A can insert own device token'
);

-- Test 5: user A can delete own token
SELECT lives_ok(
  $$DELETE FROM device_tokens WHERE id = 'de000001-0000-0000-0000-000000000001'$$,
  'user A can delete own device token'
);

SELECT * FROM finish();
ROLLBACK;
