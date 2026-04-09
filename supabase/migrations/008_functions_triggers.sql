-- Migration: 008_functions_triggers
-- Functions: handle_new_user, set_updated_at, delete_entity_comments, cleanup functions
-- Triggers: set_updated_at on all tables with updated_at, entity comment cleanup

-- =============================================
-- Auto-create profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- Auto-update updated_at on row changes
-- =============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply set_updated_at trigger to ALL tables with updated_at column
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_shared_calendars_updated_at BEFORE UPDATE ON shared_calendars
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_journal_entries_updated_at BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- Entity comment cleanup triggers (polymorphic association integrity)
-- =============================================
CREATE OR REPLACE FUNCTION delete_entity_comments()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM comments WHERE entity_type = TG_ARGV[0] AND entity_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_event_comments BEFORE DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION delete_entity_comments('event');
CREATE TRIGGER cleanup_task_comments BEFORE DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION delete_entity_comments('task');
CREATE TRIGGER cleanup_note_comments BEFORE DELETE ON notes
  FOR EACH ROW EXECUTE FUNCTION delete_entity_comments('note');

-- =============================================
-- Cleanup expired AI cache entries (run via Edge Function cron)
-- =============================================
CREATE OR REPLACE FUNCTION cleanup_expired_ai_cache()
RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM ai_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Data retention cleanup (run via Edge Function cron daily)
-- =============================================
CREATE OR REPLACE FUNCTION cleanup_old_activity_data()
RETURNS TABLE(team_activity_deleted INT, task_activity_deleted INT, notifications_deleted INT) AS $$
DECLARE ta_count INT; tk_count INT; n_count INT;
BEGIN
  DELETE FROM team_activity WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS ta_count = ROW_COUNT;
  DELETE FROM task_activity WHERE created_at < NOW() - INTERVAL '180 days';
  GET DIAGNOSTICS tk_count = ROW_COUNT;
  DELETE FROM notifications WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS n_count = ROW_COUNT;
  RETURN QUERY SELECT ta_count, tk_count, n_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
