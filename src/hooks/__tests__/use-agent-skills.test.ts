import { describe, it, expect } from 'vitest'
import { mapToShortcuts, type AgentSkillWithDetails } from '@/hooks/use-agent-skills'

// ── Fixture factory ───────────────────────────────────────────────────────────

function makeAgentSkill(overrides: Partial<AgentSkillWithDetails> = {}): AgentSkillWithDetails {
  return {
    id: 'agent-skill-pk-uuid',      // agent_skills PK
    skill_id: 'skills-table-uuid',   // FK to skills.id
    agent_id: 'agent-uuid',
    status: 'installed',
    skills: {
      id: 'skills-table-uuid',
      name: 'search-leads',
      description: 'Search for leads',
      icon: null,
      origin: 'marketplace',
    },
    skill_versions: null,
    ...overrides,
  } as AgentSkillWithDetails
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('mapToShortcuts', () => {
  it('filters only installed skills', () => {
    const skills = [
      makeAgentSkill({ status: 'installed' }),
      makeAgentSkill({ status: 'pending', id: 'sk-2', skill_id: 'sk-id-2' }),
      makeAgentSkill({ status: 'removed', id: 'sk-3', skill_id: 'sk-id-3' }),
    ]
    const result = mapToShortcuts(skills)
    expect(result.length).toBe(1)
  })

  it('uses skill_id (not agent_skills id) as ChatShortcut.id', () => {
    const skills = [
      makeAgentSkill({ id: 'wrong-pk', skill_id: 'correct-fk', status: 'installed' }),
    ]
    const result = mapToShortcuts(skills)
    expect(result[0].id).toBe('correct-fk')
  })

  it('uses skills.name as label', () => {
    const skills = [
      makeAgentSkill({
        status: 'installed',
        skills: {
          id: 'skills-table-uuid',
          name: 'enrich-data',
          description: 'Enrich contact data',
          icon: null,
          origin: 'marketplace',
        },
      }),
    ]
    const result = mapToShortcuts(skills)
    expect(result[0].label).toBe('enrich-data')
  })

  it('handles null skills join gracefully (label falls back to unknown)', () => {
    const skills = [
      makeAgentSkill({ status: 'installed', skills: null }),
    ]
    const result = mapToShortcuts(skills)
    expect(result[0].label).toBe('unknown')
  })

  it('returns empty array for empty input', () => {
    const result = mapToShortcuts([])
    expect(result).toEqual([])
  })
})
