-- RLS tests for: ai_correction_memory
-- Policy: "Own ai_corrections" FOR ALL USING (user_id = auth.uid())
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

INSERT INTO contacts (id, user_id, name) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Contact A');

INSERT INTO ai_correction_memory (id, user_id, contact_id, mistaken_text, incorrect_field, correct_field) VALUES
  ('cm000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd0000001-0000-0000-0000-000000000001', 'John Corp', 'name', 'company');

-- Test 1: anon cannot see corrections
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM ai_correction_memory), 0,
  'anon cannot see ai_correction_memory'
);

-- Test 2: user A sees own corrections
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM ai_correction_memory), 1,
  'user A sees own ai_correction_memory'
);

-- Test 3: user B cannot see user A corrections
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM ai_correction_memory), 0,
  'user B cannot see user A ai_correction_memory'
);

-- Test 4: user A can insert own correction
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$INSERT INTO ai_correction_memory (user_id, contact_id, mistaken_text, incorrect_field, correct_field) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd0000001-0000-0000-0000-000000000001', 'Acme Inc', 'company', 'name')$$,
  'user A can insert own ai correction'
);

-- Test 5: user A can delete own correction
SELECT lives_ok(
  $$DELETE FROM ai_correction_memory WHERE id = 'cm000001-0000-0000-0000-000000000001'$$,
  'user A can delete own ai correction'
);

SELECT * FROM finish();
ROLLBACK;
