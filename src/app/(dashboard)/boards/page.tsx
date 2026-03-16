'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { BoardRow } from '@/types/workflow'

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
    <div style={{ maxWidth: '1200px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Boards
          </h1>
          {!loading && !error && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                color: 'var(--text-secondary)',
                margin: '4px 0 0 0',
              }}
            >
              {boards.length} board{boards.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '20px',
                height: '120px',
                opacity: 0.5,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '24px',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)',
          }}
        >
          Error loading boards: {error}
        </div>
      )}

      {/* Boards grid */}
      {!loading && !error && boards.length === 0 && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)',
          }}
        >
          No boards found. Create a board to get started.
        </div>
      )}

      {!loading && !error && boards.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {boards.map((board) => (
            <Link
              key={board.board_id}
              href={`/boards/${board.board_id}`}
              style={{ textDecoration: 'none' }}
            >
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLDivElement).style.borderColor =
                    'var(--accent, #6366f1)'
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow =
                    '0 2px 8px rgba(0,0,0,0.15)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
                }}
              >
                {/* Board name */}
                <h2
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: '0 0 8px 0',
                  }}
                >
                  {board.name}
                </h2>

                {/* Description */}
                {board.description && (
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      margin: '0 0 12px 0',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {board.description}
                  </p>
                )}

                {/* Meta row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: 'auto',
                  }}
                >
                  {board.card_type_filter && (
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        background: 'var(--surface-alt, rgba(255,255,255,0.05))',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        textTransform: 'capitalize',
                      }}
                    >
                      {board.card_type_filter}
                    </span>
                  )}
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      marginLeft: 'auto',
                    }}
                  >
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
