'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, LayoutDashboard, Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import type { WorkflowRow, BoardRow } from '@/types/workflow'

interface GroupDetail extends WorkflowRow {
  boards: BoardRow[]
  states: unknown[]
}

export default function BoardGroupDetailPage() {
  const params = useParams()
  const groupId = Array.isArray(params?.groupId) ? params.groupId[0] : params?.groupId

  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!groupId) return
    fetch(`/api/board-groups/${groupId}`)
      .then(r => {
        if (!r.ok) throw new Error('Group not found')
        return r.json() as Promise<GroupDetail>
      })
      .then(setGroup)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [groupId])

  return (
    <div className="-m-6">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 border-b border-border bg-surface">
        <div className="px-4 pt-2 pb-4 md:px-8 md:pt-3 md:pb-5">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/board-groups" className="flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity text-muted">
              <ArrowLeft className="w-4 h-4" />
              Board groups
            </Link>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-primary font-heading">
                {loading ? '…' : group?.name ?? 'Group'}
              </h1>
              {group?.description && (
                <p className="mt-1 text-sm text-muted">{group.description}</p>
              )}
            </div>
            {group && (
              <Link
                href={`/board-groups/${groupId}/edit`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 border border-border text-primary bg-card"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 md:px-8">
        {loading && (
          <div className="flex items-center justify-center py-24 gap-3 text-muted">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-error/10 border border-error/25 text-error">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && group && (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="rounded-2xl p-5 border border-border bg-card">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Boards</p>
                <p className="mt-2 text-3xl font-bold text-primary">{group.boards.length}</p>
              </div>
              <div className="rounded-2xl p-5 border border-border bg-card">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Updated</p>
                <p className="mt-2 text-sm font-medium text-primary">
                  {new Date(group.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Boards list */}
            <div className="rounded-2xl overflow-hidden border border-border bg-card">
              <div className="px-5 py-4 flex items-center justify-between border-b border-border">
                <h2 className="text-sm font-semibold text-primary">
                  Boards in this group
                </h2>
                <Link
                  href={`/board-groups/${groupId}/edit`}
                  className="text-xs hover:opacity-70 transition-opacity text-muted"
                >
                  Manage
                </Link>
              </div>

              {group.boards.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-muted">No boards in this group.</p>
                  <Link
                    href={`/board-groups/${groupId}/edit`}
                    className="mt-2 inline-block text-sm underline hover:opacity-70 text-primary"
                  >
                    Add boards
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {group.boards.map(board => (
                    <Link
                      key={board.board_id}
                      href={`/boards/${board.board_id}`}
                      className="flex items-center gap-3 px-5 py-4 group hover:opacity-80 transition-opacity"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-surface">
                        <LayoutDashboard className="w-4 h-4 text-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-primary">{board.name}</p>
                        {board.description && (
                          <p className="text-xs mt-0.5 truncate text-muted">{board.description}</p>
                        )}
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
