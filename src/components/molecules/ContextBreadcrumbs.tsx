'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface SystemEvent {
  description: string
  created_at: string
}

interface ContextBreadcrumbsProps {
  events: SystemEvent[]
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return `${diffD}d ago`
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  color: 'var(--text-muted)',
}

export function ContextBreadcrumbs({ events }: ContextBreadcrumbsProps) {
  const [expanded, setExpanded] = useState(false)

  const ChevronIcon = expanded ? ChevronUp : ChevronDown

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '16px' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        aria-label={expanded ? 'Collapse system events' : 'Expand system events'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          width: '100%',
          justifyContent: 'space-between',
        }}
      >
        <span style={sectionLabelStyle}>SYSTEM EVENTS</span>
        <ChevronIcon size={14} style={{ color: 'var(--text-muted)' }} />
      </button>

      {expanded && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {events.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No system events recorded.
            </div>
          ) : (
            events.map((event, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  fontStyle: 'italic',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                  lineHeight: 1.4,
                }}>
                  [System: {event.description}]
                </span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-body)',
                  flexShrink: 0,
                }}>
                  {relativeTime(event.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
