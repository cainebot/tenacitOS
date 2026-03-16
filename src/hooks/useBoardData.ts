'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BoardWithColumns, CardRow } from '@/types/workflow'

export interface BoardData {
  board: BoardWithColumns | null
  cards: CardRow[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBoardData(boardId: string): BoardData {
  const [board, setBoard] = useState<BoardWithColumns | null>(null)
  const [cards, setCards] = useState<CardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!boardId) return
    setLoading(true)
    setError(null)

    try {
      const [boardRes, cardsRes] = await Promise.all([
        fetch(`/api/boards/${boardId}`),
        fetch(`/api/cards?board_id=${boardId}`),
      ])

      if (!boardRes.ok) {
        throw new Error(`Failed to fetch board: ${boardRes.statusText}`)
      }
      if (!cardsRes.ok) {
        throw new Error(`Failed to fetch cards: ${cardsRes.statusText}`)
      }

      const boardData: BoardWithColumns = await boardRes.json()
      const cardsData: { data: CardRow[] } = await cardsRes.json()

      setBoard(boardData)
      setCards(cardsData.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load board data')
    } finally {
      setLoading(false)
    }
  }, [boardId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { board, cards, loading, error, refetch: fetchData }
}
