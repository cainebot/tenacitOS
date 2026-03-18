'use client'

interface AttentionBadgeProps {
  total: number
  failedTasks: number
  unreadMessages: number
  attentionCards: number
}

function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? singular : pluralForm
}

export function AttentionBadge({ total, failedTasks, unreadMessages, attentionCards }: AttentionBadgeProps) {
  if (total === 0) return null

  const parts: string[] = []
  if (failedTasks > 0) parts.push(`${failedTasks} failed ${plural(failedTasks, 'task', 'tasks')}`)
  if (unreadMessages > 0) parts.push(`${unreadMessages} unread ${plural(unreadMessages, 'message', 'messages')}`)
  if (attentionCards > 0) parts.push(`${attentionCards} ${plural(attentionCards, 'card needs', 'cards need')} attention`)
  const tooltipText = parts.join(', ')

  return (
    <span
      title={tooltipText}
      aria-label={`${total} attention ${plural(total, 'item', 'items')}`}
      style={{
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        background: 'var(--accent)',
        color: '#fff',
        fontSize: '10px',
        fontWeight: 700,
        fontFamily: 'var(--font-body)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        lineHeight: 1,
        cursor: 'default',
      }}
    >
      {total > 9 ? '9+' : total}
    </span>
  )
}
