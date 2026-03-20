'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Loader2, AlertCircle, FolderOpen, LayoutDashboard } from 'lucide-react'
import type { WorkflowRow, BoardRow } from '@/types/workflow'
import { ConfirmActionDialog } from '@openclaw/ui'

interface GroupWithBoards extends WorkflowRow {
  boards: BoardRow[]
}

export default function BoardGroupsPage() {
  const [groups, setGroups] = useState<GroupWithBoards[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WorkflowRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [wfs, boards] = await Promise.all([
        fetch('/api/board-groups').then(r => r.json()) as Promise<WorkflowRow[]>,
        fetch('/api/boards').then(r => r.json()) as Promise<BoardRow[]>,
      ])
      setGroups(wfs.map(w => ({ ...w, boards: boards.filter(b => b.workflow_id === w.workflow_id) })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/board-groups/${deleteTarget.workflow_id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json() as { message?: string }
        throw new Error(body.message ?? 'Delete failed')
      }
      setDeleteTarget(null)
      await load()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const totalBoards = groups.reduce((acc, g) => acc + g.boards.length, 0)

  return (
    <div className="-m-6">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 border-b border-secondary bg-secondary">
        <div className="px-4 pt-2 pb-4 md:px-8 md:pt-3 md:pb-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-primary font-display">
                  Board groups
                </h1>
              </div>
              <p className="mt-1 text-sm text-quaternary">
                Group boards so agents can see related work. {groups.length} group{groups.length === 1 ? '' : 's'} total.
              </p>
            </div>
            <Link
              href="/board-groups/new"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 bg-brand-50 text-white"
            >
              <Plus className="w-4 h-4" />
              Create group
            </Link>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-6 md:px-8">
        {loading && (
          <div className="flex items-center justify-center py-24 gap-3 text-quaternary">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading groups…</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-error/10 border border-error/25 text-error-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <FolderOpen className="w-12 h-12 opacity-20 text-quaternary" />
            <div>
              <p className="text-sm font-medium text-primary">No groups yet</p>
              <p className="text-sm mt-1 text-quaternary">Create a board group to increase cross-board visibility for agents.</p>
            </div>
            <Link
              href="/board-groups/new"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold mt-2 transition-opacity hover:opacity-80 bg-brand-50 text-white"
            >
              <Plus className="w-4 h-4" />
              Create your first group
            </Link>
          </div>
        )}

        {!loading && !error && groups.length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-secondary bg-secondary">
            {/* Table header */}
            <div
              className="grid px-4 py-2 md:px-6 border-b border-secondary bg-secondary"
              style={{ gridTemplateColumns: '1fr 140px 80px' }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-quaternary">Group</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-quaternary">Updated</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-right text-quaternary">Actions</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border">
              {groups.map(group => (
                <div
                  key={group.workflow_id}
                  className="grid items-start px-4 py-4 md:px-6 group/row hover:opacity-90 transition-opacity"
                  style={{ gridTemplateColumns: '1fr 140px 80px' }}
                >
                  {/* Name + description + board count */}
                  <div className="min-w-0 pr-4">
                    <Link
                      href={`/board-groups/${group.workflow_id}`}
                      className="text-sm font-medium hover:underline text-primary"
                    >
                      {group.name}
                    </Link>
                    <p className="mt-1 text-xs line-clamp-2 text-quaternary">
                      {group.description ?? 'No description'}
                    </p>
                    {group.boards.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {group.boards.slice(0, 4).map(b => (
                          <Link
                            key={b.board_id}
                            href={`/boards/${b.board_id}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs hover:opacity-80 transition-opacity bg-secondary border border-secondary text-quaternary"
                          >
                            <LayoutDashboard className="w-3 h-3" />
                            {b.name}
                          </Link>
                        ))}
                        {group.boards.length > 4 && (
                          <span className="text-xs px-2 py-0.5 rounded-md text-quaternary">
                            +{group.boards.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Updated date */}
                  <div className="text-xs pt-0.5 text-quaternary">
                    {new Date(group.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/board-groups/${group.workflow_id}/edit`}
                      className="p-1.5 rounded-lg transition-colors hover:opacity-80 text-quaternary"
                      title="Edit group"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(group)}
                      className="p-1.5 rounded-lg transition-colors hover:opacity-80 text-quaternary"
                      title="Delete group"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 md:px-6 text-xs border-t border-secondary text-quaternary bg-secondary">
              {groups.length} group{groups.length === 1 ? '' : 's'} · {totalBoards} board{totalBoards === 1 ? '' : 's'}
            </div>
          </div>
        )}
      </div>

      <ConfirmActionDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) { setDeleteTarget(null); setDeleteError(null) } }}
        ariaLabel="Delete board group"
        title="Delete board group"
        description={
          <>This will remove <strong>{deleteTarget?.name}</strong>. Boards will remain but become ungrouped. This action cannot be undone.</>
        }
        errorMessage={deleteError ?? undefined}
        onConfirm={() => void handleDelete()}
        isConfirming={deleting}
      />
    </div>
  )
}
