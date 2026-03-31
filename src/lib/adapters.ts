// ============================================================
// Adapter Functions — Pure Data Transforms
// Bridges DB row shapes (CardRow, CardDetail) to component prop shapes
// (KanbanCardProps, TaskDetailPanelProps). No React imports, no hooks,
// no side effects. Created in Phase 62 Plan 03 (D-14, D-14a).
// ============================================================

import type { CardRow, CardDetail, ProjectStateRow } from '@/types/project'
import type { AgentRow } from '@/types/supabase'
import type { KanbanCardProps, KanbanCardTag, KanbanCardUser, Priority as KanbanPriority } from '@/components/application/kanban-card'
import type {
  TaskDetailPanelProps,
  TaskUser,
  TaskComment,
  TaskAttachment,
  Subtask,
  BreadcrumbItem,
  TaskStatus,
} from '@/components/application/task-detail-panel'
import type { TaskType } from '@/components/application/task-type-indicator'
import type { BadgeColor } from '@circos/ui'

// ---------------------------------------------------------------------------
// Tag color mapping (D-14 — deterministic hash)
// ---------------------------------------------------------------------------

const TAG_COLORS: BadgeColor[] = [
  'gray', 'brand', 'error', 'warning', 'success',
  'blue', 'indigo', 'purple', 'pink',
]

export function labelToTag(label: string): KanbanCardTag {
  // Deterministic hash: djb2-style sum of char codes mod color count
  let hash = 0
  for (let i = 0; i < label.length; i++) {
    hash = ((hash << 5) - hash + label.charCodeAt(i)) | 0
  }
  const colorIndex = Math.abs(hash) % TAG_COLORS.length
  return { label, color: TAG_COLORS[colorIndex] }
}

// ---------------------------------------------------------------------------
// Agent resolver helpers (internal)
// ---------------------------------------------------------------------------

function resolveAgent(
  agentId: string | null,
  agents: AgentRow[],
): KanbanCardUser | null {
  if (!agentId) return null
  const agent = agents.find(a => a.agent_id === agentId)
  if (!agent) return null
  return { id: agent.agent_id, name: agent.name, avatarUrl: undefined }
}

function resolveAgentAsTaskUser(
  agentId: string | null,
  agents: AgentRow[],
): TaskUser | null {
  if (!agentId) return null
  const agent = agents.find(a => a.agent_id === agentId)
  if (!agent) return null
  return { id: agent.agent_id, name: agent.name, avatarUrl: undefined, role: agent.role }
}

// ---------------------------------------------------------------------------
// State category -> TaskStatus mapping
// ---------------------------------------------------------------------------

function stateCategoryToTaskStatus(category: string, stateName: string): TaskStatus {
  // state_category: 'to-do' | 'in_progress' | 'done'
  // TaskStatus: 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled'
  if (category === 'to-do') return 'todo'
  if (category === 'in_progress') {
    const lower = stateName.toLowerCase()
    if (lower.includes('review') || lower.includes('qa')) return 'in_review'
    return 'in_progress'
  }
  if (category === 'done') {
    const lower = stateName.toLowerCase()
    if (lower.includes('cancel') || lower.includes('lost')) return 'cancelled'
    return 'done'
  }
  return 'todo'
}

// ---------------------------------------------------------------------------
// File size formatter (internal)
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

// ---------------------------------------------------------------------------
// cardRowToKanbanCardProps (D-14)
// ---------------------------------------------------------------------------

export function cardRowToKanbanCardProps(
  card: CardRow,
  agents: AgentRow[],
  opts?: { childrenCount?: { done: number; total: number }; commentsCount?: number },
): Partial<KanbanCardProps> {
  return {
    title: card.title,
    taskType: card.card_type as TaskType,
    tags: card.labels.map(labelToTag),
    priority: card.priority as KanbanPriority | null,
    assignee: resolveAgent(card.assigned_agent_id, agents),
    subtasks: opts?.childrenCount,
    commentsCount: opts?.commentsCount,
    done: false, // Caller determines from state_id vs done-category states
    // dueDate: NOT mapped here — requires DateValue conversion (parseDate from @internationalized/date)
    // Callbacks NOT mapped — wired by the consuming page, not the adapter
  }
}

// ---------------------------------------------------------------------------
// cardDetailToTaskDetailPanelProps (D-14)
// ---------------------------------------------------------------------------

export function cardDetailToTaskDetailPanelProps(
  detail: CardDetail,
  agents: AgentRow[],
  projectStates: ProjectStateRow[],
): Partial<TaskDetailPanelProps> {
  // Resolve current state for status mapping
  const currentState = projectStates.find(s => s.state_id === detail.state_id)
  const status: TaskStatus = currentState
    ? stateCategoryToTaskStatus(currentState.category, currentState.name)
    : 'todo'

  // Map comments: enrich author string with agent data
  const comments: TaskComment[] = detail.comments.map(c => {
    const agent = agents.find(a => a.name === c.author || a.agent_id === c.author)
    return {
      id: c.comment_id,
      author: agent
        ? { id: agent.agent_id, name: agent.name, avatarUrl: undefined, role: agent.role }
        : { id: c.author, name: c.author },
      content: c.text,
      createdAt: c.created_at,
    }
  })

  // Map attachments
  const attachments: TaskAttachment[] = detail.attachments.map(a => ({
    id: a.attachment_id,
    name: a.filename,
    size: formatFileSize(a.size_bytes),
    createdAt: a.created_at,
    thumbnailUrl: undefined, // Signed URLs handled by the consuming component via API
  }))

  // Map children to subtasks
  const subtasks: Subtask[] = detail.children.map(child => {
    const childState = projectStates.find(s => s.state_id === child.state_id)
    return {
      id: child.card_id,
      code: '', // Children from the pick don't include code; enriched by caller if needed
      title: child.title,
      taskType: child.card_type as TaskType,
      priority: null, // Children pick doesn't include priority
      assignee: null, // Children pick doesn't include assigned_agent_id
      status: childState ? stateCategoryToTaskStatus(childState.category, childState.name) : 'todo',
    }
  })

  // Map breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = detail.breadcrumb.map(b => ({
    code: b.code ?? b.title.slice(0, 8),
    taskType: b.card_type as TaskType,
  }))

  return {
    title: detail.title,
    taskType: detail.card_type as TaskType,
    status,
    description: detail.description ?? undefined,
    bodyContent: detail.description ?? undefined,
    assignee: resolveAgentAsTaskUser(detail.assigned_agent_id, agents),
    tags: detail.labels.map(labelToTag),
    priority: detail.priority as KanbanPriority | null,
    subtasks,
    attachments,
    comments,
    breadcrumbs,
    isCompleted: currentState?.category === 'done',
  }
}
