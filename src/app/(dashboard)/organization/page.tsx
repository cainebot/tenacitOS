'use client'

// Organization roster — real-time presence of every agent on the mesh.
//
// Originally lived under /office (Phase 69 Plan 04 stub). Moved here so
// /office stays exclusively for the upcoming pixel-art Phaser map; the
// roster grid belongs to Organization conceptually.
//
// Per SECURITY T3: agent `name` is rendered as a React text child via
// `@circos/ui` AvatarLabelGroup — no dangerouslySetInnerHTML, no markdown
// parser on the name string.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Building06 } from '@untitledui/icons'
import {
  PageHeader,
  AvatarLabelGroup,
  EmptyState,
  LoadingIndicator,
  cx,
} from '@circos/ui'
import { useAgentPresence, type AgentPresence } from '@/hooks/useAgentPresence'
import { officeEvents, type OfficeEvent } from '@/lib/office-events'

const ORG_COPY = {
  title: 'Organization',
  subtitle: 'Real-time roster of every agent on the mesh.',
  loading: 'Connecting to presence bus…',
  emptyTitle: 'No agents online yet',
  emptyDescription:
    'Once a `create_agent` approval lands, the roster updates automatically.',
} as const

const DESPAWN_FADE_MS = 500

function PresenceTile({ entry }: { entry: AgentPresence }) {
  const [fadingOut, setFadingOut] = useState(false)

  useEffect(() => {
    const off = officeEvents.on((event: OfficeEvent) => {
      if (event.type === 'despawn' && event.agent_id === entry.agent_id) {
        setFadingOut(true)
      }
    })
    return off
  }, [entry.agent_id])

  return (
    <div
      className={cx(
        'flex items-center gap-3 rounded-xl border border-secondary bg-primary p-4',
        'transition-opacity duration-500 ease-linear',
        fadingOut ? 'opacity-0' : 'opacity-100',
      )}
      data-agent-id={entry.agent_id}
    >
      <AvatarLabelGroup
        size="md"
        src={entry.avatar_url ?? undefined}
        alt={entry.name}
        initials={entry.name.slice(0, 2).toUpperCase()}
        title={entry.name}
        subtitle={entry.status}
      />
    </div>
  )
}

export default function OrganizationPage() {
  const { presence, loading, error } = useAgentPresence()

  const [lingeringById, setLingeringById] = useState<Map<string, AgentPresence>>(
    () => new Map(),
  )
  const timersRef = useRef<Map<string, number>>(new Map())
  const lastPresenceRef = useRef<Map<string, AgentPresence>>(new Map())

  useEffect(() => {
    const nextById = new Map<string, AgentPresence>()
    for (const p of presence) nextById.set(p.agent_id, p)

    const prevById = lastPresenceRef.current

    setLingeringById((prev) => {
      if (prev.size === 0) return prev
      let changed = false
      const next = new Map(prev)
      for (const id of nextById.keys()) {
        if (next.delete(id)) changed = true
        const existing = timersRef.current.get(id)
        if (existing !== undefined) {
          window.clearTimeout(existing)
          timersRef.current.delete(id)
        }
      }
      return changed ? next : prev
    })

    for (const [id, row] of prevById) {
      if (nextById.has(id)) continue
      setLingeringById((prev) => {
        if (prev.has(id)) return prev
        const next = new Map(prev)
        next.set(id, row)
        return next
      })
      const existing = timersRef.current.get(id)
      if (existing !== undefined) window.clearTimeout(existing)
      const timer = window.setTimeout(() => {
        setLingeringById((prev) => {
          if (!prev.has(id)) return prev
          const next = new Map(prev)
          next.delete(id)
          return next
        })
        timersRef.current.delete(id)
      }, DESPAWN_FADE_MS)
      timersRef.current.set(id, timer)
    }

    lastPresenceRef.current = nextById
  }, [presence])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const timer of timers.values()) window.clearTimeout(timer)
      timers.clear()
    }
  }, [])

  const rows = useMemo<AgentPresence[]>(() => {
    const byId = new Map<string, AgentPresence>()
    for (const [id, row] of lingeringById) byId.set(id, row)
    for (const p of presence) byId.set(p.agent_id, p)
    return Array.from(byId.values())
  }, [presence, lingeringById])

  return (
    <section className="flex w-full flex-col gap-6 px-6">
      <PageHeader
        title={ORG_COPY.title}
        description={ORG_COPY.subtitle}
        breadcrumbs={[
          { label: '', href: '/' },
          { label: ORG_COPY.title },
        ]}
      />

      {loading && rows.length === 0 && (
        <div className="flex items-center gap-3 text-tertiary">
          <LoadingIndicator size="sm" />
          <span>{ORG_COPY.loading}</span>
        </div>
      )}

      {error && (
        <div
          className="rounded-lg border border-error bg-error-primary px-4 py-3 text-error-primary"
          role="alert"
        >
          {error}
        </div>
      )}

      {!loading && rows.length === 0 && !error && (
        <EmptyState
          icon={<Building06 />}
          title={ORG_COPY.emptyTitle}
          description={ORG_COPY.emptyDescription}
        />
      )}

      {rows.length > 0 && (
        <div
          data-testid="organization-roster"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {rows.map((entry) => (
            <PresenceTile key={entry.agent_id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  )
}
