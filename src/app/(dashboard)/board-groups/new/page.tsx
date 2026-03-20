'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import type { BoardRow } from '@/types/workflow'

export default function NewBoardGroupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [boardSearch, setBoardSearch] = useState('')
  const [selectedBoardIds, setSelectedBoardIds] = useState<Set<string>>(new Set())
  const [boards, setBoards] = useState<BoardRow[]>([])
  const [boardsLoading, setBoardsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/boards')
      .then(r => r.json())
      .then((data: BoardRow[]) => setBoards(data))
      .catch(() => { /* non-blocking */ })
      .finally(() => setBoardsLoading(false))
  }, [])

  const toggleBoard = (id: string) => {
    setSelectedBoardIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filteredBoards = boards.filter(b => {
    const q = boardSearch.trim().toLowerCase()
    return !q || b.name.toLowerCase().includes(q)
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('Group name is required.'); return }

    setSaving(true)
    setError(null)

    try {
      // Create group
      const res = await fetch('/api/board-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, description: description.trim() || undefined }),
      })
      if (!res.ok) {
        const body = await res.json() as { message?: string }
        throw new Error(body.message ?? 'Failed to create group')
      }
      const created = await res.json() as { workflow_id: string }

      // Assign selected boards
      if (selectedBoardIds.size > 0) {
        await Promise.all(
          Array.from(selectedBoardIds).map(bid =>
            fetch(`/api/boards/${bid}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ workflow_id: created.workflow_id }),
            })
          )
        )
      }

      router.push(`/board-groups/${created.workflow_id}`)
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
          <h1 className="text-2xl font-semibold tracking-tight text-primary font-display">
            Create board group
          </h1>
          <p className="mt-1 text-sm text-quaternary">
            Groups help agents discover related work across boards.
          </p>
        </div>
      </div>

      <div className="px-4 py-6 md:px-8 max-w-2xl">
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
                placeholder="e.g. Release hardening"
                disabled={saving}
                className="w-full px-3 py-2 rounded-lg text-sm bg-primary border border-secondary text-primary outline-none"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-primary">
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What ties these boards together? What should agents coordinate on?"
                disabled={saving}
                rows={4}
                className="w-full px-3 py-2 rounded-lg text-sm resize-none bg-primary border border-secondary text-primary outline-none"
              />
            </div>

            {/* Board assignment */}
            <div className="space-y-2 pt-2 border-t border-secondary">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-primary">Boards</label>
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
                {boardsLoading ? (
                  <div className="flex items-center gap-2 px-4 py-4 text-sm text-quaternary">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading boards…
                  </div>
                ) : filteredBoards.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-quaternary">No boards found.</div>
                ) : (
                  <ul className="divide-y divide-border">
                    {filteredBoards.map(board => (
                      <li key={board.board_id} className="px-4 py-3">
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded"
                            checked={selectedBoardIds.has(board.board_id)}
                            onChange={() => toggleBoard(board.board_id)}
                            disabled={saving}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate text-primary">{board.name}</p>
                            {board.description && (
                              <p className="text-xs mt-0.5 truncate text-quaternary">{board.description}</p>
                            )}
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-xs text-quaternary">
                Optional. You can change board membership later in group edit.
              </p>
            </div>

            {error && <p className="text-sm text-brand-600">{error}</p>}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push('/board-groups')}
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
                {saving ? 'Creating…' : 'Create group'}
              </button>
            </div>

            <p className="text-xs text-quaternary border-t border-secondary pt-4">
              Want to assign boards later? Update each board in{' '}
              <Link href="/boards" className="underline hover:opacity-80 text-primary">Boards</Link>{' '}
              and pick this group.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
