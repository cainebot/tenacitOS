'use client'

import { useEffect, useState } from 'react'
import type { AgentRow, AgentStatus } from '@/types/supabase'

// ---------- Props ----------

export interface AgentPanelProps {
  agent: AgentRow
  position: { x: number; y: number }
  onClose: () => void
}

// ---------- Status color map ----------

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: '#22c55e',
  working: '#3b82f6',
  thinking: '#8b5cf6',
  error: '#ef4444',
  offline: '#6b7280',
  queued: '#eab308',
}

// ---------- Helpers ----------

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  if (diff < 0) return 'just now'
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function uptime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime()
  if (diff < 0) return '0m'
  const totalMinutes = Math.floor(diff / 60000)
  if (totalMinutes < 60) return `${totalMinutes}m`
  const hours = Math.floor(totalMinutes / 60)
  if (hours < 24) return `${hours}h ${totalMinutes % 60}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

// ---------- Emoji background colors ----------

const AVATAR_BG_COLORS = [
  '#e0e7ff', '#fce7f3', '#d1fae5', '#fef3c7', '#ede9fe', '#dbeafe',
  '#fecdd3', '#ccfbf1', '#e0f2fe', '#f3e8ff',
]

function avatarBgColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_BG_COLORS[Math.abs(hash) % AVATAR_BG_COLORS.length]
}

// ---------- Styles ----------

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 1000,
  },
  card: {
    position: 'absolute' as const,
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    padding: '20px',
    minWidth: '280px',
    maxWidth: '320px',
    zIndex: 1001,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#1f2937',
  },
  closeBtn: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    width: '28px',
    height: '28px',
    border: 'none',
    background: '#f3f4f6',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    flexShrink: 0,
  },
  name: {
    fontWeight: 700,
    fontSize: '16px',
    margin: 0,
    lineHeight: 1.2,
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '4px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusText: {
    fontSize: '13px',
    textTransform: 'capitalize' as const,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px 16px',
    margin: '16px 0',
    padding: '12px 0',
    borderTop: '1px solid #f3f4f6',
    borderBottom: '1px solid #f3f4f6',
  },
  infoLabel: {
    fontSize: '11px',
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '2px',
  },
  infoValue: {
    fontSize: '13px',
    color: '#374151',
    fontWeight: 500,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
  },
  primaryBtn: {
    flex: 1,
    padding: '8px 16px',
    background: '#7c3aed',
    color: '#ffffff',
    border: 'none',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  iconBtn: {
    width: '36px',
    height: '36px',
    border: 'none',
    background: '#f3f4f6',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    color: '#6b7280',
  },
}

// ---------- Component ----------

export default function AgentPanel({ agent, position, onClose }: AgentPanelProps) {
  const [refreshKey, setRefreshKey] = useState(0)

  // Refresh relative times every 30s
  useEffect(() => {
    const interval = setInterval(() => setRefreshKey((k) => k + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  // Clamp card position to viewport
  const cardWidth = 320
  const cardHeight = 360
  const margin = 16
  const clampedX = Math.min(
    Math.max(position.x + 20, margin),
    typeof window !== 'undefined' ? window.innerWidth - cardWidth - margin : position.x + 20,
  )
  const clampedY = Math.min(
    Math.max(position.y - cardHeight / 2, margin),
    typeof window !== 'undefined' ? window.innerHeight - cardHeight - margin : position.y,
  )

  const statusColor = STATUS_COLORS[agent.status] || '#6b7280'

  return (
    // Transparent overlay to catch clicks outside panel
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={{ ...styles.card, left: clampedX, top: clampedY }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          style={styles.closeBtn}
          onClick={onClose}
          aria-label="Close panel"
          onMouseEnter={(e) => { (e.target as HTMLElement).style.background = '#e5e7eb' }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.background = '#f3f4f6' }}
        >
          &#x2715;
        </button>

        {/* Header: avatar + name + status */}
        <div style={styles.header}>
          <div style={{ ...styles.avatar, background: avatarBgColor(agent.name) }}>
            {agent.emoji || agent.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={styles.name}>{agent.name}</p>
            <div style={styles.statusRow}>
              <span style={{ ...styles.statusDot, background: statusColor }} />
              <span style={{ ...styles.statusText, color: statusColor }}>
                {agent.status}
              </span>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div style={styles.infoGrid} key={refreshKey}>
          <div>
            <div style={styles.infoLabel}>Node</div>
            <div style={styles.infoValue}>{agent.node_id.substring(0, 8)}</div>
          </div>
          <div>
            <div style={styles.infoLabel}>Current Task</div>
            <div style={styles.infoValue}>{agent.current_task_id || 'None'}</div>
          </div>
          <div>
            <div style={styles.infoLabel}>Last Activity</div>
            <div style={styles.infoValue}>{relativeTime(agent.last_activity)}</div>
          </div>
          <div>
            <div style={styles.infoLabel}>Uptime</div>
            <div style={styles.infoValue}>{uptime(agent.created_at)}</div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={styles.actions}>
          <button
            style={styles.primaryBtn}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = '#6d28d9' }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = '#7c3aed' }}
          >
            View Logs
          </button>
          <button
            style={styles.iconBtn}
            aria-label="Settings"
            title="Settings"
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = '#e5e7eb' }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = '#f3f4f6' }}
          >
            &#x2699;
          </button>
          <button
            style={styles.iconBtn}
            aria-label="More options"
            title="More"
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = '#e5e7eb' }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = '#f3f4f6' }}
          >
            &#x22EF;
          </button>
        </div>
      </div>
    </div>
  )
}
