-- RLS tests for: journal_entries
-- Policy: "Own journal" FOR ALL USING (user_id = auth.uid())
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

INSERT INTO journal_entries (id, user_id, date, daily_goal) VALUES
  ('ee000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-03-28', 'Ship RLS tests');

-- Test 1: anon cannot see journal_entries
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM journal_entries), 0,
  'anon cannot see journal_entries'
);

-- Test 2: user A sees own journal entries
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM journal_entries), 1,
  'user A sees own journal entries'
);

-- Test 3: user B cannot see user A journal entries
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT is(
  (SELECT count(*)::int FROM journal_entries), 0,
  'user B cannot see user A journal entries'
);

-- Test 4: user A can insert own journal entry
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$INSERT INTO journal_entries (user_id, date, daily_goal) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-03-29', 'Review PR')$$,
  'user A can insert own journal entry'
);

-- Test 5: user A can update own journal entry
SELECT lives_ok(
  $$UPDATE journal_entries SET daily_result = 'Done!' WHERE id = 'ee000001-0000-0000-0000-000000000001'$$,
  'user A can update own journal entry'
);

SELECT * FROM finish();
ROLLBACK;
