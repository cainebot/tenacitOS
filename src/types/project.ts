// ============================================================
// Project Engine Types
// Mirrors the schema defined in the projects/project_states tables
// Renamed from workflow.ts in Phase 62 (API & Types Alignment).
// ============================================================

import type { CardAgentStatus } from './supabase'

// ---- Enum / Union type aliases ----

export type StateCategory = 'to-do' | 'in_progress' | 'done' | 'blocked'

export type CardType = 'epic' | 'story' | 'task' | 'subtask' | 'bug' | 'spike' | 'research'

export type Priority = 'low' | 'medium' | 'high' | 'critical'

export type NotificationType =
  | 'mention'
  | 'state_change'
  | 'assignment'
  | 'due_date'
  | 'watch'

export type ActivityAction =
  | 'created'
  | 'state_change'
  | 'field_update'
  | 'assignment'
  | 'priority_change'
  | 'label_change'
  | 'parent_change'
  | 'attachment_add'
  | 'attachment_remove'
  | 'gdpr_anonymize'

// ---- Row interfaces (matching DB columns exactly) ----

export interface ProjectMember {
  id: string
  name: string
  avatarUrl?: string
  type: 'user' | 'agent'
}

export interface ProjectRow {
  project_id: string
  name: string
  slug: string              // Phase 83 D-08 — URL-safe slug, UNIQUE, immutable after creation
  description: string | null
  cover_color: string | null    // Phase 61 — project cover color
  cover_icon: string | null     // Phase 61 — project cover icon
  members: ProjectMember[]      // Phase 61 — JSONB array of project members
  is_favorite: boolean          // Phase 61 — user favorite flag
  created_at: string
  updated_at: string
}

export interface ProjectStateRow {
  state_id: string
  project_id: string
  name: string
  category: StateCategory
  color: string
  position: number
  created_at: string
}

export interface BoardRow {
  board_id: string
  project_id: string
  name: string
  description: string | null
  card_type_filter: CardType | null
  state_filter: string[] | null
  created_at: string
  updated_at: string
  project_lead_agent_id: string | null  // FK to agents — board's Project Lead
}

export interface BoardColumnRow {
  column_id: string
  board_id: string
  name: string
  position: number
  only_humans: boolean
  assigned_agents: string[]
  created_at: string
}

export interface BoardColumnStateRow {
  column_id: string
  state_id: string
}

/** Payload for POST /api/projects/[id]/states/[stateId]/reassign */
export interface ReassignStatePayload {
  target_state_id: string
}

export interface CardRow {
  card_id: string
  project_id: string
  state_id: string
  card_type: CardType
  parent_card_id: string | null
  title: string
  description: string | null
  assigned_agent_id: string | null
  priority: Priority
  labels: string[]
  due_date: string | null
  sort_order: string
  code: string | null // JIRA-style code e.g. "SP-42" (null until migration 07 applied)
  created_at: string
  updated_at: string
  agent_status: CardAgentStatus | null  // Phase 87: agent execution state
}

export interface CardAttachmentRow {
  attachment_id: string
  card_id: string
  filename: string
  mime_type: string | null
  size_bytes: number | null
  storage_path: string
  uploaded_by: string | null
  created_at: string
}

export interface CardCommentRow {
  comment_id: string
  card_id: string
  author: string
  text: string
  created_at: string
}

export interface ActivityLogRow {
  id: string
  card_id: string | null
  task_id: string | null
  actor_type: 'human' | 'agent' | 'system'
  actor_id: string | null
  action: string
  details: Record<string, unknown>
  created_at: string
}

export interface NotificationRow {
  notification_id: string
  card_id: string
  comment_id: string | null
  type: NotificationType
  mentioned_entity_id: string
  mentioned_entity_type: 'agent' | 'user'
  mentioned_by: string
  payload: unknown | null
  read: boolean
  created_at: string
}

export interface SavedFilterRow {
  filter_id: string
  board_id: string
  name: string
  config: Record<string, unknown>
  created_at: string
}

export type CustomFieldType = 'text' | 'number' | 'date' | 'url' | 'email' | 'select' | 'multi_select' | 'checkbox'

export interface CustomFieldDefinitionRow {
  field_id: string
  project_id: string
  card_type: CardType | null
  name: string
  field_type: CustomFieldType
  options: string[] | null
  position: number
  required: boolean
  created_at: string
}

export interface CardCustomFieldValueRow {
  card_id: string
  field_id: string
  value: unknown  // JSONB — type depends on field_type
}

// ---- Composite types for API responses ----

export type ProjectWithStates = ProjectRow & {
  states: ProjectStateRow[]
}

export type BoardWithColumns = BoardRow & {
  columns: (BoardColumnRow & { state_ids: string[] })[]
}

export type CardDetail = CardRow & {
  attachments: CardAttachmentRow[]
  comments: CardCommentRow[]
  parent: { card_id: string; title: string; card_type: CardType } | null
  children: Pick<CardRow, 'card_id' | 'title' | 'card_type' | 'state_id' | 'priority' | 'assigned_agent_id'>[]
  breadcrumb: Pick<CardRow, 'card_id' | 'title' | 'card_type' | 'code'>[]
  field_values: CardCustomFieldValueRow[]
}

// ---- Pagination ----

export interface CursorPage<T> {
  data: T[]
  next_cursor: string | null
  has_more: boolean
}
