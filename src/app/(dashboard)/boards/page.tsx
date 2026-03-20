'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { BoardRow } from '@/types/workflow'
import { cx } from '@openclaw/ui'

export default function BoardsPage() {
  const [boards, setBoards] = useState<BoardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/boards')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch boards: ${res.statusText}`)
        return res.json() as Promise<BoardRow[]>
      })
      .then((data) => setBoards(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load boards'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-[1200px]">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary m-0">
            Boards
          </h1>
          {!loading && !error && (
            <p className="font-body text-sm text-secondary mt-1 mb-0">
              {boards.length} board{boards.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-secondary border border-secondary rounded-lg p-5 h-[120px] opacity-50 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-secondary border border-secondary rounded-lg p-6 text-secondary font-body">
          Error loading boards: {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && boards.length === 0 && (
        <div className="bg-secondary border border-secondary rounded-lg px-6 py-12 text-center text-secondary font-body">
          No boards found. Create a board to get started.
        </div>
      )}

      {/* Boards grid */}
      {!loading && !error && boards.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {boards.map((board) => (
            <Link
              key={board.board_id}
              href={`/boards/${board.board_id}`}
              className="no-underline"
            >
              <div
                className={cx(
                  'bg-secondary border border-secondary rounded-lg p-5 cursor-pointer',
                  'transition-[border-color,box-shadow] duration-150 ease-[ease]',
                  'hover:border-accent hover:shadow-[0_2px_8px_rgba(0,0,0,0.15)]',
                )}
              >
                {/* Board name */}
                <h2 className="font-display text-base font-semibold text-primary mb-2 mt-0">
                  {board.name}
                </h2>

                {/* Description */}
                {board.description && (
                  <p className="font-body text-xs text-secondary mb-3 mt-0 line-clamp-2">
                    {board.description}
                  </p>
                )}

                {/* Meta row */}
                <div className="flex items-center gap-2 mt-auto">
                  {board.card_type_filter && (
                    <span className="font-body text-[11px] text-secondary bg-tertiary border border-secondary rounded px-1.5 py-0.5 capitalize">
                      {board.card_type_filter}
                    </span>
                  )}
                  <span className="font-body text-[11px] text-secondary ml-auto">
                    View board &rarr;
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
