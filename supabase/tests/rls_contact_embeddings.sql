-- RLS tests for: contact_embeddings
-- Policy: "Own embeddings" FOR ALL USING (contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid()))
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

INSERT INTO contact_embeddings (id, contact_id, metadata) VALUES
  ('ce000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', '{"source":"ocr"}');

-- Test 1: anon cannot see embeddings
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM contact_embeddings), 0,
  'anon cannot see contact_embeddings'
);

-- Test 2: user A sees own embeddings
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM contact_embeddings), 1,
  'user A sees own contact embeddings'
);

-- Test 3: user B cannot see user A embeddings
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM contact_embeddings), 0,
  'user B cannot see user A contact embeddings'
);

-- Test 4: user A can insert embedding for own contact
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$INSERT INTO contact_embeddings (contact_id, metadata) VALUES ('d0000001-0000-0000-0000-000000000001', '{"source":"manual"}')$$,
  'user A can insert embedding for own contact'
);

-- Test 5: user A can delete own embedding
SELECT lives_ok(
  $$DELETE FROM contact_embeddings WHERE id = 'ce000001-0000-0000-0000-000000000001'$$,
  'user A can delete own contact embedding'
);

SELECT * FROM finish();
ROLLBACK;
