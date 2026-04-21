import { describe, it, expect } from 'vitest'
import { activityLogToActivityEvents } from '../adapters'
import type { ActivityLogRow, ProjectStateRow } from '@/types/project'
import type { AgentRow } from '@/types/supabase'

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const AGENT_ROW: AgentRow = {
  agent_id: 'agent-pomni-01',
  node_id: 'node-01',
  name: 'Pomni',
  emoji: '🤡',
  status: 'idle',
  current_task_id: null,
  avatar_model: 'default',
  last_activity: '2026-04-10T00:00:00Z',
  metadata: {},
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-04-10T00:00:00Z',
  role: 'specialist',
}

const STATE_TODO: ProjectStateRow = {
  state_id: 'state-todo-uuid',
  project_id: 'proj-01',
  name: 'To Do',
  category: 'to-do',
  color: '#888',
  position: 0,
  created_at: '2026-01-01T00:00:00Z',
}

const STATE_INPROGRESS: ProjectStateRow = {
  state_id: 'state-inprog-uuid',
  project_id: 'proj-01',
  name: 'In Progress',
  category: 'in_progress',
  color: '#3B82F6',
  position: 1,
  created_at: '2026-01-01T00:00:00Z',
}

const BASE_ROW: ActivityLogRow = {
  id: 'log-row-uuid-01',
  card_id: 'card-01',
  task_id: null,
  actor_type: 'agent',
  actor_id: 'agent-pomni-01',
  action: 'state_change',
  details: {},
  created_at: '2026-04-10T10:00:00Z',
}

// ---------------------------------------------------------------------------
// Gap 1: activityLogToActivityEvents — state_change with NEW format
// New rows store old_state_id/new_state_id directly in details (not nested).
// ---------------------------------------------------------------------------

describe('activityLogToActivityEvents — state_change (new format)', () => {
  it('resolves state names from new-format details (direct old_state_id/new_state_id)', () => {
    const row: ActivityLogRow = {
      ...BASE_ROW,
      action: 'state_change',
      details: {
        old_state_id: 'state-todo-uuid',
        new_state_id: 'state-inprog-uuid',
      },
    }

    const events = activityLogToActivityEvents([row], [AGENT_ROW], [STATE_TODO, STATE_INPROGRESS])

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('state_change')
    expect(events[0].oldValue).toBe('To Do')
    expect(events[0].newValue).toBe('In Progress')
  })
})

// ---------------------------------------------------------------------------
// Gap 1: activityLogToActivityEvents — state_change with MIGRATED format
// Migrated rows from card_activity wrap values inside old_value/new_value.
// ---------------------------------------------------------------------------

describe('activityLogToActivityEvents — state_change (migrated format)', () => {
  it('resolves state names from migrated-format details (old_value.state_id / new_value.state_id)', () => {
    const row: ActivityLogRow = {
      ...BASE_ROW,
      action: 'state_change',
      details: {
        old_value: { state_id: 'state-todo-uuid' },
        new_value: { state_id: 'state-inprog-uuid' },
      },
    }

    const events = activityLogToActivityEvents([row], [AGENT_ROW], [STATE_TODO, STATE_INPROGRESS])

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('state_change')
    expect(events[0].oldValue).toBe('To Do')
    expect(events[0].newValue).toBe('In Progress')
  })

  it('falls back to raw state_id string when state is not found in projectStates', () => {
    const row: ActivityLogRow = {
      ...BASE_ROW,
      action: 'state_change',
      details: {
        old_state_id: 'unknown-state-uuid',
        new_state_id: 'another-unknown-uuid',
      },
    }

    const events = activityLogToActivityEvents([row], [AGENT_ROW], [])

    expect(events[0].oldValue).toBe('unknown-state-uuid')
    expect(events[0].newValue).toBe('another-unknown-uuid')
  })
})

// ---------------------------------------------------------------------------
// Gap 1: Actor type resolution — agent (matched by agent_id)
// ---------------------------------------------------------------------------

describe('activityLogToActivityEvents — actor type: agent', () => {
  it('resolves agent actor to name and role when agent_id matches an AgentRow', () => {
    const row: ActivityLogRow = {
      ...BASE_ROW,
      actor_type: 'agent',
      actor_id: 'agent-pomni-01',
      action: 'state_change',
      details: { old_state_id: 'state-todo-uuid', new_state_id: 'state-inprog-uuid' },
    }

    const events = activityLogToActivityEvents([row], [AGENT_ROW], [STATE_TODO, STATE_INPROGRESS])

    expect(events[0].actor.id).toBe('agent-pomni-01')
    expect(events[0].actor.name).toBe('Pomni')
    expect((events[0].actor as { role?: string }).role).toBe('specialist')
  })

  it('falls back to actor_id as name when agent_id is not found in agents list', () => {
    const row: ActivityLogRow = {
      ...BASE_ROW,
      actor_type: 'agent',
      actor_id: 'agent-unknown-99',
      action: 'state_change',
      details: { old_state_id: 'state-todo-uuid', new_state_id: 'state-inprog-uuid' },
    }

    const events = activityLogToActivityEvents([row], [AGENT_ROW], [STATE_TODO, STATE_INPROGRESS])

    expect(events[0].actor.id).toBe('agent-unknown-99')
    expect(events[0].actor.name).toBe('agent-unknown-99')
  })
})

// ---------------------------------------------------------------------------
// Gap 1: Actor type resolution — human
// ---------------------------------------------------------------------------

describe('activityLogToActivityEvents — actor type: human', () => {
  it('resolves human actor_type to display name "You"', () => {
    const row: ActivityLogRow = {
      ...BASE_ROW,
      actor_type: 'human',
      actor_id: 'user-abc',
      action: 'state_change',
      details: { old_state_id: 'state-todo-uuid', new_state_id: 'state-inprog-uuid' },
    }

    const events = activityLogToActivityEvents([row], [AGENT_ROW], [STATE_TODO, STATE_INPROGRESS])

    expect(events[0].actor.name).toBe('You')
  })
})

// ---------------------------------------------------------------------------
// Gap 1: Actor type resolution — system
// ---------------------------------------------------------------------------

describe('activityLogToActivityEvents — actor type: system', () => {
  it('resolves system actor_type to actor_type string as name', () => {
    const row: ActivityLogRow = {
      ...BASE_ROW,
      actor_type: 'system',
      actor_id: 'system',
      action: 'state_change',
      details: { old_state_id: 'state-todo-uuid', new_state_id: 'state-inprog-uuid' },
    }

    const events = activityLogToActivityEvents([row], [AGENT_ROW], [STATE_TODO, STATE_INPROGRESS])

    // system is not 'human', not a matched agent — falls back to actor_id ?? actor_type
    expect(events[0].actor.id).toBe('system')
    expect(events[0].actor.name).toBe('system')
  })
})

// ---------------------------------------------------------------------------
// Gap 1: All action types in activityActionMap
// ---------------------------------------------------------------------------

describe('activityLogToActivityEvents — action type mapping', () => {
  it('maps assignment action and resolves agent names from old_value/new_value', () => {
    const assigneeAgent: AgentRow = {
      ...AGENT_ROW,
      agent_id: 'agent-jax-02',
      name: 'Jax',
    }
    const row: ActivityLogRow = {
      ...BASE_ROW,
      actor_type: 'human',
      actor_id: 'user-1',
      action: 'assignment',
      details: {
        old_value: { agent_id: 'agent-pomni-01' },
        new_value: { agent_id: 'agent-jax-02' },
      },
    }

    const events = activityLogToActivityEvents([row], [AGENT_ROW, assigneeAgent], [])

    expect(events[0].type).toBe('assignment')
    expect(events[0].oldValue).toBe('Pomni')
    expect(events[0].newValue).toBe('Jax')
  })

  it('maps priority_change action and surfaces priority strings', () => {
    const row: ActivityLogRow = {
      ...BASE_ROW,
      action: 'priority_change',
      details: {
        old_value: { priority: 'low' },
        new_value: { priority: 'high' },
      },
    }

    const events = activityLogToActivityEvents([row], [AGENT_ROW], [])

    expect(events[0].type).toBe('priority_change')
    expect(events[0].oldValue).toBe('low')
    expect(events[0].newValue).toBe('high')
  })

  it('maps label_change action and provides label tags on newValue side', () => {
    const row: ActivityLogRow = {
      ...BASE_ROW,
      action: 'label_change',
      details: {
        new_value: { labels: ['attention', 'urgent'] },
      },
    }

    const events = activityLogToActivityEvents([row], [AGENT_ROW], [])

    expect(events[0].type).toBe('label_change')
    expect(Array.isArray(events[0].labels)).toBe(true)
    expect(events[0].labels).toHaveLength(2)
    expect(events[0].labels![0].label).toBe('attention')
    expect(events[0].labels![1].label).toBe('urgent')
  })

  it('maps attachment_add action with filename and size', () => {
    const row: ActivityLogRow = {
      ...BASE_ROW,
      action: 'attachment_add',
      details: {
        new_value: { filename: 'report.pdf', size_bytes: '2048' },
      },
    }

    const events = activityLogToActivityEvents([row], [AGENT_ROW], [])

    expect(events[0].type).toBe('attachment_add')
    expect(events[0].attachment?.name).toBe('report.pdf')
    expect(events[0].attachment?.fileType).toBe('PDF')
  })

  it('maps attachment_remove action with filename in oldValue', () => {
    const row: ActivityLogRow = {
      ...BASE_ROW,
      action: 'attachment_remove',
      details: {
        old_value: { filename: 'old-file.docx' },
      },
    }

    const events = activityLogToActivityEvents([row], [AGENT_ROW], [])

    expect(events[0].type).toBe('attachment_remove')
    expect(events[0].oldValue).toBe('old-file.docx')
  })

  it('maps gdpr_anonymize action (unknown action) as field_update type with base event', () => {
    const row: ActivityLogRow = {
      ...BASE_ROW,
      actor_type: 'system',
      actor_id: 'system',
      action: 'gdpr_anonymize',
      details: {
        old_value: { title: 'John Doe' },
        new_value: { title: '[GDPR Removed]' },
      },
    }

    const events = activityLogToActivityEvents([row], [AGENT_ROW], [])

    // gdpr_anonymize is not in activityActionMap — falls back to 'field_update'
    expect(events[0].type).toBe('field_update')
    expect(events[0].id).toBe('log-row-uuid-01')
  })

  it('preserves row id and createdAt on all events', () => {
    const row: ActivityLogRow = {
      ...BASE_ROW,
      id: 'unique-event-id-999',
      action: 'state_change',
      details: { old_state_id: 'state-todo-uuid', new_state_id: 'state-inprog-uuid' },
    }

    const events = activityLogToActivityEvents([row], [AGENT_ROW], [STATE_TODO, STATE_INPROGRESS])

    expect(events[0].id).toBe('unique-event-id-999')
    expect(events[0].createdAt).toBe('2026-04-10T10:00:00Z')
  })
})
