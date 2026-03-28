-- RLS tests for: assets
-- Policy: "Own assets" FOR ALL USING (user_id = auth.uid())
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

INSERT INTO assets (id, user_id, module, file_url, file_name) VALUES
  ('b0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'general', 'https://storage.test/file.pdf', 'file.pdf');

-- Test 1: anon cannot see assets
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM assets), 0,
  'anon cannot see assets'
);

-- Test 2: user A sees own assets
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM assets), 1,
  'user A sees own assets'
);

-- Test 3: user B cannot see user A assets
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM assets), 0,
  'user B cannot see user A assets'
);

-- Test 4: user A can insert own asset
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$INSERT INTO assets (user_id, module, file_url, file_name) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'contacts', 'https://storage.test/img.jpg', 'img.jpg')$$,
  'user A can insert own asset'
);

-- Test 5: user A can delete own asset
SELECT lives_ok(
  $$DELETE FROM assets WHERE id = 'b0000001-0000-0000-0000-000000000001'$$,
  'user A can delete own asset'
);

SELECT * FROM finish();
ROLLBACK;
