-- Migration: 006_rls_policies
-- ALL RLS policies exactly as defined in schema.md

-- Helper: get user's team IDs
CREATE OR REPLACE FUNCTION user_team_ids() RETURNS SETOF UUID AS $$
  SELECT team_id FROM team_members WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- PROFILES: own profile only
-- =============================================
CREATE POLICY "Own profile" ON profiles FOR ALL USING (id = auth.uid());

-- =============================================
-- EVENTS: personal + team + participant
-- =============================================
CREATE POLICY "View events" ON events FOR SELECT USING (
  (user_id = auth.uid() AND team_id IS NULL)
  OR (team_id IN (SELECT user_team_ids()))
  OR (id IN (SELECT event_id FROM event_participants WHERE user_id = auth.uid()))
);
CREATE POLICY "Create events" ON events FOR INSERT WITH CHECK (
  (user_id = auth.uid() AND team_id IS NULL)
  OR (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin','member')))
);
CREATE POLICY "Update events" ON events FOR UPDATE USING (
  user_id = auth.uid()
  OR (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin')))
);
CREATE POLICY "Delete events" ON events FOR DELETE USING (
  user_id = auth.uid()
  OR (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin')))
);

-- =============================================
-- TASKS: personal + team + assigned
-- =============================================
CREATE POLICY "View tasks" ON tasks FOR SELECT USING (
  (user_id = auth.uid() AND team_id IS NULL) OR assigned_to = auth.uid()
  OR (team_id IN (SELECT user_team_ids()))
);
CREATE POLICY "Create tasks" ON tasks FOR INSERT WITH CHECK (
  (user_id = auth.uid() AND team_id IS NULL)
  OR (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin','member')))
);
CREATE POLICY "Update tasks" ON tasks FOR UPDATE USING (
  user_id = auth.uid() OR assigned_to = auth.uid()
  OR (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin')))
);

-- =============================================
-- CONTACTS: personal + team
-- =============================================
CREATE POLICY "View contacts" ON contacts FOR SELECT USING (
  user_id = auth.uid() OR (team_id IN (SELECT user_team_ids()))
);
CREATE POLICY "Create contacts" ON contacts FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "Update contacts" ON contacts FOR UPDATE USING (
  user_id = auth.uid()
  OR (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin','member')))
);
CREATE POLICY "Delete contacts" ON contacts FOR DELETE USING (
  user_id = auth.uid()
  OR (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin')))
);

-- =============================================
-- NOTES: personal + team
-- =============================================
CREATE POLICY "View notes" ON notes FOR SELECT USING (
  user_id = auth.uid() OR (team_id IN (SELECT user_team_ids()))
);
CREATE POLICY "Create notes" ON notes FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "Update notes" ON notes FOR UPDATE USING (
  user_id = auth.uid()
  OR (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin','member')))
);
CREATE POLICY "Delete notes" ON notes FOR DELETE USING (
  user_id = auth.uid()
  OR (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin')))
);

-- =============================================
-- RECORDINGS / ASSETS: own only
-- =============================================
CREATE POLICY "Own recordings" ON recordings FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Own assets" ON assets FOR ALL USING (user_id = auth.uid());

-- =============================================
-- JOURNAL: own only
-- =============================================
CREATE POLICY "Own journal" ON journal_entries FOR ALL USING (user_id = auth.uid());

-- =============================================
-- SUBTASKS: accessible if user owns/is assigned/team parent task
-- =============================================
CREATE POLICY "Access subtasks" ON subtasks FOR ALL USING (
  parent_task_id IN (
    SELECT id FROM tasks
    WHERE user_id = auth.uid()
       OR assigned_to = auth.uid()
       OR team_id IN (SELECT user_team_ids())
  )
);

-- =============================================
-- TASK ACTIVITY: accessible if user owns/is assigned parent task
-- =============================================
CREATE POLICY "View task activity" ON task_activity FOR SELECT USING (
  task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid() OR assigned_to = auth.uid()
    OR team_id IN (SELECT user_team_ids()))
);
CREATE POLICY "Create task activity" ON task_activity FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

-- =============================================
-- RECURRING OCCURRENCES: follows parent event RLS
-- =============================================
CREATE POLICY "View occurrences" ON recurring_event_occurrences FOR SELECT USING (
  event_id IN (SELECT id FROM events WHERE user_id = auth.uid()
    OR team_id IN (SELECT user_team_ids()))
);

-- =============================================
-- LINKING TABLES: user must own both linked entities
-- =============================================
CREATE POLICY "Link contacts-events" ON contact_events FOR ALL USING (
  contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid() OR team_id IN (SELECT user_team_ids()))
  AND event_id IN (SELECT id FROM events WHERE user_id = auth.uid() OR team_id IN (SELECT user_team_ids()))
);
CREATE POLICY "Link contacts-tasks" ON contact_tasks FOR ALL USING (
  contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid() OR team_id IN (SELECT user_team_ids()))
  AND task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid() OR team_id IN (SELECT user_team_ids()))
);
CREATE POLICY "Link contacts-notes" ON contact_notes FOR ALL USING (
  contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid() OR team_id IN (SELECT user_team_ids()))
  AND note_id IN (SELECT id FROM notes WHERE user_id = auth.uid() OR team_id IN (SELECT user_team_ids()))
);
CREATE POLICY "Link events-tasks" ON event_tasks FOR ALL USING (
  event_id IN (SELECT id FROM events WHERE user_id = auth.uid() OR team_id IN (SELECT user_team_ids()))
  AND task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid() OR team_id IN (SELECT user_team_ids()))
);
CREATE POLICY "Link events-notes" ON event_notes FOR ALL USING (
  event_id IN (SELECT id FROM events WHERE user_id = auth.uid() OR team_id IN (SELECT user_team_ids()))
  AND note_id IN (SELECT id FROM notes WHERE user_id = auth.uid() OR team_id IN (SELECT user_team_ids()))
);

-- =============================================
-- AI TABLES: per-user isolation
-- =============================================
CREATE POLICY "Own embeddings" ON contact_embeddings FOR ALL USING (
  contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
);
CREATE POLICY "Own ai_cache" ON ai_cache FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Own ai_corrections" ON ai_correction_memory FOR ALL USING (user_id = auth.uid());

-- =============================================
-- TEAMS: visible to members
-- =============================================
CREATE POLICY "View teams" ON teams FOR SELECT USING (
  id IN (SELECT user_team_ids())
);
CREATE POLICY "Manage teams" ON teams FOR UPDATE USING (
  id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);
CREATE POLICY "Delete teams" ON teams FOR DELETE USING (
  id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'owner')
);

-- =============================================
-- TEAM MEMBERS: visible to fellow members; insert on invite accept; leave/kick
-- =============================================
CREATE POLICY "View members" ON team_members FOR SELECT USING (
  team_id IN (SELECT user_team_ids())
);
CREATE POLICY "Join team" ON team_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_invitations
    WHERE team_id = team_members.team_id
      AND invitee_user_id = auth.uid()
      AND status = 'accepted'
  )
  OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);
CREATE POLICY "Leave or remove member" ON team_members FOR DELETE USING (
  user_id = auth.uid()
  OR team_id IN (SELECT team_id FROM team_members AS tm WHERE tm.user_id = auth.uid() AND tm.role IN ('owner','admin'))
);

-- =============================================
-- NOTIFICATIONS: own only
-- =============================================
CREATE POLICY "Own notifications" ON notifications FOR ALL USING (user_id = auth.uid());

-- =============================================
-- TEAM INVITATIONS: owners/admins create; invitees view/respond
-- =============================================
CREATE POLICY "Create invitation" ON team_invitations FOR INSERT WITH CHECK (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);
CREATE POLICY "View invitations" ON team_invitations FOR SELECT USING (
  team_id IN (SELECT user_team_ids())
  OR invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR invitee_user_id = auth.uid()
);
CREATE POLICY "Respond to invitation" ON team_invitations FOR UPDATE USING (
  invitee_user_id = auth.uid() OR invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- =============================================
-- TEAM ACTIVITY: team members can view and create activity logs
-- =============================================
CREATE POLICY "Create team activity" ON team_activity FOR INSERT WITH CHECK (
  team_id IN (SELECT user_team_ids())
);

-- =============================================
-- COMMENTS: users can comment on entities they can access
-- =============================================
CREATE POLICY "View comments" ON comments FOR SELECT USING (
  entity_id IN (
    SELECT id FROM events WHERE user_id = auth.uid() OR team_id IN (SELECT user_team_ids())
    UNION
    SELECT id FROM tasks WHERE user_id = auth.uid() OR team_id IN (SELECT user_team_ids())
    UNION
    SELECT id FROM notes WHERE user_id = auth.uid() OR team_id IN (SELECT user_team_ids())
  )
);
CREATE POLICY "Create comments" ON comments FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "Delete own comments" ON comments FOR DELETE USING (
  user_id = auth.uid()
);
CREATE POLICY "Update own comments" ON comments FOR UPDATE USING (
  user_id = auth.uid()
);

-- =============================================
-- EVENT PARTICIPANTS: visible to event owners and team members
-- =============================================
CREATE POLICY "View participants" ON event_participants FOR SELECT USING (
  event_id IN (SELECT id FROM events WHERE user_id = auth.uid() OR team_id IN (SELECT user_team_ids()))
);
CREATE POLICY "Manage RSVP" ON event_participants FOR ALL USING (
  user_id = auth.uid()
);

-- =============================================
-- SHARED CALENDARS: visible to team members
-- =============================================
CREATE POLICY "View shared calendars" ON shared_calendars FOR SELECT USING (
  team_id IN (SELECT user_team_ids())
);
CREATE POLICY "Manage shared calendars" ON shared_calendars FOR ALL USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);

-- =============================================
-- DEVICE TOKENS: own only
-- =============================================
CREATE POLICY "Own tokens" ON device_tokens FOR ALL USING (user_id = auth.uid());

-- =============================================
-- FOCUS SESSIONS: own only
-- =============================================
CREATE POLICY "Own focus sessions" ON focus_sessions FOR ALL USING (user_id = auth.uid());

-- =============================================
-- ID MAPPING: accessible if user owns the mapped entity
-- =============================================
CREATE POLICY "Own migration records" ON id_mapping FOR ALL USING (
  v2_id IN (
    SELECT id FROM events WHERE user_id = auth.uid()
    UNION SELECT id FROM tasks WHERE user_id = auth.uid()
    UNION SELECT id FROM notes WHERE user_id = auth.uid()
    UNION SELECT id FROM contacts WHERE user_id = auth.uid()
  )
);
