'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { ChatParticipantRow } from '@/types/chat'

interface MyParticipantContextValue {
  participant: ChatParticipantRow | null
  loading: boolean
  error: string | null
}

const MyParticipantContext = createContext<MyParticipantContextValue>({
  participant: null,
  loading: true,
  error: null,
})

/**
 * Bootstrap Supabase Auth session in the browser if missing.
 * Required for Realtime postgres_changes — RLS checks auth.uid()
 * which returns NULL without a session, silently blocking all events.
 */
async function ensureSupabaseSession(): Promise<void> {
  const supabase = createBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return // already authenticated

  const res = await fetch('/api/auth/session')
  if (!res.ok) return // middleware rejected or server error — non-fatal

  const tokens = await res.json()
  if (tokens.access_token && tokens.refresh_token) {
    await supabase.auth.setSession({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    })
  }
}

export function MyParticipantProvider({ children }: { children: ReactNode }) {
  const [participant, setParticipant] = useState<ChatParticipantRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    // 1. Bootstrap Supabase Auth session (needed for Realtime RLS)
    // 2. Then fetch Joan's participant via API
    ensureSupabaseSession()
      .catch(() => {}) // non-fatal — Realtime won't work but API routes still function
      .then(() => fetch('/api/my-participant'))
      .then((res) => {
        if (!res || !res.ok) throw new Error('Participant not found')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setParticipant(data as ChatParticipantRow)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load participant')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [])

  return (
    <MyParticipantContext.Provider value={{ participant, loading, error }}>
      {children}
    </MyParticipantContext.Provider>
  )
}

export function useMyParticipant(): MyParticipantContextValue {
  return useContext(MyParticipantContext)
}
