// ============================================================
// Adapter Functions — Pure Data Transforms
// Bridges DB row shapes (CardRow, CardDetail) to component prop shapes
// (KanbanCardProps, TaskDetailPanelProps). No React imports, no hooks,
// no side effects. Created in Phase 62 Plan 03 (D-14, D-14a).
// ============================================================

import type { CardRow, CardDetail, ActivityLogRow, ProjectStateRow, TaskMessageRow, TaskMessageType } from '@/types/project'
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
  Priority,
  ActivityEvent,
  ActivityEventType,
} from '@/components/application/task-detail-panel'
import type { TaskType } from '@/components/application/task-type-indicator'
import type { BadgeColor } from '@circos/ui'
import type {
  ChatThreadItem,
  ChatAssistantMessageData,
  ChatToolCallData,
} from '@/components/application/chat-lab/types'

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

export function stateCategoryToTaskStatus(category: string, stateName: string): TaskStatus {
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
  projectStates?: ProjectStateRow[],
): Partial<KanbanCardProps> {
  return {
    title: card.title,
    taskType: card.card_type as TaskType,
    tags: card.labels.map(labelToTag),
    priority: card.priority as KanbanPriority | null,
    assignee: resolveAgent(card.assigned_agent_id, agents),
    subtasks: opts?.childrenCount,
    commentsCount: opts?.commentsCount,
    done: projectStates
      ? projectStates.some(s => s.state_id === card.state_id && s.category === 'done')
      : false,
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
    const isHuman = c.author === 'user' || c.author === 'human'
    return {
      id: c.comment_id,
      author: agent
        ? { id: agent.agent_id, name: agent.name, avatarUrl: undefined, role: agent.role }
        : { id: c.author, name: isHuman ? 'You' : c.author },
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
      priority: child.priority as Priority | null,
      assignee: child.assigned_agent_id ? resolveAgentAsTaskUser(child.assigned_agent_id, agents) : null,
      status: childState ? stateCategoryToTaskStatus(childState.category, childState.name) : 'todo',
      stateId: child.state_id,
    }
  })

  // Map breadcrumbs — ancestors + current card as last item
  const breadcrumbs: BreadcrumbItem[] = [
    ...detail.breadcrumb.map(b => ({
      code: b.code ?? b.title.slice(0, 8),
      title: b.title,
      taskType: b.card_type as TaskType,
    })),
    {
      code: detail.code ?? detail.title.slice(0, 8),
      taskType: detail.card_type as TaskType,
    },
  ]

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

// ---------------------------------------------------------------------------
// activityLogToActivityEvents (activity_log rows → ActivityEvent[])
// ---------------------------------------------------------------------------

const activityActionMap: Record<string, ActivityEventType> = {
  created: 'created',
  state_change: 'state_change',
  field_update: 'field_update',
  assignment: 'assignment',
  priority_change: 'priority_change',
  due_date_change: 'due_date_change',
  label_change: 'label_change',
  parent_change: 'field_update',
  attachment_add: 'attachment_add',
  attachment_remove: 'attachment_remove',
  tool_use: 'tool_use',
  tool_result: 'tool_result',
  thinking: 'thinking',
  error: 'error',
}

export function activityLogToActivityEvents(
  rows: ActivityLogRow[],
  agents: AgentRow[],
  projectStates: ProjectStateRow[],
): ActivityEvent[] {
  return rows.map((row) => {
    const agent = row.actor_type === 'agent'
      ? agents.find(a => a.agent_id === row.actor_id)
      : null
    const isHuman = row.actor_type === 'human'
    const actor: TaskUser = agent
      ? { id: agent.agent_id, name: agent.name, avatarUrl: undefined, role: agent.role }
      : { id: row.actor_id ?? row.actor_type, name: isHuman ? 'You' : (row.actor_id ?? row.actor_type) }

    const type = activityActionMap[row.action] ?? 'field_update'
    const details = row.details as Record<string, unknown>
    const oldVal = (details?.old_value ?? null) as Record<string, string> | null
    const newVal = (details?.new_value ?? null) as Record<string, string> | null

    const base: ActivityEvent = {
      id: row.id,
      actor,
      type,
      createdAt: row.created_at,
    }

    switch (row.action) {
      case 'state_change': {
        // New rows store old_state_id/new_state_id at top level of details.
        // Migrated rows store them nested inside old_value.state_id / new_value.state_id.
        const oldStateId = (details?.old_state_id ?? oldVal?.state_id) as string | undefined
        const newStateId = (details?.new_state_id ?? newVal?.state_id) as string | undefined
        const oldState = oldStateId ? projectStates.find(s => s.state_id === oldStateId) : null
        const newState = newStateId ? projectStates.find(s => s.state_id === newStateId) : null
        return {
          ...base,
          oldValue: oldState?.name ?? oldStateId ?? 'Unknown',
          newValue: newState?.name ?? newStateId ?? 'Unknown',
        }
      }
      case 'assignment':
        return {
          ...base,
          oldValue: oldVal?.agent_id
            ? (agents.find(a => a.agent_id === oldVal.agent_id)?.name ?? oldVal.agent_id)
            : undefined,
          newValue: newVal?.agent_id
            ? (agents.find(a => a.agent_id === newVal.agent_id)?.name ?? newVal.agent_id)
            : undefined,
        }
      case 'priority_change':
        return {
          ...base,
          oldValue: (oldVal?.priority as string) ?? undefined,
          newValue: (newVal?.priority as string) ?? undefined,
        }
      case 'due_date_change':
        return {
          ...base,
          oldValue: (details?.old_due_date as string) ?? undefined,
          newValue: (details?.new_due_date as string) ?? undefined,
        }
      case 'label_change':
        return {
          ...base,
          oldValue: oldVal ? 'removed' : undefined,
          labels: ((newVal?.labels ?? oldVal?.labels) as unknown as string[] | undefined)?.map(labelToTag),
        }
      case 'attachment_add':
        return {
          ...base,
          attachment: newVal ? {
            name: (newVal.filename as string) ?? 'File',
            size: formatFileSize(Number(newVal.size_bytes) || 0),
            fileType: (newVal.filename as string)?.split('.').pop()?.toUpperCase(),
          } : undefined,
        }
      case 'attachment_remove':
        return {
          ...base,
          oldValue: (oldVal?.filename as string) ?? 'File',
        }
      case 'field_update':
      case 'parent_change':
        return {
          ...base,
          oldValue: oldVal ? JSON.stringify(oldVal) : undefined,
          newValue: newVal ? JSON.stringify(newVal) : undefined,
        }
      default:
        return base
    }
  })
}

// ---------------------------------------------------------------------------
// taskMessagesToActivityEvents (task_messages rows -> ActivityEvent[])
// Phase 89 — TASK-04
// ---------------------------------------------------------------------------

/**
 * Type-safe mapping from DB message_type to ActivityEventType.
 * 'text' maps to 'comment' so agent text messages render as comment bubbles
 * in ActivityFeedEntry (which has no 'text' case).
 */
const TASK_MSG_TO_ACTIVITY: Record<TaskMessageType, ActivityEventType> = {
  text:        'comment',
  tool_use:    'tool_use',
  tool_result: 'tool_result',
  thinking:    'thinking',
  error:       'error',
  status:      'status',
}

export function taskMessagesToActivityEvents(
  rows: TaskMessageRow[],
  agents: AgentRow[],
): ActivityEvent[] {
  return rows.map((row) => {
    const agent = row.actor_id
      ? agents.find(a => a.agent_id === row.actor_id)
      : null
    const actor: TaskUser = agent
      ? { id: agent.agent_id, name: agent.name, avatarUrl: undefined, role: agent.role }
      : { id: row.actor_id ?? 'agent', name: row.actor_id ?? 'Agent' }

    return {
      id: row.id,
      actor,
      type: TASK_MSG_TO_ACTIVITY[row.message_type] ?? 'field_update',
      createdAt: row.created_at,
      actorType: 'agent' as const,
      content: row.content ?? undefined,
      toolName: row.tool_name ?? undefined,
      toolInput: (row.input ?? undefined) as Record<string, unknown> | undefined,
      toolOutput: row.output ?? undefined,
      durationMs: row.duration_ms ?? undefined,
    }
  })
}

// ---------------------------------------------------------------------------
// taskMessagesToChatItems (TaskMessageRow[] -> ChatThreadItem[])
// Phase 89.2 — Adapter for chat-lab thread in Comments tab
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function resolveAgentForChat(
  actorId: string | null,
  agents: AgentRow[],
): { name: string; initials: string } {
  if (!actorId) return { name: 'You', initials: 'Y' }
  const agent = agents.find(a => a.agent_id === actorId)
  if (!agent) return { name: actorId, initials: actorId.slice(0, 2).toUpperCase() }
  return { name: agent.name, initials: getInitials(agent.name) }
}

/**
 * Converts raw TaskMessageRow[] from DB into ChatThreadItem[] for the
 * chat-lab ChatThread component (Comments tab only — no activity events).
 *
 * Grouping logic: consecutive tool_use, tool_result, and thinking rows are
 * folded into the chainOfThought of the preceding assistant-message. If none
 * exists, a synthetic assistant-message with empty body is created.
 */
export function taskMessagesToChatItems(
  messages: TaskMessageRow[],
  agents: AgentRow[],
): ChatThreadItem[] {
  const items: ChatThreadItem[] = []

  // --- Convert task_messages ---
  // We iterate in order and group CoT items into the previous assistant-message.
  let lastAssistantItem: { type: 'assistant-message'; id: string; data: ChatAssistantMessageData } | null = null

  for (const msg of messages) {
    const { name: authorName, initials: authorInitials } = resolveAgentForChat(msg.actor_id, agents)
    const isAgent = msg.actor_id ? agents.some(a => a.agent_id === msg.actor_id) : false

    switch (msg.message_type) {
      case 'text': {
        if (isAgent) {
          const assistantItem: ChatThreadItem = {
            type: 'assistant-message',
            id: msg.id,
            data: {
              authorName,
              authorInitials,
              body: msg.content ?? '',
              createdAt: msg.created_at,
              isRunning: false,
            },
          }
          items.push(assistantItem)
          lastAssistantItem = assistantItem as typeof lastAssistantItem
        } else {
          // Human message
          items.push({
            type: 'user-message',
            id: msg.id,
            data: {
              body: msg.content ?? '',
              createdAt: msg.created_at,
              status: 'settled',
            },
          })
          lastAssistantItem = null
        }
        break
      }

      case 'tool_use': {
        // Group into previous assistant-message's chainOfThought
        if (!lastAssistantItem) {
          // Create synthetic assistant-message
          const synth: ChatThreadItem = {
            type: 'assistant-message',
            id: `synth-${msg.id}`,
            data: {
              authorName,
              authorInitials,
              body: '',
              createdAt: msg.created_at,
              isRunning: false,
            },
          }
          items.push(synth)
          lastAssistantItem = synth as typeof lastAssistantItem
        }
        const cot = lastAssistantItem!.data.chainOfThought ??= {
          reasoningLines: [],
          tools: [],
          isActive: false,
        }
        cot.tools.push({
          id: msg.id,
          toolName: msg.tool_name ?? 'unknown',
          input: msg.input ?? undefined,
          status: 'running',
        })
        break
      }

      case 'tool_result': {
        // Find and update the matching tool_use in the current assistant's CoT
        if (lastAssistantItem?.data.chainOfThought) {
          const tools = lastAssistantItem.data.chainOfThought.tools
          // Match by tool_name or update last running tool
          const target = tools.findLast(t => t.status === 'running')
          if (target) {
            target.output = msg.output ?? msg.content ?? undefined
            target.status = 'completed'
          }
        }
        // If no matching tool_use found, skip (data inconsistency)
        break
      }

      case 'thinking': {
        if (!lastAssistantItem) {
          const synth: ChatThreadItem = {
            type: 'assistant-message',
            id: `synth-${msg.id}`,
            data: {
              authorName,
              authorInitials,
              body: '',
              createdAt: msg.created_at,
              isRunning: false,
            },
          }
          items.push(synth)
          lastAssistantItem = synth as typeof lastAssistantItem
        }
        const cot = lastAssistantItem!.data.chainOfThought ??= {
          reasoningLines: [],
          tools: [],
          isActive: false,
        }
        if (msg.content) {
          cot.reasoningLines.push(...msg.content.split('\n'))
        }
        break
      }

      case 'error': {
        items.push({
          type: 'assistant-message',
          id: msg.id,
          data: {
            authorName,
            authorInitials,
            body: '',
            createdAt: msg.created_at,
            isRunning: false,
            notices: [msg.content ?? 'Unknown error'],
          },
        })
        lastAssistantItem = null
        break
      }

      case 'status': {
        items.push({
          type: 'run-marker',
          id: msg.id,
          data: {
            runId: msg.id,
            agentName: authorName,
            agentInitials: authorInitials,
            status: parseRunStatus(msg.content),
          },
        })
        lastAssistantItem = null
        break
      }
    }
  }

  // --- Sort by createdAt ascending ---
  items.sort((a, b) => {
    const timeA = getItemTime(a)
    const timeB = getItemTime(b)
    return timeA - timeB
  })

  return items
}

function getItemTime(item: ChatThreadItem): number {
  switch (item.type) {
    case 'user-message':
    case 'assistant-message':
    case 'timeline-event':
      return new Date(item.data.createdAt).getTime() || 0
    case 'run-marker':
      return 0 // run-markers don't have createdAt — keep insertion order
  }
}

function parseRunStatus(content: string | null): 'running' | 'succeeded' | 'failed' | 'timed_out' | 'cancelled' {
  if (!content) return 'running'
  const lower = content.toLowerCase()
  if (lower.includes('success') || lower.includes('completed') || lower.includes('done')) return 'succeeded'
  if (lower.includes('fail') || lower.includes('error')) return 'failed'
  if (lower.includes('timeout') || lower.includes('timed')) return 'timed_out'
  if (lower.includes('cancel')) return 'cancelled'
  return 'running'
}

// ---------------------------------------------------------------------------
// activityEventsForActivityTab (Phase 89.2 — filter for Activity tab)
// ---------------------------------------------------------------------------

/**
 * Filters and merges card_activity events + task_message status events
 * for the Activity tab. Excludes comment/tool_use/tool_result/thinking/error
 * which now live in the Comments tab via ChatThread.
 */
export function activityEventsForActivityTab(
  activities: ActivityEvent[],
  taskMessages: ActivityEvent[],
): ActivityEvent[] {
  // From taskMessages: only pass 'status' events (agent state changes)
  const statusMessages = taskMessages.filter(m => m.type === 'status')

  // Merge and sort by createdAt ascending
  return [...activities, ...statusMessages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
}
