// ---------------------------------------------------------------------------
// Chat Lab — Shared types for fixture-driven chat thread previews.
// No runtime dependencies; these types are consumed by all chat-lab components.
// ---------------------------------------------------------------------------

export interface ChatUserMessageData {
  body: string
  createdAt: string
  status: 'settled' | 'pending' | 'queued'
  queueTargetRunId?: string
}

export interface ChatAssistantMessageData {
  authorName: string
  authorInitials: string
  authorIcon?: string
  body: string
  createdAt: string
  runId?: string
  isRunning?: boolean
  chainOfThought?: ChatChainOfThoughtData
  feedbackVote?: 'up' | 'down' | null
  notices?: string[]
}

export interface ChatChainOfThoughtData {
  reasoningLines: string[]
  tools: ChatToolCallData[]
  isActive: boolean
  durationMs?: number
}

export interface ChatToolCallData {
  id: string
  toolName: string
  input?: Record<string, unknown>
  output?: string
  status: 'running' | 'completed' | 'error'
}

export interface ChatTimelineEventData {
  actorName: string
  actorInitials: string
  createdAt: string
  statusChange?: { from: string | null; to: string }
  assigneeChange?: { from: string | null; to: string }
}

export interface ChatRunMarkerData {
  runId: string
  agentName: string
  agentInitials: string
  status: 'running' | 'succeeded' | 'failed' | 'timed_out' | 'cancelled'
  durationLabel?: string
}

export type ChatThreadItem =
  | { type: 'timeline-event'; id: string; data: ChatTimelineEventData }
  | { type: 'user-message'; id: string; data: ChatUserMessageData }
  | { type: 'assistant-message'; id: string; data: ChatAssistantMessageData }
  | { type: 'run-marker'; id: string; data: ChatRunMarkerData }
