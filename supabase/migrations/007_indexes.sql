-- Migration: 007_indexes
-- ALL indexes from schema.md

-- Contacts
CREATE INDEX idx_contacts_user ON contacts(user_id);
CREATE INDEX idx_contacts_team ON contacts(team_id);
CREATE INDEX idx_contacts_fts ON contacts USING GIN(fts);
CREATE INDEX idx_embeddings_vec ON contact_embeddings USING hnsw (embedding vector_cosine_ops);

-- Events
CREATE INDEX idx_events_user_time ON events(user_id, start_time);
CREATE INDEX idx_events_team ON events(team_id);
CREATE INDEX idx_events_recurrence ON events(recurrence_rule) WHERE recurrence_rule IS NOT NULL;
CREATE INDEX idx_occurrences_event ON recurring_event_occurrences(event_id, occurrence_date);

-- Tasks
CREATE INDEX idx_tasks_user_due ON tasks(user_id, due_date);
CREATE INDEX idx_tasks_team ON tasks(team_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(user_id, status, due_date);
CREATE INDEX idx_subtasks_parent ON subtasks(parent_task_id, sort_order);
CREATE INDEX idx_task_activity_task ON task_activity(task_id, created_at DESC);

-- Notes (full-text search via generated column)
CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_fts ON notes USING GIN(fts);
CREATE INDEX idx_notes_siyuan ON notes(siyuan_block_id) WHERE siyuan_block_id IS NOT NULL;

-- Recordings
CREATE INDEX idx_recordings_status ON recordings(status) WHERE status IN ('pending','processing');

-- Assets
CREATE INDEX idx_assets_user_module ON assets(user_id, module);

-- Teams
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_invitations_token ON team_invitations(invite_token);
CREATE INDEX idx_invitations_email ON team_invitations(invitee_email);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE is_read = FALSE;

-- Activity & Comments
CREATE INDEX idx_team_activity_team ON team_activity(team_id, created_at DESC);
CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);

-- Journal
CREATE INDEX idx_journal_user_date ON journal_entries(user_id, date);

-- AI cache cleanup
CREATE INDEX idx_ai_cache_expiry ON ai_cache(expires_at) WHERE expires_at IS NOT NULL;

-- Device tokens
CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);

-- Focus sessions
CREATE INDEX idx_focus_sessions_user ON focus_sessions(user_id, started_at DESC);
CREATE INDEX idx_focus_sessions_task ON focus_sessions(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_focus_sessions_user_date ON focus_sessions(user_id, started_at)
  WHERE completed = TRUE AND session_type = 'focus';
CREATE INDEX idx_focus_sessions_completed ON focus_sessions(task_id, duration_minutes)
  WHERE completed = TRUE AND task_id IS NOT NULL;

-- ID Mapping
CREATE INDEX idx_id_mapping_entity ON id_mapping(entity_type, v1_id);
