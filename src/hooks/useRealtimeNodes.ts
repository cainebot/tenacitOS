'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { NodeRow } from '@/types/supabase'

export interface UseRealtimeNodesResult {
  nodes: NodeRow[]
  loading: boolean
  error: string | null
  resync: () => Promise<void>
}

export function useRealtimeNodes(): UseRealtimeNodesResult {
  const [nodes, setNodes] = useState<NodeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient()

  const fetchAllNodes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase.from('nodes').select('*')
      if (fetchError) {
        setError(fetchError.message)
      } else {
        setNodes((data as NodeRow[]) ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch nodes')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const resync = useCallback(async () => {
    await fetchAllNodes()
  }, [fetchAllNodes])

  useEffect(() => {
    // Full resync on mount before subscribing
    fetchAllNodes()

    const channel = supabase
      .channel('nodes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nodes' },
        (payload) => {
          const eventType = payload.eventType

          if (eventType === 'INSERT') {
            const newNode = payload.new as NodeRow
            setNodes((prev) => [...prev, newNode])
          } else if (eventType === 'UPDATE') {
            const updatedNode = payload.new as NodeRow
            setNodes((prev) =>
              prev.map((n) => (n.node_id === updatedNode.node_id ? updatedNode : n))
            )
          } else if (eventType === 'DELETE') {
            const deletedNode = payload.old as Pick<NodeRow, 'node_id'>
            setNodes((prev) => prev.filter((n) => n.node_id !== deletedNode.node_id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAllNodes, supabase])

  return { nodes, loading, error, resync }
}
