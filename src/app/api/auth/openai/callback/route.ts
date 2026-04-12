import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.json(
      { error: `OpenAI OAuth error: ${error}` },
      { status: 400 }
    )
  }

  if (!code) {
    return NextResponse.json(
      { error: 'Missing authorization code' },
      { status: 400 }
    )
  }

  const clientId = process.env.OPENAI_CLIENT_ID
  const clientSecret = process.env.OPENAI_CLIENT_SECRET
  const redirectUri = process.env.OPENAI_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: 'OpenAI OAuth not configured on server' },
      { status: 501 }
    )
  }

  // Exchange authorization code for access token
  let accessToken: string
  try {
    const tokenRes = await fetch('https://auth.openai.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    })

    if (!tokenRes.ok) {
      const text = await tokenRes.text()
      // Log full body server-side for debugging; never expose to browser (CR-02).
      console.error('[oauth-callback] Token exchange failed:', tokenRes.status, text)
      return NextResponse.json(
        { error: 'Token exchange failed. Please try reconnecting.' },
        { status: 502 }
      )
    }

    const data = await tokenRes.json()
    accessToken = data.access_token as string

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Token response missing access_token' },
        { status: 502 }
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Token exchange request failed: ${message}` },
      { status: 502 }
    )
  }

  // Phase 103 (OAUTH-03, Pitfall 3): Persist token status to Supabase
  // so frontend can detect renewal via Realtime/polling and dismiss banner.
  try {
    const serviceClient = createServiceRoleClient()
    await serviceClient.from('provider_token_status').upsert(
      {
        provider: 'openai',
        status: 'connected',
        last_refreshed: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider' }
    )
  } catch (upsertErr) {
    // Non-fatal: cookie still works, but banner won't auto-dismiss
    console.error('[oauth-callback] Failed to update provider_token_status:', upsertErr)
  }

  // Store token in httpOnly cookie — 30 days
  const response = NextResponse.redirect(new URL('/', request.url))
  response.cookies.set('openai_token', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 2592000, // 30 days in seconds
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  })

  return response
}
