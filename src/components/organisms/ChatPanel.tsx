'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, Plus, ChevronUp } from 'lucide-react'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import type { AgentMessageRow } from '@/types/supabase'

// ---- Types ----

interface TopicInfo {
  name: string
  unread_count: number
}


export interface ChatPanelProps {
  agentId: string
  agentName: string
}

// ---- Helpers ----

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return `${diffD}d ago`
}

function channelBadge(channel: AgentMessageRow['channel']): { label: string; bg: string; color: string } {
  switch (channel) {
    case 'web':
      return { label: 'WEB', bg: 'rgba(10,132,255,0.15)', color: '#0A84FF' }
    case 'telegram':
      return { label: 'TG', bg: 'rgba(175,82,222,0.15)', color: '#AF52DE' }
    case 'tui':
      return { label: 'TUI', bg: 'rgba(50,215,75,0.15)', color: '#32D74B' }
    default:
      return { label: (channel as string).toUpperCase(), bg: 'rgba(82,82,82,0.12)', color: 'var(--text-muted)' }
  }
}

// ---- Component ----

export function ChatPanel({ agentId, agentName }: ChatPanelProps) {
  const [activeTopic, setActiveTopic] = useState('general')
  const [topics, setTopics] = useState<TopicInfo[]>([{ name: 'general', unread_count: 0 }])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, loading, error, sendMessage, loadMore, hasMore, markAsRead } =
    useRealtimeMessages({ agentId, topic: activeTopic })

  // Fetch topics
  const fetchTopics = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/messages/topics`)
      if (!res.ok) return
      const json: { topics: TopicInfo[] } = await res.json()
      // Ensure 'general' is always first
      const list = [...json.topics]
      if (!list.some((t) => t.name === 'general')) {
        list.unshift({ name: 'general', unread_count: 0 })
      } else {
        const idx = list.findIndex((t) => t.name === 'general')
        if (idx > 0) {
          const [gen] = list.splice(idx, 1)
          list.unshift(gen)
        }
      }
      setTopics(list)
    } catch {
      // silently fail
    }
  }, [agentId])

  useEffect(() => {
    fetchTopics()
  }, [fetchTopics, activeTopic, messages.length])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-mark unread agent messages as read
  useEffect(() => {
    const unread = messages
      .filter((m) => m.sender_type === 'agent' && m.read_at === null)
      .map((m) => m.message_id)
    if (unread.length > 0) {
      markAsRead(unread)
    }
  }, [messages, markAsRead])

  // Handle send
  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await sendMessage(text)
      setInputText('')
    } catch {
      // Could show toast here in future
    } finally {
      setSending(false)
    }
  }, [inputText, sending, sendMessage])

  // Handle keyboard in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Handle text change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value)
  }

  // New topic prompt
  const handleNewTopic = () => {
    const name = window.prompt('New topic name:')
    if (!name || !name.trim()) return
    const slug = name.trim().toLowerCase().replace(/\s+/g, '-')
    setTopics((prev) => {
      if (prev.some((t) => t.name === slug)) return prev
      return [...prev, { name: slug, unread_count: 0 }]
    })
    setActiveTopic(slug)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      {/* Topic selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto',
          flexShrink: 0,
        }}
      >
        {topics.map((t) => {
          const isActive = t.name === activeTopic
          return (
            <button
              key={t.name}
              onClick={() => setActiveTopic(t.name)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 10px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: isActive ? 600 : 500,
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {t.name}
              {t.unread_count > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: isActive ? 'rgba(255,255,255,0.3)' : 'var(--accent)',
                    color: '#fff',
                    fontSize: '8px',
                    fontWeight: 700,
                  }}
                >
                  {t.unread_count > 9 ? '9+' : t.unread_count}
                </span>
              )}
            </button>
          )
        })}
        <button
          onClick={handleNewTopic}
          title="New topic"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Message list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          minHeight: 0,
        }}
      >
        {/* Load more */}
        {hasMore && (
          <button
            onClick={loadMore}
            style={{
              alignSelf: 'center',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 12px',
              borderRadius: '9999px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            <ChevronUp size={12} />
            Load older
          </button>
        )}

        {loading && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>
            Loading messages...
          </div>
        )}

        {error && (
          <div style={{ fontSize: '11px', color: 'var(--negative, #FF453A)', textAlign: 'center', padding: '8px 0' }}>
            {error}
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>
            No messages yet in #{activeTopic}. Send one below.
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.sender_type === 'user'
          const badge = channelBadge(m.channel)
          const senderLabel = isUser ? 'You' : agentName
          return (
            <div key={m.message_id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {/* Sender label */}
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isUser ? 'var(--accent)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {senderLabel}
              </span>

              {/* Message text */}
              <span
                style={{
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}
              >
                {m.text}
              </span>

              {/* Footer: channel badge + timestamp */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    background: badge.bg,
                    color: badge.color,
                  }}
                >
                  {badge.label}
                </span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                  {relativeTime(m.created_at)}
                </span>
              </div>
            </div>
          )
        })}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Send input area */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--surface-elevated, #242424)',
          padding: '10px 16px',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agentName}... (Enter to send, Shift+Enter for new line)`}
            rows={2}
            style={{
              flex: 1,
              fontSize: '13px',
              fontFamily: 'var(--font-body)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              minHeight: '52px',
              maxHeight: '150px',
              resize: 'vertical',
              color: 'var(--text-primary)',
              padding: '8px 10px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || sending}
            aria-label="Send message"
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: inputText.trim() && !sending ? 'pointer' : 'not-allowed',
              color: inputText.trim() && !sending ? 'var(--accent)' : 'var(--text-muted)',
              opacity: inputText.trim() && !sending ? 1 : 0.4,
              flexShrink: 0,
              borderRadius: '6px',
              padding: 0,
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
