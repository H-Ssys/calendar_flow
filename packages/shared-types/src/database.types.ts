/**
 * Auto-generated TypeScript types from Ofative Calendar Platform database schema.
 * Source: master_doc/schema.md + supabase/migrations/001-005
 *
 * 26 tables, strict mode, no `any` types.
 * Generated: 2026-03-28
 */

// ============================================================
// Shared union types (derived from CHECK constraints)
// ============================================================

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Visibility = 'private' | 'team' | 'specific';
export type OutcomeEmoji = 'great' | 'ok' | 'rough';
export type RecordingStatus = 'pending' | 'processing' | 'done' | 'failed';
export type AssetModule = 'contacts' | 'notes' | 'events' | 'tasks' | 'recordings' | 'general';
export type TeamDefaultRole = 'admin' | 'member' | 'viewer';
export type TeamMemberRole = 'owner' | 'admin' | 'member' | 'viewer' | 'guest';
export type InvitationRole = 'admin' | 'member' | 'viewer' | 'guest';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';
export type RsvpStatus = 'pending' | 'accepted' | 'tentative' | 'declined';
export type CommentEntityType = 'event' | 'task' | 'note';
export type DevicePlatform = 'ios' | 'android' | 'web';
export type FocusSessionType = 'focus' | 'short_break' | 'long_break';
export type IdMappingEntityType = 'event' | 'task' | 'note' | 'contact' | 'journal';

// ============================================================
// Typed JSONB interfaces
// ============================================================

/** Team settings stored as JSONB on teams table */
export interface TeamSettings {
  [key: string]: unknown;
}

/** Notification preferences for a team member */
export interface NotificationPrefs {
  events: boolean;
  tasks: boolean;
  comments: boolean;
}

/** A single time slot in a journal entry */
export interface JournalSlot {
  hour: number;
  plan: string;
  actual: string;
  outcome: string;
}

/** Reflections section of a journal entry */
export interface JournalReflections {
  gratitude?: string;
  standardize?: string;
  not_good?: string;
  improvements?: string;
  encouragement?: string;
  notes?: string;
}

/** Override data for a recurring event occurrence */
export interface RecurringEventOverride {
  title?: string;
  description?: string;
  [key: string]: unknown;
}

// ============================================================
// 1. profiles
// ============================================================

export interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  language: string;
  theme: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  timezone?: string;
  language?: string;
  theme?: string;
  created_at?: string;
  updated_at?: string;
}

export type ProfileUpdate = Partial<ProfileInsert>;

// ============================================================
// 2. contacts
// ============================================================

export interface ContactRow {
  id: string;
  user_id: string;
  team_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  address: string | null;
  website: string | null;
  industry: string | null;
  reference: string | null;
  notes: string | null;
  avatar_color: string;
  is_favorite: boolean;
  is_verified: boolean;
  front_image_url: string | null;
  back_image_url: string | null;
  tel_phone: string | null;
  fax: string | null;
  other_phone: string | null;
  other_email: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ContactInsert {
  id?: string;
  user_id: string;
  team_id?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  title?: string | null;
  address?: string | null;
  website?: string | null;
  industry?: string | null;
  reference?: string | null;
  notes?: string | null;
  avatar_color?: string;
  is_favorite?: boolean;
  is_verified?: boolean;
  front_image_url?: string | null;
  back_image_url?: string | null;
  tel_phone?: string | null;
  fax?: string | null;
  other_phone?: string | null;
  other_email?: string | null;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export type ContactUpdate = Partial<ContactInsert>;

// ============================================================
// 3. events
// ============================================================

export interface EventRow {
  id: string;
  user_id: string;
  team_id: string | null;
  shared_calendar_id: string | null;
  created_by: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string;
  recurrence_rule: string | null;
  location: string | null;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
}

export interface EventInsert {
  id?: string;
  user_id: string;
  team_id?: string | null;
  shared_calendar_id?: string | null;
  created_by?: string | null;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  color?: string;
  recurrence_rule?: string | null;
  location?: string | null;
  visibility?: Visibility;
  created_at?: string;
  updated_at?: string;
}

export type EventUpdate = Partial<EventInsert>;

// ============================================================
// 4. tasks
// ============================================================

export interface TaskRow {
  id: string;
  user_id: string;
  team_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  start_date: string | null;
  parent_task_id: string | null;
  visibility: Visibility;
  tags: string[];
  /** PDCA: scheduled date for the task */
  scheduled_date: string | null;
  /** PDCA: time-slot identifier */
  scheduled_slot_id: string | null;
  /** PDCA: quick outcome indicator */
  outcome_emoji: OutcomeEmoji | null;
  /** PDCA: 1-5 rating */
  outcome_rating: number | null;
  /** Time spent in minutes */
  time_spent: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskInsert {
  id?: string;
  user_id: string;
  team_id?: string | null;
  assigned_to?: string | null;
  created_by?: string | null;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  due_date?: string | null;
  start_date?: string | null;
  parent_task_id?: string | null;
  visibility?: Visibility;
  tags?: string[];
  scheduled_date?: string | null;
  scheduled_slot_id?: string | null;
  outcome_emoji?: OutcomeEmoji | null;
  outcome_rating?: number | null;
  time_spent?: number;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type TaskUpdate = Partial<TaskInsert>;

// ============================================================
// 5. notes
// ============================================================

export interface NoteRow {
  id: string;
  user_id: string;
  team_id: string | null;
  title: string;
  content: string;
  vault_path: string;
  tags: string[];
  backlinks: string[];
  is_pinned: boolean;
  is_daily_note: boolean;
  color: string;
  word_count: number;
  visibility: Visibility;
  /** SiYuan document block ID */
  siyuan_block_id: string | null;
  /** SiYuan notebook ID */
  siyuan_notebook_id: string | null;
  /** Last sync timestamp with SiYuan */
  siyuan_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteInsert {
  id?: string;
  user_id: string;
  team_id?: string | null;
  title: string;
  content?: string;
  vault_path?: string;
  tags?: string[];
  backlinks?: string[];
  is_pinned?: boolean;
  is_daily_note?: boolean;
  color?: string;
  word_count?: number;
  visibility?: Visibility;
  siyuan_block_id?: string | null;
  siyuan_notebook_id?: string | null;
  siyuan_synced_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type NoteUpdate = Partial<NoteInsert>;

// ============================================================
// 6. recordings
// ============================================================

export interface RecordingRow {
  id: string;
  user_id: string;
  note_id: string | null;
  file_url: string;
  file_size: number | null;
  duration_seconds: number | null;
  transcript: string | null;
  summary: string | null;
  status: RecordingStatus;
  created_at: string;
}

export interface RecordingInsert {
  id?: string;
  user_id: string;
  note_id?: string | null;
  file_url: string;
  file_size?: number | null;
  duration_seconds?: number | null;
  transcript?: string | null;
  summary?: string | null;
  status?: RecordingStatus;
  created_at?: string;
}

export type RecordingUpdate = Partial<RecordingInsert>;

// ============================================================
// 7. assets
// ============================================================

export interface AssetRow {
  id: string;
  user_id: string;
  module: AssetModule;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AssetInsert {
  id?: string;
  user_id: string;
  module: AssetModule;
  file_url: string;
  file_name: string;
  file_type?: string | null;
  file_size?: number | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export type AssetUpdate = Partial<AssetInsert>;

// ============================================================
// 8. teams
// ============================================================

export interface TeamRow {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  color: string;
  created_by: string | null;
  default_role: TeamDefaultRole;
  max_members: number;
  is_active: boolean;
  settings: TeamSettings;
  created_at: string;
  updated_at: string;
}

export interface TeamInsert {
  id?: string;
  name: string;
  description?: string | null;
  avatar_url?: string | null;
  color?: string;
  created_by?: string | null;
  default_role?: TeamDefaultRole;
  max_members?: number;
  is_active?: boolean;
  settings?: TeamSettings;
  created_at?: string;
  updated_at?: string;
}

export type TeamUpdate = Partial<TeamInsert>;

// ============================================================
// 9. team_members
// ============================================================

export interface TeamMemberRow {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamMemberRole;
  display_name: string | null;
  joined_at: string;
  invited_by: string | null;
  expires_at: string | null;
  notification_prefs: NotificationPrefs;
}

export interface TeamMemberInsert {
  id?: string;
  team_id: string;
  user_id: string;
  role?: TeamMemberRole;
  display_name?: string | null;
  joined_at?: string;
  invited_by?: string | null;
  expires_at?: string | null;
  notification_prefs?: NotificationPrefs;
}

export type TeamMemberUpdate = Partial<TeamMemberInsert>;

// ============================================================
// 10. team_invitations
// ============================================================

export interface TeamInvitationRow {
  id: string;
  team_id: string;
  invited_by: string;
  invitee_email: string | null;
  invitee_user_id: string | null;
  role: InvitationRole;
  status: InvitationStatus;
  invite_token: string;
  message: string | null;
  expires_at: string;
  responded_at: string | null;
  created_at: string;
}

export interface TeamInvitationInsert {
  id?: string;
  team_id: string;
  invited_by: string;
  invitee_email?: string | null;
  invitee_user_id?: string | null;
  role?: InvitationRole;
  status?: InvitationStatus;
  invite_token?: string;
  message?: string | null;
  expires_at?: string;
  responded_at?: string | null;
  created_at?: string;
}

export type TeamInvitationUpdate = Partial<TeamInvitationInsert>;

// ============================================================
// 11. shared_calendars
// ============================================================

export interface SharedCalendarRow {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  color: string;
  created_by: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SharedCalendarInsert {
  id?: string;
  team_id: string;
  name: string;
  description?: string | null;
  color?: string;
  created_by?: string | null;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type SharedCalendarUpdate = Partial<SharedCalendarInsert>;

// ============================================================
// 12. event_participants
// ============================================================

export interface EventParticipantRow {
  id: string;
  event_id: string;
  user_id: string;
  rsvp_status: RsvpStatus;
  responded_at: string | null;
}

export interface EventParticipantInsert {
  id?: string;
  event_id: string;
  user_id: string;
  rsvp_status?: RsvpStatus;
  responded_at?: string | null;
}

export type EventParticipantUpdate = Partial<EventParticipantInsert>;

// ============================================================
// 13. comments
// ============================================================

export interface CommentRow {
  id: string;
  user_id: string;
  entity_type: CommentEntityType;
  entity_id: string;
  content: string;
  parent_comment_id: string | null;
  mentions: string[];
  created_at: string;
  updated_at: string;
}

export interface CommentInsert {
  id?: string;
  user_id: string;
  entity_type: CommentEntityType;
  entity_id: string;
  content: string;
  parent_comment_id?: string | null;
  mentions?: string[];
  created_at?: string;
  updated_at?: string;
}

export type CommentUpdate = Partial<CommentInsert>;

// ============================================================
// 14. team_activity
// ============================================================

export interface TeamActivityRow {
  id: string;
  team_id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TeamActivityInsert {
  id?: string;
  team_id: string;
  user_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export type TeamActivityUpdate = Partial<TeamActivityInsert>;

// ============================================================
// 15. notifications
// ============================================================

export interface NotificationRow {
  id: string;
  user_id: string;
  team_id: string | null;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationInsert {
  id?: string;
  user_id: string;
  team_id?: string | null;
  type: string;
  title: string;
  body?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  is_read?: boolean;
  created_at?: string;
}

export type NotificationUpdate = Partial<NotificationInsert>;

// ============================================================
// 16. journal_entries
// ============================================================

export interface JournalEntryRow {
  id: string;
  user_id: string;
  date: string;
  yearly_goal: string | null;
  monthly_goal: string | null;
  daily_goal: string | null;
  daily_result: string | null;
  /** Array of time-slot objects: [{hour, plan, actual, outcome}] */
  slots: JournalSlot[];
  /** Reflection fields: gratitude, standardize, not_good, improvements, encouragement, notes */
  reflections: JournalReflections;
  created_at: string;
  updated_at: string;
}

export interface JournalEntryInsert {
  id?: string;
  user_id: string;
  date: string;
  yearly_goal?: string | null;
  monthly_goal?: string | null;
  daily_goal?: string | null;
  daily_result?: string | null;
  slots?: JournalSlot[];
  reflections?: JournalReflections;
  created_at?: string;
  updated_at?: string;
}

export type JournalEntryUpdate = Partial<JournalEntryInsert>;

// ============================================================
// 17. task_activity
// ============================================================

export interface TaskActivityRow {
  id: string;
  task_id: string;
  user_id: string | null;
  action: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

export interface TaskActivityInsert {
  id?: string;
  task_id: string;
  user_id?: string | null;
  action: string;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  created_at?: string;
}

export type TaskActivityUpdate = Partial<TaskActivityInsert>;

// ============================================================
// 18. subtasks
// ============================================================

export interface SubtaskRow {
  id: string;
  parent_task_id: string;
  title: string;
  is_completed: boolean;
  sort_order: number;
  created_at: string;
}

export interface SubtaskInsert {
  id?: string;
  parent_task_id: string;
  title: string;
  is_completed?: boolean;
  sort_order?: number;
  created_at?: string;
}

export type SubtaskUpdate = Partial<SubtaskInsert>;

// ============================================================
// 19. recurring_event_occurrences
// ============================================================

export interface RecurringEventOccurrenceRow {
  id: string;
  event_id: string;
  occurrence_date: string;
  start_time: string;
  end_time: string;
  is_cancelled: boolean;
  /** Title/description overrides for this specific occurrence */
  override_data: RecurringEventOverride | null;
}

export interface RecurringEventOccurrenceInsert {
  id?: string;
  event_id: string;
  occurrence_date: string;
  start_time: string;
  end_time: string;
  is_cancelled?: boolean;
  override_data?: RecurringEventOverride | null;
}

export type RecurringEventOccurrenceUpdate = Partial<RecurringEventOccurrenceInsert>;

// ============================================================
// 20. device_tokens
// ============================================================

export interface DeviceTokenRow {
  id: string;
  user_id: string;
  token: string;
  platform: DevicePlatform;
  last_seen_at: string;
  created_at: string;
}

export interface DeviceTokenInsert {
  id?: string;
  user_id: string;
  token: string;
  platform: DevicePlatform;
  last_seen_at?: string;
  created_at?: string;
}

export type DeviceTokenUpdate = Partial<DeviceTokenInsert>;

// ============================================================
// 21. focus_sessions
// ============================================================

export interface FocusSessionRow {
  id: string;
  user_id: string;
  task_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  session_type: FocusSessionType;
  completed: boolean;
  created_at: string;
}

export interface FocusSessionInsert {
  id?: string;
  user_id: string;
  task_id?: string | null;
  started_at?: string;
  ended_at?: string | null;
  duration_minutes?: number | null;
  session_type?: FocusSessionType;
  completed?: boolean;
  created_at?: string;
}

export type FocusSessionUpdate = Partial<FocusSessionInsert>;

// ============================================================
// 22. contact_embeddings
// ============================================================

export interface ContactEmbeddingRow {
  id: string;
  contact_id: string;
  /** vector(1536) — OpenAI-compatible embedding */
  embedding: number[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ContactEmbeddingInsert {
  id?: string;
  contact_id: string;
  embedding?: number[] | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}

export type ContactEmbeddingUpdate = Partial<ContactEmbeddingInsert>;

// ============================================================
// 23. ai_cache
// ============================================================

export interface AiCacheRow {
  id: string;
  user_id: string;
  query_hash: string;
  response_json: Record<string, unknown>;
  expires_at: string;
  created_at: string;
}

export interface AiCacheInsert {
  id?: string;
  user_id: string;
  query_hash: string;
  response_json: Record<string, unknown>;
  expires_at?: string;
  created_at?: string;
}

export type AiCacheUpdate = Partial<AiCacheInsert>;

// ============================================================
// 24. ai_correction_memory
// ============================================================

export interface AiCorrectionMemoryRow {
  id: string;
  user_id: string;
  contact_id: string;
  mistaken_text: string;
  incorrect_field: string;
  correct_field: string;
  /** Generated column: 'User moved "{mistaken_text}" from {incorrect_field} to {correct_field}' */
  feedback_summary: string;
  created_at: string;
}

export interface AiCorrectionMemoryInsert {
  id?: string;
  user_id: string;
  contact_id: string;
  mistaken_text: string;
  incorrect_field: string;
  correct_field: string;
  // feedback_summary is GENERATED — excluded from Insert
  created_at?: string;
}

export type AiCorrectionMemoryUpdate = Partial<AiCorrectionMemoryInsert>;

// ============================================================
// 25. id_mapping
// ============================================================

export interface IdMappingRow {
  id: string;
  entity_type: IdMappingEntityType;
  v1_id: string;
  v2_id: string;
  migrated_at: string;
}

export interface IdMappingInsert {
  id?: string;
  entity_type: IdMappingEntityType;
  v1_id: string;
  v2_id: string;
  migrated_at?: string;
}

export type IdMappingUpdate = Partial<IdMappingInsert>;

// ============================================================
// 26. Linking tables (composite PK, no separate id)
// ============================================================

// -- contact_events --

export interface ContactEventRow {
  contact_id: string;
  event_id: string;
}

export type ContactEventInsert = ContactEventRow;
export type ContactEventUpdate = Partial<ContactEventRow>;

// -- contact_tasks --

export interface ContactTaskRow {
  contact_id: string;
  task_id: string;
}

export type ContactTaskInsert = ContactTaskRow;
export type ContactTaskUpdate = Partial<ContactTaskRow>;

// -- contact_notes --

export interface ContactNoteRow {
  contact_id: string;
  note_id: string;
}

export type ContactNoteInsert = ContactNoteRow;
export type ContactNoteUpdate = Partial<ContactNoteRow>;

// -- event_tasks --

export interface EventTaskRow {
  event_id: string;
  task_id: string;
}

export type EventTaskInsert = EventTaskRow;
export type EventTaskUpdate = Partial<EventTaskRow>;

// -- event_notes --

export interface EventNoteRow {
  event_id: string;
  note_id: string;
}

export type EventNoteInsert = EventNoteRow;
export type EventNoteUpdate = Partial<EventNoteRow>;

// ============================================================
// Database type for typed Supabase client
// ============================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      contacts: {
        Row: ContactRow;
        Insert: ContactInsert;
        Update: ContactUpdate;
      };
      events: {
        Row: EventRow;
        Insert: EventInsert;
        Update: EventUpdate;
      };
      tasks: {
        Row: TaskRow;
        Insert: TaskInsert;
        Update: TaskUpdate;
      };
      notes: {
        Row: NoteRow;
        Insert: NoteInsert;
        Update: NoteUpdate;
      };
      recordings: {
        Row: RecordingRow;
        Insert: RecordingInsert;
        Update: RecordingUpdate;
      };
      assets: {
        Row: AssetRow;
        Insert: AssetInsert;
        Update: AssetUpdate;
      };
      teams: {
        Row: TeamRow;
        Insert: TeamInsert;
        Update: TeamUpdate;
      };
      team_members: {
        Row: TeamMemberRow;
        Insert: TeamMemberInsert;
        Update: TeamMemberUpdate;
      };
      team_invitations: {
        Row: TeamInvitationRow;
        Insert: TeamInvitationInsert;
        Update: TeamInvitationUpdate;
      };
      shared_calendars: {
        Row: SharedCalendarRow;
        Insert: SharedCalendarInsert;
        Update: SharedCalendarUpdate;
      };
      event_participants: {
        Row: EventParticipantRow;
        Insert: EventParticipantInsert;
        Update: EventParticipantUpdate;
      };
      comments: {
        Row: CommentRow;
        Insert: CommentInsert;
        Update: CommentUpdate;
      };
      team_activity: {
        Row: TeamActivityRow;
        Insert: TeamActivityInsert;
        Update: TeamActivityUpdate;
      };
      notifications: {
        Row: NotificationRow;
        Insert: NotificationInsert;
        Update: NotificationUpdate;
      };
      journal_entries: {
        Row: JournalEntryRow;
        Insert: JournalEntryInsert;
        Update: JournalEntryUpdate;
      };
      task_activity: {
        Row: TaskActivityRow;
        Insert: TaskActivityInsert;
        Update: TaskActivityUpdate;
      };
      subtasks: {
        Row: SubtaskRow;
        Insert: SubtaskInsert;
        Update: SubtaskUpdate;
      };
      recurring_event_occurrences: {
        Row: RecurringEventOccurrenceRow;
        Insert: RecurringEventOccurrenceInsert;
        Update: RecurringEventOccurrenceUpdate;
      };
      device_tokens: {
        Row: DeviceTokenRow;
        Insert: DeviceTokenInsert;
        Update: DeviceTokenUpdate;
      };
      focus_sessions: {
        Row: FocusSessionRow;
        Insert: FocusSessionInsert;
        Update: FocusSessionUpdate;
      };
      contact_embeddings: {
        Row: ContactEmbeddingRow;
        Insert: ContactEmbeddingInsert;
        Update: ContactEmbeddingUpdate;
      };
      ai_cache: {
        Row: AiCacheRow;
        Insert: AiCacheInsert;
        Update: AiCacheUpdate;
      };
      ai_correction_memory: {
        Row: AiCorrectionMemoryRow;
        Insert: AiCorrectionMemoryInsert;
        Update: AiCorrectionMemoryUpdate;
      };
      id_mapping: {
        Row: IdMappingRow;
        Insert: IdMappingInsert;
        Update: IdMappingUpdate;
      };
      contact_events: {
        Row: ContactEventRow;
        Insert: ContactEventInsert;
        Update: ContactEventUpdate;
      };
      contact_tasks: {
        Row: ContactTaskRow;
        Insert: ContactTaskInsert;
        Update: ContactTaskUpdate;
      };
      contact_notes: {
        Row: ContactNoteRow;
        Insert: ContactNoteInsert;
        Update: ContactNoteUpdate;
      };
      event_tasks: {
        Row: EventTaskRow;
        Insert: EventTaskInsert;
        Update: EventTaskUpdate;
      };
      event_notes: {
        Row: EventNoteRow;
        Insert: EventNoteInsert;
        Update: EventNoteUpdate;
      };
    };
    Functions: {
      /** Returns array of team IDs the current user belongs to (used by RLS policies) */
      user_team_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
    };
  };
}
