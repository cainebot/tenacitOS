import { describe, it, expect } from 'vitest'
import { resolveAgentState, mergeProjection, resolveDurable } from './projection-service'
import type { AgentRow, TaskRow } from '@/types/supabase'
import type { ProjectionInput, ZoneBinding, AgentSpatialState, EphemeralOverride, DurableInput, EnrichedTask } from '../types'

// ── Factory helpers ──

function makeAgent(overrides: Partial<AgentRow> = {}): AgentRow {
  return {
    agent_id: 'test-1',
    node_id: 'node-1',
    name: 'Test Agent',
    emoji: '🤖',
    status: 'idle',
    current_task_id: null,
    avatar_model: 'default',
    last_activity: '2026-01-01T00:00:00Z',
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeDesk(agentId: string): ZoneBinding {
  return {
    binding_id: 'desk-' + agentId,
    zone_id: 'zone-' + agentId + '-desk',
    binding_type: 'agent_desk',
    zone_type: 'desk',
    room_capability: null,
    agent_id: agentId,
    project_id: null,
    board_id: null,
    grid_x: 10,
    grid_y: 10,
    label: null,
    color: null,
  }
}

function makeOfficeBinding(boardId: string): ZoneBinding {
  return {
    binding_id: 'office-' + boardId,
    zone_id: 'zone-office-' + boardId,
    binding_type: 'project_board',
    zone_type: 'office',
    room_capability: null,
    agent_id: null,
    project_id: null,
    board_id: boardId,
    grid_x: 50,
    grid_y: 30,
    label: null,
    color: null,
  }
}

function makeTask(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    task_id: 'task-1',
    source_agent_id: null,
    target_agent_id: 'test-1',
    title: 'Test Task',
    type: 'general',
    status: 'pending',
    priority: 1,
    payload: {},
    result: null,
    error_message: null,
    card_id: null,
    max_retries: 3,
    retry_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    claimed_at: null,
    started_at: null,
    completed_at: null,
    updated_at: '2026-01-01T00:00:00Z',
    required_skills: [],
    description: null,
    labels: [],
    due_date: null,
    comments: [],
    ...overrides,
  }
}

function makeEnrichedTask(overrides: Partial<EnrichedTask> = {}): EnrichedTask {
  return {
    task_id: 'task-1',
    source_agent_id: null,
    target_agent_id: 'test-1',
    title: 'Test Task',
    type: 'general',
    status: 'pending',
    priority: 1,
    payload: {},
    result: null,
    error_message: null,
    card_id: null,
    max_retries: 3,
    retry_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    claimed_at: null,
    started_at: null,
    completed_at: null,
    updated_at: '2026-01-01T00:00:00Z',
    required_skills: [],
    description: null,
    labels: [],
    due_date: null,
    comments: [],
    board_id: null,
    ...overrides,
  }
}

function makeDurableInput(overrides: Partial<DurableInput> = {}): DurableInput {
  const agent = overrides.agent ?? makeAgent()
  const homeDesk = overrides.homeDesk !== undefined ? overrides.homeDesk : makeDesk(agent.agent_id)
  return {
    agent,
    homeDesk,
    activeTasks: [],
    zoneBindings: homeDesk ? [homeDesk] : [],
    ...overrides,
  }
}

function makeInput(overrides: Partial<ProjectionInput> = {}): ProjectionInput {
  const agent = overrides.agent ?? makeAgent()
  const homeDesk = overrides.homeDesk ?? makeDesk(agent.agent_id)
  return {
    agent,
    homeDesk,
    activeTasks: [],
    zoneBindings: [homeDesk],
    mapZones: [],
    ...overrides,
  }
}

// ── Tests ──

describe('resolveAgentState', () => {
  describe('Priority 1: Error state', () => {
    it('returns error animationState and error emote when agent status is error', () => {
      const input = makeInput({ agent: makeAgent({ status: 'error' }) })
      const result = resolveAgentState(input)
      expect(result.animationState).toBe('error')
      expect(result.emote).toBe('error')
    })

    it('targets home desk zone', () => {
      const agent = makeAgent({ status: 'error' })
      const homeDesk = makeDesk(agent.agent_id)
      const input = makeInput({ agent, homeDesk })
      const result = resolveAgentState(input)
      expect(result.targetZoneId).toBe(homeDesk.zone_id)
      expect(result.targetGridPos).toEqual({ x: homeDesk.grid_x, y: homeDesk.grid_y })
    })
  })

  describe('Priority 2: Working on task', () => {
    it('falls back to desk when executing task has no board_id (legacy adapter strips board_id)', () => {
      // The deprecated resolveAgentState adapter always sets board_id=null on tasks.
      // This means routing to office zone requires using resolveDurable directly.
      const agent = makeAgent({ status: 'working' })
      const homeDesk = makeDesk(agent.agent_id)
      const boardBinding: ZoneBinding = {
        binding_id: 'board-1',
        zone_id: 'zone-board-1',
        binding_type: 'project_board',
        zone_type: 'office',
        room_capability: null,
        agent_id: null,
        project_id: 'proj-1',
        board_id: 'board-1',
        grid_x: 50,
        grid_y: 30,
        label: null,
        color: null,
      }
      const executingTask = makeTask({ status: 'in_progress' })
      const input = makeInput({
        agent,
        homeDesk,
        activeTasks: [executingTask],
        zoneBindings: [homeDesk, boardBinding],
      })
      const result = resolveAgentState(input)
      // Adapter strips board_id -> no office zone match -> falls to desk
      expect(result.targetZoneId).toBe(homeDesk.zone_id)
      expect(result.animationState).toBe('working')
    })

    it('includes truncated task description as chatBubble (max 60 chars via adapter)', () => {
      // Adapter delegates to resolveDurable. Even in desk-fallback path, chatBubble is set
      // from task description (sliced to 60 chars).
      const agent = makeAgent({ status: 'working' })
      const longDescription = 'This is a very long task description that exceeds 60 characters in total length here'
      const executingTask = { ...makeTask(), status: 'in_progress' as TaskRow['status'], description: longDescription }
      const input = makeInput({
        agent,
        activeTasks: [executingTask],
      })
      const result = resolveAgentState(input)
      expect(result.chatBubble).toBe(longDescription.slice(0, 60))
    })

    it('targets home desk when executing task has no board zone binding', () => {
      const agent = makeAgent({ status: 'working' })
      const homeDesk = makeDesk(agent.agent_id)
      const executingTask = { ...makeTask(), status: 'in_progress' as TaskRow['status'] }
      const input = makeInput({
        agent,
        homeDesk,
        activeTasks: [executingTask],
        zoneBindings: [homeDesk], // Only desk binding, no board binding
      })
      const result = resolveAgentState(input)
      expect(result.targetZoneId).toBe(homeDesk.zone_id)
      expect(result.animationState).toBe('working')
    })
  })

  describe('Priority 3: Thinking/Queued', () => {
    it('returns thinking animationState for status thinking', () => {
      const input = makeInput({ agent: makeAgent({ status: 'thinking' }) })
      const result = resolveAgentState(input)
      expect(result.animationState).toBe('thinking')
      expect(result.emote).toBe('thinking')
    })

    it('returns thinking animationState for status queued', () => {
      const input = makeInput({ agent: makeAgent({ status: 'queued' }) })
      const result = resolveAgentState(input)
      expect(result.animationState).toBe('thinking')
      expect(result.emote).toBe('thinking')
    })

    it('targets home desk zone', () => {
      const agent = makeAgent({ status: 'thinking' })
      const homeDesk = makeDesk(agent.agent_id)
      const input = makeInput({ agent, homeDesk })
      const result = resolveAgentState(input)
      expect(result.targetZoneId).toBe(homeDesk.zone_id)
    })
  })

  describe('Priority 4: Idle', () => {
    it('returns idle animationState for status idle', () => {
      const input = makeInput({ agent: makeAgent({ status: 'idle' }) })
      const result = resolveAgentState(input)
      expect(result.animationState).toBe('idle')
    })

    it('returns idle animationState for status offline (fallthrough)', () => {
      const input = makeInput({ agent: makeAgent({ status: 'offline' }) })
      const result = resolveAgentState(input)
      expect(result.animationState).toBe('idle')
    })

    it('emote and chatBubble are both null', () => {
      const input = makeInput({ agent: makeAgent({ status: 'idle' }) })
      const result = resolveAgentState(input)
      expect(result.emote).toBeNull()
      expect(result.chatBubble).toBeNull()
    })
  })

  describe('Priority order', () => {
    it('error takes precedence over executing task', () => {
      const agent = makeAgent({ status: 'error' })
      const homeDesk = makeDesk(agent.agent_id)
      const boardBinding: ZoneBinding = {
        binding_id: 'board-1',
        zone_id: 'zone-board-1',
        binding_type: 'project_board',
        zone_type: 'office',
        room_capability: null,
        agent_id: null,
        project_id: 'proj-1',
        board_id: 'board-1',
        grid_x: 50,
        grid_y: 30,
        label: null,
        color: null,
      }
      const executingTask = { ...makeTask(), status: 'in_progress' as TaskRow['status'] }
      const input = makeInput({
        agent,
        homeDesk,
        activeTasks: [executingTask],
        zoneBindings: [homeDesk, boardBinding],
      })
      const result = resolveAgentState(input)
      // Error takes precedence — should NOT go to board zone
      expect(result.animationState).toBe('error')
      expect(result.emote).toBe('error')
    })
  })

  describe('agentId propagation', () => {
    it('output agentId matches input agent.agent_id', () => {
      const agent = makeAgent({ agent_id: 'custom-agent-42' })
      const input = makeInput({ agent })
      const result = resolveAgentState(input)
      expect(result.agentId).toBe('custom-agent-42')
    })
  })
})

// ── mergeProjection test helpers ──

function makeDurable(overrides: Partial<AgentSpatialState> = {}): AgentSpatialState {
  return {
    agentId: 'agent-1',
    targetZoneId: 'zone-desk-1',
    targetGridPos: { x: 10, y: 10 },
    animationState: 'idle',
    emote: null,
    chatBubble: null,
    publicState: 'idle',
    badge: null,
    source: 'durable',
    ...overrides,
  }
}

function makeEphemeral(overrides: Partial<EphemeralOverride> = {}): EphemeralOverride {
  return {
    context_type: 'meeting',
    targetZoneId: 'zone-meeting-1',
    publicState: 'meeting',
    ttl_seconds: 300,
    started_at: Date.now(),
    ...overrides,
  }
}

// ── mergeProjection tests ──

describe('mergeProjection', () => {
  describe('no ephemeral override', () => {
    it('returns durable unchanged when ephemeral is null', () => {
      const durable = makeDurable()
      const result = mergeProjection(durable, null)
      expect(result).toEqual(durable)
      expect(result.source).toBe('durable')
    })

    it('returns exact same object reference when ephemeral is null', () => {
      const durable = makeDurable()
      const result = mergeProjection(durable, null)
      expect(result).toBe(durable)
    })
  })

  describe('error always wins', () => {
    it('returns durable unchanged when durable.publicState is error, even with valid ephemeral', () => {
      const durable = makeDurable({ publicState: 'error', animationState: 'error' })
      const ephemeral = makeEphemeral({ publicState: 'meeting' })
      const result = mergeProjection(durable, ephemeral)
      expect(result.publicState).toBe('error')
      expect(result.source).toBe('durable')
    })

    it('returns exact durable reference when error wins', () => {
      const durable = makeDurable({ publicState: 'error' })
      const ephemeral = makeEphemeral()
      const result = mergeProjection(durable, ephemeral)
      expect(result).toBe(durable)
    })
  })

  describe('TTL expiry', () => {
    it('returns durable when TTL has expired (elapsed > ttl_seconds)', () => {
      const durable = makeDurable()
      const ephemeral = makeEphemeral({
        ttl_seconds: 60,
        started_at: Date.now() - 120_000, // 120 seconds ago — expired
      })
      const result = mergeProjection(durable, ephemeral)
      expect(result.source).toBe('durable')
      expect(result.publicState).toBe('idle')
    })

    it('returns durable when TTL has exactly expired (elapsed === ttl_seconds boundary)', () => {
      const durable = makeDurable()
      const ephemeral = makeEphemeral({
        ttl_seconds: 0,
        started_at: Date.now() - 1_000, // started 1 second ago, ttl=0 → expired
      })
      const result = mergeProjection(durable, ephemeral)
      expect(result.source).toBe('durable')
    })
  })

  describe('valid TTL — ephemeral wins', () => {
    it('returns ephemeral override fields when TTL is valid', () => {
      const durable = makeDurable()
      const ephemeral = makeEphemeral({
        targetZoneId: 'zone-meeting-42',
        publicState: 'meeting',
        ttl_seconds: 300,
        started_at: Date.now(), // just started
      })
      const result = mergeProjection(durable, ephemeral)
      expect(result.targetZoneId).toBe('zone-meeting-42')
      expect(result.publicState).toBe('meeting')
      expect(result.source).toBe('ephemeral')
    })

    it('sets source to ephemeral when ephemeral wins', () => {
      const durable = makeDurable({ source: 'durable' })
      const ephemeral = makeEphemeral()
      const result = mergeProjection(durable, ephemeral)
      expect(result.source).toBe('ephemeral')
    })

    it('preserves durable agentId when ephemeral wins', () => {
      const durable = makeDurable({ agentId: 'my-agent-99' })
      const ephemeral = makeEphemeral()
      const result = mergeProjection(durable, ephemeral)
      expect(result.agentId).toBe('my-agent-99')
    })

    it('preserves durable targetGridPos when ephemeral wins', () => {
      const durable = makeDurable({ targetGridPos: { x: 42, y: 17 } })
      const ephemeral = makeEphemeral()
      const result = mergeProjection(durable, ephemeral)
      expect(result.targetGridPos).toEqual({ x: 42, y: 17 })
    })

    it('preserves durable animationState when ephemeral wins', () => {
      const durable = makeDurable({ animationState: 'working' })
      const ephemeral = makeEphemeral()
      const result = mergeProjection(durable, ephemeral)
      expect(result.animationState).toBe('working')
    })

    it('preserves durable emote when ephemeral wins', () => {
      const durable = makeDurable({ emote: 'thinking' })
      const ephemeral = makeEphemeral()
      const result = mergeProjection(durable, ephemeral)
      expect(result.emote).toBe('thinking')
    })

    it('preserves durable chatBubble when ephemeral wins', () => {
      const durable = makeDurable({ chatBubble: 'Hello world' })
      const ephemeral = makeEphemeral()
      const result = mergeProjection(durable, ephemeral)
      expect(result.chatBubble).toBe('Hello world')
    })

    it('preserves durable badge when ephemeral wins', () => {
      const durable = makeDurable({ badge: 'overloaded' })
      const ephemeral = makeEphemeral()
      const result = mergeProjection(durable, ephemeral)
      expect(result.badge).toBe('overloaded')
    })
  })

  describe('room_activity ephemeral override', () => {
    it('works with room_activity context_type as well as meeting', () => {
      const durable = makeDurable()
      const ephemeral = makeEphemeral({
        context_type: 'room_activity',
        targetZoneId: 'zone-room-5',
        publicState: 'focused',
      })
      const result = mergeProjection(durable, ephemeral)
      expect(result.targetZoneId).toBe('zone-room-5')
      expect(result.publicState).toBe('focused')
      expect(result.source).toBe('ephemeral')
    })
  })
})

// ── resolveDurable tests ──

describe('resolveDurable', () => {
  describe('P1: Error state', () => {
    it('returns publicState=error and source=durable when agent status is error', () => {
      const input = makeDurableInput({ agent: makeAgent({ status: 'error' }) })
      const result = resolveDurable(input)
      expect(result.publicState).toBe('error')
      expect(result.animationState).toBe('error')
      expect(result.emote).toBe('error')
      expect(result.source).toBe('durable')
    })

    it('targets home desk zone when error with homeDesk', () => {
      const agent = makeAgent({ status: 'error' })
      const homeDesk = makeDesk(agent.agent_id)
      const input = makeDurableInput({ agent, homeDesk })
      const result = resolveDurable(input)
      expect(result.targetZoneId).toBe(homeDesk.zone_id)
      expect(result.targetGridPos).toEqual({ x: homeDesk.grid_x, y: homeDesk.grid_y })
    })

    it('returns targetZoneId=null and targetGridPos={x:0,y:0} when error with null homeDesk', () => {
      const agent = makeAgent({ status: 'error' })
      const input = makeDurableInput({ agent, homeDesk: null })
      const result = resolveDurable(input)
      expect(result.targetZoneId).toBeNull()
      expect(result.targetGridPos).toEqual({ x: 0, y: 0 })
      expect(result.publicState).toBe('error')
    })
  })

  describe('P2: Executing task — office zone routing', () => {
    it('routes to office zone by board_id when executing task matches zone binding', () => {
      const agent = makeAgent({ status: 'working' })
      const homeDesk = makeDesk(agent.agent_id)
      const officeBinding = makeOfficeBinding('board-42')
      const task = makeEnrichedTask({ status: 'in_progress', board_id: 'board-42' })
      const input = makeDurableInput({
        agent,
        homeDesk,
        activeTasks: [task],
        zoneBindings: [homeDesk, officeBinding],
      })
      const result = resolveDurable(input)
      expect(result.targetZoneId).toBe(officeBinding.zone_id)
      expect(result.targetGridPos).toEqual({ x: officeBinding.grid_x, y: officeBinding.grid_y })
      expect(result.publicState).toBe('working')
      expect(result.source).toBe('durable')
    })

    it('returns publicState=overloaded when 2+ executing tasks have different board_ids', () => {
      const agent = makeAgent({ status: 'working' })
      const homeDesk = makeDesk(agent.agent_id)
      const task1 = makeEnrichedTask({ task_id: 't1', status: 'in_progress', board_id: 'board-1' })
      const task2 = makeEnrichedTask({ task_id: 't2', status: 'in_progress', board_id: 'board-2' })
      const input = makeDurableInput({
        agent,
        homeDesk,
        activeTasks: [task1, task2],
        zoneBindings: [homeDesk],
      })
      const result = resolveDurable(input)
      expect(result.publicState).toBe('overloaded')
      expect(result.badge).toContain('multiple boards')
      expect(result.source).toBe('durable')
    })

    it('falls back to desk when executing task has no matching office zone binding', () => {
      const agent = makeAgent({ status: 'working' })
      const homeDesk = makeDesk(agent.agent_id)
      const task = makeEnrichedTask({ status: 'in_progress', board_id: 'unknown-board' })
      const input = makeDurableInput({
        agent,
        homeDesk,
        activeTasks: [task],
        zoneBindings: [homeDesk], // no office binding for this board
      })
      const result = resolveDurable(input)
      expect(result.targetZoneId).toBe(homeDesk.zone_id)
      expect(result.publicState).toBe('working')
    })

    it('slices chatBubble to 60 chars (not 40)', () => {
      const agent = makeAgent({ status: 'working' })
      const longDescription = 'A'.repeat(80)
      const task = makeEnrichedTask({ status: 'in_progress', board_id: null, description: longDescription })
      const input = makeDurableInput({
        agent,
        activeTasks: [task],
      })
      const result = resolveDurable(input)
      expect(result.chatBubble).toBe(longDescription.slice(0, 60))
      expect(result.chatBubble?.length).toBe(60)
    })
  })

  describe('P3: Thinking / queued', () => {
    it('returns publicState=waiting and animationState=thinking for status thinking', () => {
      const input = makeDurableInput({ agent: makeAgent({ status: 'thinking' }) })
      const result = resolveDurable(input)
      expect(result.publicState).toBe('waiting')
      expect(result.animationState).toBe('thinking')
      expect(result.emote).toBe('thinking')
      expect(result.source).toBe('durable')
    })

    it('returns publicState=waiting for status queued', () => {
      const input = makeDurableInput({ agent: makeAgent({ status: 'queued' }) })
      const result = resolveDurable(input)
      expect(result.publicState).toBe('waiting')
    })

    it('returns targetZoneId=null and targetGridPos={x:0,y:0} for thinking with null homeDesk', () => {
      const agent = makeAgent({ status: 'thinking' })
      const input = makeDurableInput({ agent, homeDesk: null })
      const result = resolveDurable(input)
      expect(result.targetZoneId).toBeNull()
      expect(result.targetGridPos).toEqual({ x: 0, y: 0 })
    })
  })

  describe('P4: Idle — wander', () => {
    it('returns targetZoneId=null for idle agent (WANDER, not desk)', () => {
      const input = makeDurableInput({ agent: makeAgent({ status: 'idle' }) })
      const result = resolveDurable(input)
      expect(result.targetZoneId).toBeNull()
      expect(result.publicState).toBe('idle')
      expect(result.source).toBe('durable')
    })

    it('returns targetZoneId=null for any unrecognized status (fallthrough)', () => {
      const input = makeDurableInput({ agent: makeAgent({ status: 'offline' }) })
      const result = resolveDurable(input)
      expect(result.targetZoneId).toBeNull()
      expect(result.publicState).toBe('idle')
    })
  })

  describe('source field', () => {
    it('all branches return source=durable', () => {
      const statuses = ['error', 'thinking', 'queued', 'idle'] as const
      for (const status of statuses) {
        const result = resolveDurable(makeDurableInput({ agent: makeAgent({ status }) }))
        expect(result.source).toBe('durable')
      }
    })
  })
})
