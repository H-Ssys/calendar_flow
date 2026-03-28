-- RLS tests for: profiles
-- Policy: "Own profile" FOR ALL USING (id = auth.uid())
BEGIN;
SELECT plan(5);

-- ============================================================
-- Setup: insert test users via auth.users + profiles
-- ============================================================
-- We use service_role (default in test runner) to seed data.

INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'usera@test.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'userb@test.com');

-- handle_new_user trigger should auto-create profiles, but insert explicitly to be safe
INSERT INTO profiles (id, display_name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'User A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'User B')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Test 1: anon cannot SELECT profiles
-- ============================================================
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM profiles), 0,
  'anon cannot see profiles'
);

-- ============================================================
-- Test 2: authenticated user A sees own profile
-- ============================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM profiles), 1,
  'user A sees own profile'
);

-- ============================================================
-- Test 3: user A cannot see user B profile
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM profiles WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0,
  'user A cannot see user B profile'
);

-- ============================================================
-- Test 4: user A can update own profile
-- ============================================================
SELECT lives_ok(
  $$UPDATE profiles SET display_name = 'Updated A' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'user A can update own profile'
);

-- ============================================================
-- Test 5: user A cannot update user B profile
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM (
    UPDATE profiles SET display_name = 'Hacked' WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' RETURNING 1
  ) t), 0,
  'user A cannot update user B profile'
);

SELECT * FROM finish();
ROLLBACK;
