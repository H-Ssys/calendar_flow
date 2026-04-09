-- RLS tests for: contact_notes (linking table)
-- Policy: "Link contacts-notes" FOR ALL — user must have access to BOTH contact AND note
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

INSERT INTO notes (id, user_id, title) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Note A');

INSERT INTO contact_notes (contact_id, note_id) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001');

-- Test 1: anon cannot see contact_notes
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM contact_notes), 0,
  'anon cannot see contact_notes'
);

-- Test 2: user A sees own link
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM contact_notes), 1,
  'user A sees own contact_notes link'
);

-- Test 3: user B cannot see user A link
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM contact_notes), 0,
  'user B cannot see user A contact_notes link'
);

-- Test 4: user A can delete own link
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$DELETE FROM contact_notes WHERE contact_id = 'd0000001-0000-0000-0000-000000000001'$$,
  'user A can delete own contact_notes link'
);

-- Test 5: user A can insert link for own entities
SELECT lives_ok(
  $$INSERT INTO contact_notes (contact_id, note_id) VALUES ('d0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001')$$,
  'user A can insert contact_notes link for own entities'
);

SELECT * FROM finish();
ROLLBACK;
