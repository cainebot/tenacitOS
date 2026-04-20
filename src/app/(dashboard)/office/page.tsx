'use client'

// Phase 69 Plan 04 — /office stub page (SPEC-69-OFFICE-02).
//
// Preview surface: the full pixel-office Phaser rebuild is deferred to a
// future v1.10+ phase (PLAN §Out of scope). This page satisfies UI-02's
// bus contract — spawn/despawn events propagate within 2 s of a DB write,
// no reload required — by rendering a placeholder grid of AvatarLabelGroup
// entries keyed by agent_id with a Tailwind fade animation.
//
// Per SECURITY T3: agent `name` is rendered as a React text child via
// `@circos/ui` AvatarLabelGroup — no dangerouslySetInnerHTML, no markdown
// parser on the name string.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Building06 } from '@untitledui/icons'
import {
  Badge,
  PageHeader,
  AvatarLabelGroup,
  EmptyState,
  LoadingIndicator,
  cx,
} from '@circos/ui'
import { useAgentPresence, type AgentPresence } from '@/hooks/useAgentPresence'
import { officeEvents, type OfficeEvent } from '@/lib/office-events'

// Copy is co-located (Phase 69 string-table-ready pattern per discuss Q10).
const OFFICE_COPY = {
  title: 'Pixel office',
  subtitle: 'Real-time presence of every agent on the mesh.',
  banner: 'Preview — full pixel office coming in a future phase',
  loading: 'Connecting to presence bus…',
  emptyTitle: 'No agents online yet',
  emptyDescription:
    'Once a `create_agent` approval lands, the roster updates automatically.',
} as const

/** How long the despawn fade runs before the entry unmounts. */
const DESPAWN_FADE_MS = 500

/**
 * Single presence tile. Subscribes to the bus for its own agent_id; when
 * a `despawn` arrives, sets local `fadingOut` so the tile fades to 0
 * opacity before the parent drops the row on the next render pass.
 */
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

export default function OfficePage() {
  const { presence, loading, error } = useAgentPresence()

  // Lingering rows: entries whose agent_id left `presence` but we keep
  // mounted for DESPAWN_FADE_MS so the PresenceTile fade-out runs.
  // Keyed by agent_id → snapshot at the moment it left.
  const [lingeringById, setLingeringById] = useState<Map<string, AgentPresence>>(
    () => new Map(),
  )
  const timersRef = useRef<Map<string, number>>(new Map())
  // Shadow of the last observed presence list — lets us recover each
  // departed entry's snapshot without storing it in redundant refs.
  const lastPresenceRef = useRef<Map<string, AgentPresence>>(new Map())

  // Single diff pass per `presence` change:
  //  (1) entries that appeared → cancel any linger timer for them
  //  (2) entries that disappeared → push snapshot into `lingeringById`,
  //      start a DESPAWN_FADE_MS timer to drop them afterwards
  useEffect(() => {
    const nextById = new Map<string, AgentPresence>()
    for (const p of presence) nextById.set(p.agent_id, p)

    const prevById = lastPresenceRef.current

    // (1) Respawn path — cancel linger for any id that's back.
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

    // (2) Despawn path — snapshot + schedule unmount.
    for (const [id, row] of prevById) {
      if (nextById.has(id)) continue
      // Record the row into linger state so it keeps rendering at opacity 0.
      setLingeringById((prev) => {
        if (prev.has(id)) return prev
        const next = new Map(prev)
        next.set(id, row)
        return next
      })
      // Cancel any prior timer first, then schedule new one.
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

  // Cleanup all timers on unmount.
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const timer of timers.values()) window.clearTimeout(timer)
      timers.clear()
    }
  }, [])

  // Render list = lingering rows (opacity 0 via PresenceTile) + live
  // presence (opacity 1). Presence wins on collision.
  const rows = useMemo<AgentPresence[]>(() => {
    const byId = new Map<string, AgentPresence>()
    for (const [id, row] of lingeringById) byId.set(id, row)
    for (const p of presence) byId.set(p.agent_id, p)
    return Array.from(byId.values())
  }, [presence, lingeringById])

  return (
    <section className="flex w-full flex-col gap-6 px-6">
      <PageHeader
        title={OFFICE_COPY.title}
        description={OFFICE_COPY.subtitle}
        breadcrumbs={[
          { label: '', href: '/' },
          { label: OFFICE_COPY.title },
        ]}
      />

      <div className="flex">
        <Badge color="warning" type="pill-color" size="md">
          {OFFICE_COPY.banner}
        </Badge>
      </div>

      {loading && rows.length === 0 && (
        <div className="flex items-center gap-3 text-tertiary">
          <LoadingIndicator size="sm" />
          <span>{OFFICE_COPY.loading}</span>
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
          title={OFFICE_COPY.emptyTitle}
          description={OFFICE_COPY.emptyDescription}
        />
      )}

      {rows.length > 0 && (
        <div
          data-testid="office-placeholder"
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
