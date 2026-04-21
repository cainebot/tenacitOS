import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Browser client (singleton) — used in client components and hooks
let browserClient: SupabaseClient | null = null

export function createBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    // Env vars may be missing during SSR or if Turbopack hasn't inlined them yet.
    // Return a non-singleton placeholder — will be replaced once env vars are available.
    console.warn('[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not available yet')
    return createClient('https://placeholder.supabase.co', 'placeholder', {
      auth: { persistSession: false },
    })
  }

  browserClient = createClient(url, anonKey, {
    global: {
      // Bypass browser HTTP cache — ensures Supabase REST queries always hit the network.
      // Without this, Cmd+R serves stale responses (e.g. old map versions after publish).
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
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

// Service role client — bypasses RLS for admin write operations (departments, agent profile edits)
// Requires SUPABASE_SERVICE_ROLE_KEY env var (NOT prefixed with NEXT_PUBLIC_ — server-side only)
export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }
  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY — add it to control-panel/.env.local (Supabase Dashboard > Settings > API > service_role)'
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false }
  })
}
