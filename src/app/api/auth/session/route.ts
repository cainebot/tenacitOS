import { NextResponse } from 'next/server'
import { createServiceRoleClient, createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Joan's email — single-user personal dashboard
const JOAN_EMAIL = 'admin@circos.dev'

/**
 * GET /api/auth/session
 *
 * Returns fresh Supabase Auth tokens for Joan. Called by the browser on mount
 * to bootstrap a Supabase session when one is missing from localStorage.
 *
 * Why: The browser client needs auth.uid() for Supabase Realtime RLS.
 * Without a valid session, postgres_changes subscriptions silently receive
 * zero events because RLS policies check auth.uid() which returns NULL.
 *
 * Flow: admin.generateLink (magic OTP) → verifyOtp → session tokens
 * Protected by: mc_auth cookie (middleware)
 */
export async function GET() {
  const admin = createServiceRoleClient()

  // Step 1: Generate a magic link OTP (does NOT send email)
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: JOAN_EMAIL,
  })

  if (linkError || !linkData?.properties?.email_otp) {
    return NextResponse.json(
      { error: linkError?.message ?? 'Failed to generate OTP' },
      { status: 500 }
    )
  }

  // Step 2: Verify the OTP to get session tokens
  const verifier = createServerClient()
  const { data: otpData, error: otpError } = await verifier.auth.verifyOtp({
    email: JOAN_EMAIL,
    token: linkData.properties.email_otp,
    type: 'email',
  })

  if (otpError || !otpData.session) {
    return NextResponse.json(
      { error: otpError?.message ?? 'Failed to verify OTP' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    access_token: otpData.session.access_token,
    refresh_token: otpData.session.refresh_token,
  })
}
