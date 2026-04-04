import { describe, it, expect } from 'vitest'
import { resolveAgentState } from './projection-service'
import type { AgentRow, TaskRow } from '@/types/supabase'
import type { ProjectionInput, ZoneBinding } from '../types'

// ── Factory helpers ──

function makeAgent(overrides: Partial<AgentRow> = {}): AgentRow {
  return {
    agent_id: 'test-1',
    node_id: 'node-1',
    name: 'Test Agent',
    emoji: '🤖',
    status: 'active',
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
    agent_id: agentId,
    project_id: null,
    board_id: null,
    grid_x: 10,
    grid_y: 10,
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
    it('targets board zone when executing task has matching project_board binding', () => {
      const agent = makeAgent({ status: 'working' })
      const homeDesk = makeDesk(agent.agent_id)
      const boardBinding: ZoneBinding = {
        binding_id: 'board-1',
        zone_id: 'zone-board-1',
        binding_type: 'project_board',
        agent_id: null,
        project_id: 'proj-1',
        board_id: 'board-1',
        grid_x: 50,
        grid_y: 30,
      }
      const executingTask = makeTask({ status: 'in_progress' as TaskRow['status'] })
      // Use the plan-specified status 'executing' — but since TaskStatus doesn't include it,
      // we cast to match the behavior spec
      const executingTask2 = { ...makeTask(), status: 'executing' as TaskRow['status'] }
      const input = makeInput({
        agent,
        homeDesk,
        activeTasks: [executingTask2],
        zoneBindings: [homeDesk, boardBinding],
      })
      const result = resolveAgentState(input)
      expect(result.targetZoneId).toBe(boardBinding.zone_id)
      expect(result.targetGridPos).toEqual({ x: boardBinding.grid_x, y: boardBinding.grid_y })
      expect(result.animationState).toBe('working')
    })

    it('includes truncated task description as chatBubble (max 40 chars)', () => {
      const agent = makeAgent({ status: 'working' })
      const longDescription = 'This is a very long task description that exceeds 40 characters'
      const executingTask = { ...makeTask(), status: 'executing' as TaskRow['status'], description: longDescription }
      const input = makeInput({
        agent,
        activeTasks: [executingTask],
      })
      const result = resolveAgentState(input)
      expect(result.chatBubble).toBe(longDescription.slice(0, 40))
    })

    it('targets home desk when executing task has no board zone binding', () => {
      const agent = makeAgent({ status: 'working' })
      const homeDesk = makeDesk(agent.agent_id)
      const executingTask = { ...makeTask(), status: 'executing' as TaskRow['status'] }
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

    it('returns idle animationState for status active', () => {
      const input = makeInput({ agent: makeAgent({ status: 'active' as AgentRow['status'] }) })
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
        agent_id: null,
        project_id: 'proj-1',
        board_id: 'board-1',
        grid_x: 50,
        grid_y: 30,
      }
      const executingTask = { ...makeTask(), status: 'executing' as TaskRow['status'] }
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
