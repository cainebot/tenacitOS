'use client'

import { createContext, useContext, useState } from 'react'

// Lightweight agent type for context — does not import full AgentRow
// to keep this context self-contained and free of tight coupling.
export interface AgentListItem {
  agent_id: string
  name: string
  emoji: string
  status: string     // AgentStatus as string — avoids tight coupling
  role?: string      // AgentRole — optional
  badge?: string     // AgentBadge — optional
  about?: string | null
  skills?: string[]
}

interface AgentFilterContextValue {
  // Agent list (populated by board page from /api/agents/list)
  agents: AgentListItem[]
  setAgents: (agents: AgentListItem[]) => void

  // Currently selected agent (null = all agents / no filter)
  selectedAgentId: string | null
  setSelectedAgentId: (id: string | null) => void

  // Panel open/close state
  agentPanelOpen: boolean
  setAgentPanelOpen: (open: boolean) => void

  // Board ID (needed by AgentSidePanel to fetch assigned cards for this board)
  boardId: string | null
  setBoardId: (id: string | null) => void

  // Scrum Master agent ID for the current board (from boards.scrum_master_agent_id)
  scrumMasterAgentId: string | null
  setScrumMasterAgentId: (id: string | null) => void
}

const defaultValue: AgentFilterContextValue = {
  agents: [],
  setAgents: () => {},
  selectedAgentId: null,
  setSelectedAgentId: () => {},
  agentPanelOpen: false,
  setAgentPanelOpen: () => {},
  boardId: null,
  setBoardId: () => {},
  scrumMasterAgentId: null,
  setScrumMasterAgentId: () => {},
}

export const AgentFilterContext = createContext<AgentFilterContextValue>(defaultValue)

export function AgentFilterProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<AgentListItem[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [agentPanelOpen, setAgentPanelOpen] = useState(false)
  const [boardId, setBoardId] = useState<string | null>(null)
  const [scrumMasterAgentId, setScrumMasterAgentId] = useState<string | null>(null)

  return (
    <AgentFilterContext.Provider
      value={{
        agents,
        setAgents,
        selectedAgentId,
        setSelectedAgentId,
        agentPanelOpen,
        setAgentPanelOpen,
        boardId,
        setBoardId,
        scrumMasterAgentId,
        setScrumMasterAgentId,
      }}
    >
      {children}
    </AgentFilterContext.Provider>
  )
}

export function useAgentFilter(): AgentFilterContextValue {
  const ctx = useContext(AgentFilterContext)
  if (ctx === undefined) {
    throw new Error('useAgentFilter must be used inside an AgentFilterProvider')
  }
  return ctx
}
