'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useRealtimeNodes } from '@/hooks/useRealtimeNodes'
import { useRealtimeAgents } from '@/hooks/useRealtimeAgents'
import type { NodeRow, AgentRow } from '@/types/supabase'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface RealtimeStatusContext {
  connectionStatus: ConnectionStatus
  nodes: NodeRow[]
  agents: AgentRow[]
  nodesLoading: boolean
  agentsLoading: boolean
}

const RealtimeContext = createContext<RealtimeStatusContext | null>(null)

interface RealtimeProviderProps {
  children: ReactNode
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const wasDisconnected = useRef(false)

  const {
    nodes,
    loading: nodesLoading,
    resync: resyncNodes,
  } = useRealtimeNodes()

  const {
    agents,
    loading: agentsLoading,
    resync: resyncAgents,
  } = useRealtimeAgents()

  const supabase = createBrowserClient()

  useEffect(() => {
    // Monitor connection status via a dedicated heartbeat channel
    const statusChannel = supabase
      .channel('realtime-status')
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')

          // Trigger resync on reconnect after a disconnect
          if (wasDisconnected.current) {
            wasDisconnected.current = false
            resyncNodes()
            resyncAgents()
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected')
          wasDisconnected.current = true
        }
      })

    return () => {
      supabase.removeChannel(statusChannel)
    }
  }, [supabase, resyncNodes, resyncAgents])

  return (
    <RealtimeContext.Provider
      value={{
        connectionStatus,
        nodes,
        agents,
        nodesLoading,
        agentsLoading,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtimeStatus(): RealtimeStatusContext {
  const ctx = useContext(RealtimeContext)
  if (!ctx) {
    throw new Error('useRealtimeStatus must be used within a RealtimeProvider')
  }
  return ctx
}
