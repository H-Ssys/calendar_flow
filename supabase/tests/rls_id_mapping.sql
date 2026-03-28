-- RLS tests for: id_mapping
-- Policy: "Own migration records" FOR ALL USING (v2_id IN (SELECT id FROM events/tasks/notes/contacts WHERE user_id = auth.uid()))
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

INSERT INTO id_mapping (id, entity_type, v1_id, v2_id) VALUES
  ('im000001-0000-0000-0000-000000000001', 'contact', 'old-contact-1', 'd0000001-0000-0000-0000-000000000001');

-- Test 1: anon cannot see id_mapping
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM id_mapping), 0,
  'anon cannot see id_mapping'
);

-- Test 2: user A sees own mapping records
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM id_mapping), 1,
  'user A sees own id_mapping records'
);

-- Test 3: user B cannot see user A mapping records
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM id_mapping), 0,
  'user B cannot see user A id_mapping records'
);

-- Test 4: user A can insert mapping for own entity
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$INSERT INTO id_mapping (entity_type, v1_id, v2_id) VALUES ('contact', 'old-contact-2', 'd0000001-0000-0000-0000-000000000001')$$,
  'user A can insert id_mapping for own entity'
);

-- Test 5: user A can delete own mapping
SELECT lives_ok(
  $$DELETE FROM id_mapping WHERE id = 'im000001-0000-0000-0000-000000000001'$$,
  'user A can delete own id_mapping'
);

SELECT * FROM finish();
ROLLBACK;
