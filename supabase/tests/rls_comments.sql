-- RLS tests for: comments
-- Policies: View (entity accessible), Create (own user_id), Update/Delete (own comments only)
BEGIN;
SELECT plan(8);

-- Setup
INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'usera@test.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'userb@test.com'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'userc@test.com');

INSERT INTO profiles (id, display_name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'User A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'User B'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'User C')
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, user_id, title, start_time, end_time) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Event', NOW(), NOW() + INTERVAL '1 hour');

INSERT INTO comments (id, user_id, entity_type, entity_id, content) VALUES
  ('cc000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'event', 'e0000001-0000-0000-0000-000000000001', 'Nice event!'),
  ('cc000002-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'event', 'e0000001-0000-0000-0000-000000000001', 'User B comment');

-- Test 1: anon cannot see comments
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM comments), 0,
  'anon cannot see comments'
);

-- Test 2: user A (event owner) sees comments on own event
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT is(
  (SELECT count(*)::int FROM comments), 2,
  'user A sees comments on own event'
);

-- Test 3: user C (no access to event) cannot see comments
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', true);
SELECT is(
  (SELECT count(*)::int FROM comments), 0,
  'user C cannot see comments on event they cannot access'
);

-- Test 4: user A can create comment
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT lives_ok(
  $$INSERT INTO comments (user_id, entity_type, entity_id, content) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'event', 'e0000001-0000-0000-0000-000000000001', 'Another comment')$$,
  'user A can create comment'
);

-- Test 5: user A can update own comment
SELECT lives_ok(
  $$UPDATE comments SET content = 'Updated comment' WHERE id = 'cc000001-0000-0000-0000-000000000001'$$,
  'user A can update own comment'
);

-- Test 6: user A cannot update user B comment
SELECT is(
  (SELECT count(*)::int FROM (
    UPDATE comments SET content = 'Hacked' WHERE id = 'cc000002-0000-0000-0000-000000000002' RETURNING 1
  ) t), 0,
  'user A cannot update user B comment'
);

-- Test 7: user A can delete own comment
SELECT lives_ok(
  $$DELETE FROM comments WHERE id = 'cc000001-0000-0000-0000-000000000001'$$,
  'user A can delete own comment'
);

-- Test 8: user A cannot delete user B comment
SELECT is(
  (SELECT count(*)::int FROM (
    DELETE FROM comments WHERE id = 'cc000002-0000-0000-0000-000000000002' RETURNING 1
  ) t), 0,
  'user A cannot delete user B comment'
);

SELECT * FROM finish();
ROLLBACK;
