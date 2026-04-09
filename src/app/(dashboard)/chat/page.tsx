'use client'

import { Suspense, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useConversations } from '@/features/chat/hooks/use-conversations'
import { ChatListPanel } from '@/features/chat/components/chat-list-panel'
import { ChatViewPanel, type ChatView } from '@/features/chat/components/chat-view-panel'

function ChatPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    searchParams.get('conversation')
  )
  const [view, setView] = useState<ChatView>('conversations')
  const { channels, dms, loading, error, refetch } = useConversations()

  const allConversations = [...channels, ...dms]
  const activeConversation = allConversations.find(
    (c) => c.conversation_id === activeConversationId
  )

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id)
    setView('conversations')
    router.replace(`/chat?conversation=${id}`, { scroll: false })
  }, [router])

  const handleConversationCreated = useCallback((id: string) => {
    setActiveConversationId(id)
    setView('conversations')
    void refetch()
    router.replace(`/chat?conversation=${id}`, { scroll: false })
  }, [router, refetch])

  const handleBack = useCallback(() => {
    setView('conversations')
  }, [])

  return (
    <div className="flex h-full w-full gap-2 p-2">
      {/* Left panel — conversation list */}
      <aside className="w-[290px] shrink-0 overflow-hidden rounded-xl bg-primary shadow-lg">
        <ChatListPanel
          channels={channels}
          dms={dms}
          loading={loading}
          error={error}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewDm={() => setView('new-dm')}
          onNewChannel={() => setView('new-channel')}
          onRetry={refetch}
        />
      </aside>

      {/* Right panel — active conversation */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[rgba(0,0,0,0.08)] bg-secondary shadow-lg">
        <ChatViewPanel
          activeConversationId={activeConversationId}
          conversation={activeConversation}
          channels={channels}
          view={view}
          onConversationCreated={handleConversationCreated}
          onBack={handleBack}
          refetch={refetch}
        />
      </section>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageInner />
    </Suspense>
  )
}
