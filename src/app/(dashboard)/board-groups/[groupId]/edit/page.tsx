'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { WorkflowRow, BoardRow } from '@/types/workflow'

export default function EditBoardGroupPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = Array.isArray(params?.groupId) ? params.groupId[0] : params?.groupId

  const [group, setGroup] = useState<WorkflowRow | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [boardSearch, setBoardSearch] = useState('')
  const [allBoards, setAllBoards] = useState<BoardRow[]>([])
  const [selectedBoardIds, setSelectedBoardIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!groupId) return
    Promise.all([
      fetch(`/api/board-groups/${groupId}`).then(r => r.json()) as Promise<WorkflowRow & { boards: BoardRow[] }>,
      fetch('/api/boards').then(r => r.json()) as Promise<BoardRow[]>,
    ])
      .then(([grp, boards]) => {
        setGroup(grp)
        setName(grp.name)
        setDescription(grp.description ?? '')
        setAllBoards(boards)
        if (!initializedRef.current) {
          initializedRef.current = true
          const groupBoardIds = ('boards' in grp ? (grp as WorkflowRow & { boards: BoardRow[] }).boards : []).map((b: BoardRow) => b.board_id)
          setSelectedBoardIds(new Set(groupBoardIds))
        }
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [groupId])

  const toggleBoard = (id: string) => {
    setSelectedBoardIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filteredBoards = allBoards.filter(b => {
    const q = boardSearch.trim().toLowerCase()
    return !q || b.name.toLowerCase().includes(q)
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!groupId || !name.trim()) { setError('Group name is required.'); return }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/board-groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          board_ids: Array.from(selectedBoardIds),
        }),
      })
      if (!res.ok) {
        const body = await res.json() as { message?: string }
        throw new Error(body.message ?? 'Failed to save')
      }
      router.push(`/board-groups/${groupId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="-m-6">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 border-b border-secondary bg-secondary">
        <div className="px-4 pt-2 pb-4 md:px-8 md:pt-3 md:pb-5">
          <div className="flex items-center gap-3 mb-1">
            <Link href={`/board-groups/${groupId ?? ''}`} className="flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity text-quaternary">
              <ArrowLeft className="w-4 h-4" />
              {group?.name ?? 'Board group'}
            </Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary font-display">
            {loading ? '…' : group?.name ?? 'Edit group'}
          </h1>
          <p className="mt-1 text-sm text-quaternary">
            Update the shared context that connects boards in this group.
          </p>
        </div>
      </div>

      <div className="px-4 py-6 md:px-8 max-w-2xl">
        {loading ? (
          <div className="flex items-center gap-2 py-12 text-quaternary">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : (
          <form onSubmit={e => void handleSubmit(e)} className="space-y-6">
            <div className="rounded-2xl p-6 space-y-6 border border-secondary bg-secondary">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary">
                  Group name <span className="text-brand-600">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Group name"
                  disabled={saving}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-primary border border-secondary text-primary outline-none"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What ties these boards together?"
                  disabled={saving}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg text-sm resize-none bg-primary border border-secondary text-primary outline-none"
                />
              </div>

              {/* Board assignment */}
              <div className="space-y-2 pt-2 border-t border-secondary">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary">Boards</p>
                    <p className="text-xs mt-0.5 text-quaternary">
                      Assign boards to this group to share context across related work.
                    </p>
                  </div>
                  <span className="text-xs text-quaternary">{selectedBoardIds.size} selected</span>
                </div>
                <input
                  type="text"
                  value={boardSearch}
                  onChange={e => setBoardSearch(e.target.value)}
                  placeholder="Search boards…"
                  disabled={saving}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-primary border border-secondary text-primary outline-none"
                />
                <div className="max-h-56 overflow-auto rounded-xl border border-secondary bg-secondary">
                  {filteredBoards.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-quaternary">No boards found.</div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {filteredBoards.map(board => {
                        const checked = selectedBoardIds.has(board.board_id)
                        const inOtherGroup = board.workflow_id !== groupId && !checked
                        return (
                          <li key={board.board_id} className="px-4 py-3">
                            <label className="flex cursor-pointer items-start gap-3">
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded"
                                checked={checked}
                                onChange={() => toggleBoard(board.board_id)}
                                disabled={saving}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate text-primary">{board.name}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-quaternary">
                                  <span className="font-mono text-[11px]">{board.board_id.slice(0, 8)}…</span>
                                  {inOtherGroup && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-warning/10 text-warning border border-warning/25">
                                      in another group
                                    </span>
                                  )}
                                </div>
                              </div>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {error && <p className="text-sm text-brand-600">{error}</p>}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.push(`/board-groups/${groupId ?? ''}`)}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-70 text-quaternary bg-transparent border border-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-50 bg-brand-50 text-white"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
