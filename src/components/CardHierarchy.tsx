'use client'

import type { CardType } from '@/types/workflow'

interface HierarchyEntry {
  card_id: string
  title: string
  card_type: CardType
}

interface ChildEntry extends HierarchyEntry {
  state_id: string
}

interface CardHierarchyProps {
  breadcrumb: HierarchyEntry[]
  parent: { card_id: string; title: string; card_type: CardType } | null
  children: ChildEntry[]
  currentCardType: CardType
  onNavigateToCard: (cardId: string) => void
}

const cardTypeBadgeColors: Record<CardType, { bg: string; text: string }> = {
  epic: { bg: '#7c3aed', text: '#fff' },
  story: { bg: '#16a34a', text: '#fff' },
  task: { bg: '#2563eb', text: '#fff' },
  subtask: { bg: '#6b7280', text: '#fff' },
  bug: { bg: '#dc2626', text: '#fff' },
}

function CardTypeBadge({ type }: { type: CardType }) {
  const colors = cardTypeBadgeColors[type] ?? { bg: '#6b7280', text: '#fff' }
  return (
    <span
      style={{
        display: 'inline-block',
        background: colors.bg,
        color: colors.text,
        borderRadius: '3px',
        padding: '1px 5px',
        fontSize: '10px',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        fontWeight: 500,
        flexShrink: 0,
        lineHeight: 1.4,
      }}
    >
      {type}
    </span>
  )
}

export function CardHierarchy({
  breadcrumb,
  parent,
  children,
  onNavigateToCard,
}: CardHierarchyProps) {
  const hasContent = breadcrumb.length > 0 || parent !== null || children.length > 0

  if (!hasContent) return null

  const linkStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    color: "var(--text-tertiary-600)",
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    fontSize: '12px',
    textDecoration: 'none',
    background: 'none',
    border: 'none',
    padding: 0,
  }

  const linkHoverStyle = (e: React.MouseEvent<HTMLButtonElement>, enter: boolean) => {
    ;(e.currentTarget as HTMLButtonElement).style.color = enter
      ? 'var(--text-primary-900)'
      : 'var(--text-tertiary-600)'
  }

  const sectionStyle: React.CSSProperties = {
    marginBottom: '12px',
    padding: '8px 10px',
    background: 'var(--bg-secondary)',
    border: "1px solid var(--border-primary)",
    borderRadius: '6px',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    fontSize: '11px',
    color: "var(--text-quaternary-500)",
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    marginBottom: '6px',
  }

  return (
    <div style={sectionStyle}>
      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <div style={{ marginBottom: parent || children.length > 0 ? '8px' : 0 }}>
          <div style={labelStyle}>Hierarchy</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
            {breadcrumb.map((entry, idx) => (
              <span key={entry.card_id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {idx > 0 && (
                  <span style={{ color: "var(--text-quaternary-500)", fontSize: '11px' }}>›</span>
                )}
                <button
                  style={linkStyle}
                  onClick={() => onNavigateToCard(entry.card_id)}
                  onMouseEnter={(e) => linkHoverStyle(e, true)}
                  onMouseLeave={(e) => linkHoverStyle(e, false)}
                  title={entry.title}
                >
                  <CardTypeBadge type={entry.card_type} />
                  <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.title}
                  </span>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Parent link */}
      {parent && (
        <div style={{ marginBottom: children.length > 0 ? '8px' : 0 }}>
          <div style={labelStyle}>Parent</div>
          <button
            style={linkStyle}
            onClick={() => onNavigateToCard(parent.card_id)}
            onMouseEnter={(e) => linkHoverStyle(e, true)}
            onMouseLeave={(e) => linkHoverStyle(e, false)}
          >
            <CardTypeBadge type={parent.card_type} />
            <span>{parent.title}</span>
          </button>
        </div>
      )}

      {/* Children */}
      {children.length > 0 && (
        <div>
          <div style={labelStyle}>
            Children ({children.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {children.map((child) => (
              <button
                key={child.card_id}
                style={{
                  ...linkStyle,
                  display: 'flex',
                  width: '100%',
                  textAlign: 'left',
                  padding: '2px 0',
                }}
                onClick={() => onNavigateToCard(child.card_id)}
                onMouseEnter={(e) => linkHoverStyle(e, true)}
                onMouseLeave={(e) => linkHoverStyle(e, false)}
              >
                <CardTypeBadge type={child.card_type} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {child.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
