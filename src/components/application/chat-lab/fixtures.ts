import type { ChatThreadItem } from './types'

// ---------------------------------------------------------------------------
// Base date for fixture timestamps
// ---------------------------------------------------------------------------
const BASE = '2026-04-06T12:00:00.000Z'
function offset(minutes: number) {
  return new Date(new Date(BASE).getTime() + minutes * 60_000).toISOString()
}

// ---------------------------------------------------------------------------
// State 1: Live Execution
// Timeline events → settled user → settled agent (with CoT) → running run
// marker → queued user follow-up
// ---------------------------------------------------------------------------
export const liveExecutionItems: ChatThreadItem[] = [
  {
    type: 'timeline-event',
    id: 'evt-status',
    data: {
      actorName: 'System',
      actorInitials: 'S',
      createdAt: offset(-5),
      statusChange: { from: 'done', to: 'todo' },
    },
  },
  {
    type: 'timeline-event',
    id: 'evt-assign',
    data: {
      actorName: 'System',
      actorInitials: 'S',
      createdAt: offset(-4),
      assigneeChange: { from: null, to: 'CodexCoder' },
    },
  },
  {
    type: 'user-message',
    id: 'msg-user-1',
    data: {
      body: 'Ship the issue page as a real chat surface — inline timeline events, queued follow-ups, and chain-of-thought that expands into the reasoning ticker.',
      createdAt: offset(-3),
      status: 'settled',
    },
  },
  {
    type: 'assistant-message',
    id: 'msg-agent-1',
    data: {
      authorName: 'CodexCoder',
      authorInitials: 'CC',
      authorIcon: '💻',
      body: 'I swapped the old comment stack for a threaded chat surface. Timeline events now render inline, and the chain-of-thought section expands with a reasoning ticker. The queued follow-up shows an amber badge with an interrupt button.\n\n- Replaced `CommentList` with `IssueChatThread`\n- Added `cot-line-enter` / `cot-line-exit` animations\n- Wired `transcriptsByRunId` for live tool display',
      createdAt: offset(-1),
      runId: 'run-history-1',
      chainOfThought: {
        reasoningLines: [
          'Analyzing the user request about the chat surface...',
          'The current implementation uses CommentList, need to replace it...',
          'Reviewing the timeline events schema for inline rendering...',
          'Need to add cot-line animations for the reasoning ticker...',
          'Implementing the 300ms transition with cubic-bezier timing...',
          'Connecting transcriptsByRunId for live tool display...',
        ],
        tools: [
          {
            id: 'tool-1',
            toolName: 'read_file',
            input: { path: 'ui/src/components/IssueChatThread.tsx' },
            output: 'Loaded the current chat surface — 2,300 lines, uses CommentList internally...',
            status: 'completed',
          },
          {
            id: 'tool-2',
            toolName: 'apply_patch',
            input: { file: 'ui/src/components/IssueChatThread.tsx' },
            output: 'Updated layout classes and replaced CommentList with threaded view...',
            status: 'completed',
          },
        ],
        isActive: false,
        durationMs: 84_000,
      },
    },
  },
  {
    type: 'run-marker',
    id: 'run-live-1',
    data: {
      runId: 'run-live-1',
      agentName: 'CodexCoder',
      agentInitials: 'CC',
      status: 'running',
    },
  },
  {
    type: 'assistant-message',
    id: 'msg-agent-running',
    data: {
      authorName: 'CodexCoder',
      authorInitials: 'CC',
      authorIcon: '💻',
      body: '',
      createdAt: offset(4),
      runId: 'run-live-1',
      isRunning: true,
      chainOfThought: {
        reasoningLines: [
          'I am reshaping the issue page so the thread reads like a conversation...',
          'Need to remove the internal scrollbox first...',
          'Checking the timeline event renderer for inline support...',
          'The queued message badge needs amber styling with interrupt...',
          'Implementing the chain-of-thought expansion toggle...',
          'Wiring the reasoning ticker with cot-line animations...',
        ],
        tools: [
          {
            id: 'tool-live-1',
            toolName: 'read_file',
            input: { path: 'ui/src/components/IssueChatThread.tsx' },
            output: 'Loaded the current chat surface...',
            status: 'completed',
          },
          {
            id: 'tool-live-2',
            toolName: 'apply_patch',
            input: { file: 'ui/src/components/IssueChatThread.tsx' },
            status: 'running',
          },
        ],
        isActive: true,
        durationMs: 12_000,
      },
    },
  },
  {
    type: 'user-message',
    id: 'msg-user-queued',
    data: {
      body: 'Can you also make a dedicated review page that shows settled comments with feedback buttons and a run transcript?',
      createdAt: offset(5),
      status: 'queued',
      queueTargetRunId: 'run-live-1',
    },
  },
]

// ---------------------------------------------------------------------------
// State 2: Submitting (pending message bubble)
// ---------------------------------------------------------------------------
export const submittingItems: ChatThreadItem[] = [
  {
    type: 'user-message',
    id: 'msg-sub-settled',
    data: {
      body: 'Let me know once the chat thread supports inline timeline events and the reasoning ticker is hooked up.',
      createdAt: offset(-2),
      status: 'settled',
    },
  },
  {
    type: 'user-message',
    id: 'msg-sub-pending',
    data: {
      body: 'Looks good — go ahead and ship it. I also want the feedback buttons wired to the vote endpoint.',
      createdAt: offset(0),
      status: 'pending',
    },
  },
]

// ---------------------------------------------------------------------------
// State 3: Settled Review (post-run feedback)
// ---------------------------------------------------------------------------
export const settledReviewItems: ChatThreadItem[] = [
  {
    type: 'timeline-event',
    id: 'evt-reassign',
    data: {
      actorName: 'System',
      actorInitials: 'S',
      createdAt: offset(-6),
      assigneeChange: { from: 'CodexCoder', to: 'ClaudeFixer' },
    },
  },
  {
    type: 'user-message',
    id: 'msg-review-user',
    data: {
      body: 'This looks close but the timeline events are rendering below the message instead of inline. Can you fix the ordering?',
      createdAt: offset(-4),
      status: 'settled',
    },
  },
  {
    type: 'assistant-message',
    id: 'msg-review-agent',
    data: {
      authorName: 'ClaudeFixer',
      authorInitials: 'CF',
      authorIcon: '✨',
      body: 'Fixed the timeline ordering. Events now appear at their correct chronological position in the thread:\n\n- Merged `timelineEvents` into the message stream by `createdAt`\n- Status changes render as system rows with `FeedItem`\n- Assignee changes show agent avatar + "assigned to" link\n\nThe chat surface now reads top-to-bottom in strict chronological order.',
      createdAt: offset(-2),
      runId: 'run-review-1',
      feedbackVote: 'up',
      chainOfThought: {
        reasoningLines: [
          'Reviewing the timeline merge logic...',
          'Found the issue — events were appended after messages instead of sorted...',
          'Implementing chronological interleave with stable sort...',
        ],
        tools: [
          {
            id: 'tool-rev-1',
            toolName: 'read_file',
            input: { path: 'lib/issue-chat-messages.ts' },
            output: 'Found the run projection path — events appended post-sort...',
            status: 'completed',
          },
          {
            id: 'tool-rev-2',
            toolName: 'apply_patch',
            input: { file: 'lib/issue-chat-messages.ts' },
            output: 'Applied chronological interleave with stable sort...',
            status: 'completed',
          },
        ],
        isActive: false,
        durationMs: 42_000,
      },
    },
  },
  {
    type: 'run-marker',
    id: 'run-review-1',
    data: {
      runId: 'run-review-1',
      agentName: 'ClaudeFixer',
      agentInitials: 'CF',
      status: 'failed',
      durationLabel: '2 min 18s',
    },
  },
  {
    type: 'user-message',
    id: 'msg-review-followup',
    data: {
      body: 'Perfect. I also want to see the feedback buttons styled with the brand indigo when voted.',
      createdAt: offset(0),
      status: 'settled',
    },
  },
]
