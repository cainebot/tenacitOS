"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { usePathname } from "next/navigation"

interface AgentBoardContextValue {
  agentBoardActive: boolean
  setAgentBoardActive: (active: boolean) => void
}

const AgentBoardContext = createContext<AgentBoardContextValue>({
  agentBoardActive: false,
  setAgentBoardActive: () => {},
})

export function AgentBoardProvider({ children }: { children: ReactNode }) {
  const [agentBoardActive, setAgentBoardActive] = useState(false)
  const pathname = usePathname()

  // Reset when navigating away from project pages
  useEffect(() => {
    if (!pathname.startsWith("/projects/")) {
      setAgentBoardActive(false)
    }
  }, [pathname])

  return (
    <AgentBoardContext.Provider value={{ agentBoardActive, setAgentBoardActive }}>
      {children}
    </AgentBoardContext.Provider>
  )
}

export function useAgentBoard() {
  return useContext(AgentBoardContext)
}
