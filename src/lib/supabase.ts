import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Browser client (singleton) — used in client components and hooks
let browserClient: SupabaseClient | null = null

export function createBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  browserClient = createClient(url, anonKey, {
    realtime: {
      params: { eventsPerSecond: 10 }
    }
  })

  return browserClient
}

// Server client (new instance per request) — used in server components, API routes, server actions
export function createServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false }
  })
}
