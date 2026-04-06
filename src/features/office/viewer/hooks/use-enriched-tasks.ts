'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks'
import type { EnrichedTask } from '../../types'

/**
 * Wraps useRealtimeTasks and enriches with board_id from cards table.
 * Produces EnrichedTask[] where each task has board_id resolved via
 * task.card_id -> cards.board_id JOIN.
 *
 * Only fetches the cards referenced by current tasks (not all cards).
 */
export function useEnrichedTasks(): { enrichedTasks: EnrichedTask[]; loading: boolean } {
  const { tasks, loading: tasksLoading } = useRealtimeTasks()
  const [cardBoardMap, setCardBoardMap] = useState<Map<string, string>>(new Map())
  const [cardsLoading, setCardsLoading] = useState(true)
  const supabase = createBrowserClient()

  // Collect card_ids referenced by current tasks
  const cardIds = useMemo(() => {
    const ids = new Set<string>()
    for (const t of tasks) {
      if (t.card_id) ids.add(t.card_id)
    }
    return ids
  }, [tasks])

  const prevCardIdsRef = useRef<string>('')

  useEffect(() => {
    const key = Array.from(cardIds).sort().join(',')
    if (key === prevCardIdsRef.current) return // no change in card IDs
    prevCardIdsRef.current = key

    if (cardIds.size === 0) {
      setCardBoardMap(new Map())
      setCardsLoading(false)
      return
    }

    setCardsLoading(true)
    supabase
      .from('cards')
      .select('card_id, board_id')
      .in('card_id', Array.from(cardIds))
      .then(({ data }) => {
        const map = new Map<string, string>()
        for (const row of data ?? []) {
          if (row.board_id) map.set(row.card_id, row.board_id)
        }
        setCardBoardMap(map)
        setCardsLoading(false)
      })
  }, [cardIds, supabase])

  const enrichedTasks = useMemo<EnrichedTask[]>(() => {
    return tasks.map(t => ({
      ...t,
      board_id: t.card_id ? (cardBoardMap.get(t.card_id) ?? null) : null,
    }))
  }, [tasks, cardBoardMap])

  return { enrichedTasks, loading: tasksLoading || cardsLoading }
}
