'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { BoardWithColumns, CardRow } from '@/types/project'

export interface BoardData {
  board: BoardWithColumns | null
  cards: CardRow[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Derive a short code prefix from a board name.
 * "Sales Pipeline" → "SP", "Tasks" → "TSK", "My Board" → "MB"
 */
function derivePrefix(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    // Take first letter of each word (max 3)
    return words
      .slice(0, 3)
      .map((w) => w[0].toUpperCase())
      .join('')
  }
  // Single word: take first 3 chars
  return name.slice(0, 3).toUpperCase()
}

/**
 * Assign computed codes to cards that don't have one from DB.
 * Cards are numbered sequentially by created_at within the board.
 */
function assignCodes(cards: CardRow[], boardName: string): CardRow[] {
  const hasDbCodes = cards.some((c) => c.code)
  if (hasDbCodes) return cards // DB codes already present (migration 07 applied)

  const prefix = derivePrefix(boardName)
  // Sort by created_at to assign stable sequential numbers
  const sorted = [...cards].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const codeMap = new Map<string, string>()
  sorted.forEach((c, i) => {
    codeMap.set(c.card_id, `${prefix}-${i + 1}`)
  })

  return cards.map((c) => ({
    ...c,
    code: c.code ?? codeMap.get(c.card_id) ?? null,
  }))
}

export function useBoardData(boardId: string): BoardData {
  const [board, setBoard] = useState<BoardWithColumns | null>(null)
  const [cards, setCards] = useState<CardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasLoaded = useRef(false)

  const fetchData = useCallback(async () => {
    if (!boardId) return
    if (!hasLoaded.current) {
      setLoading(true)
    }
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
      setCards(assignCodes(cardsData.data ?? [], boardData.name))
      hasLoaded.current = true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load board data')
    } finally {
      setLoading(false)
    }
  }, [boardId])

  useEffect(() => {
    hasLoaded.current = false
    fetchData()
  }, [fetchData])

  return { board, cards, loading, error, refetch: fetchData }
}
