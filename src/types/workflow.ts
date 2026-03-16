// ============================================================
// Workflow Engine Types
// Mirrors the schema defined in infrastructure/02-workflow-engine.sql
// Added in Phase 15 for the operational agents workflow engine.
// ============================================================

// ---- Enum / Union type aliases ----

export type StateCategory = 'to-do' | 'in_progress' | 'done'

export type CardType = 'epic' | 'story' | 'task' | 'subtask' | 'bug'

export type Priority = 'baja' | 'media' | 'alta'

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

// ---- Row interfaces (matching DB columns exactly) ----

export interface WorkflowRow {
  workflow_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface WorkflowStateRow {
  state_id: string
  workflow_id: string
  name: string
  category: StateCategory
  color: string
  position: number
  created_at: string
}

export interface BoardRow {
  board_id: string
  workflow_id: string
  name: string
  description: string | null
  card_type_filter: CardType | null
  state_filter: string[] | null
  created_at: string
  updated_at: string
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

export interface CardRow {
  card_id: string
  workflow_id: string
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
  created_at: string
  updated_at: string
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

export interface CardActivityRow {
  activity_id: string
  card_id: string
  actor: string
  action: ActivityAction
  old_value: unknown | null
  new_value: unknown | null
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

// ---- Composite types for API responses ----

export type WorkflowWithStates = WorkflowRow & {
  states: WorkflowStateRow[]
}

export type BoardWithColumns = BoardRow & {
  columns: (BoardColumnRow & { state_ids: string[] })[]
}

export type CardDetail = CardRow & {
  attachments: CardAttachmentRow[]
  comments: CardCommentRow[]
  parent: { card_id: string; title: string; card_type: CardType } | null
  children: Pick<CardRow, 'card_id' | 'title' | 'card_type' | 'state_id'>[]
  breadcrumb: Pick<CardRow, 'card_id' | 'title' | 'card_type'>[]
}

// ---- Pagination ----

export interface CursorPage<T> {
  data: T[]
  next_cursor: string | null
  has_more: boolean
}
