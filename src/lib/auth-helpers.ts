import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from './supabase'

/**
 * GROUP-08: Resolve the current user's chat_participants row.
 *
 * Strategy:
 * 1. If a `userId` query parameter is provided (Supabase Auth UUID), look up
 *    the participant whose external_id matches that UUID. This makes the API
 *    multi-human-ready without requiring @supabase/ssr or cookie-based auth.
 * 2. Fallback: query the single human participant (backward-compatible for the
 *    current single-user system where mc_auth middleware already verified auth).
 *
 * Note: The current auth system stores the Supabase JWT in browser localStorage
 * (not in HTTP cookies), so server-side extraction of the user UUID requires
 * the caller to pass it explicitly. This is sufficient for GROUP-08 MVP.
 */
export async function resolveCurrentParticipantId(
  request: NextRequest
): Promise<{ participantId: string | null; error: string | null }> {
  const supabase = createServiceRoleClient()

  // Attempt 1: user-aware lookup via userId query param
  const userId = request.nextUrl.searchParams.get('userId')
  if (userId) {
    const { data: userRow, error: userError } = await supabase
      .from('chat_participants')
      .select('participant_id')
      .eq('participant_type', 'human')
      .eq('external_id', userId)
      .single()

    if (!userError && userRow) {
      return { participantId: userRow.participant_id, error: null }
    }
    // userId provided but not found — hard fail (prevents silent fallback to wrong user)
    return { participantId: null, error: 'Participant not found for provided userId' }
  }

  // Fallback: single human participant (backward-compatible)
  const { data: humanRow, error: humanError } = await supabase
    .from('chat_participants')
    .select('participant_id')
    .eq('participant_type', 'human')
    .limit(1)
    .single()

  if (humanError || !humanRow) {
    return { participantId: null, error: 'Human participant not found' }
  }

  return { participantId: humanRow.participant_id, error: null }
}

/**
 * GROUP-08: Resolve the full chat_participants row for the current user.
 * Same lookup strategy as resolveCurrentParticipantId but returns the full row.
 */
export async function resolveCurrentParticipantRow(
  request: NextRequest
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  const supabase = createServiceRoleClient()

  const userId = request.nextUrl.searchParams.get('userId')
  if (userId) {
    const { data, error } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('participant_type', 'human')
      .eq('external_id', userId)
      .single()

    if (!error && data) {
      return { data: data as Record<string, unknown>, error: null }
    }
    return { data: null, error: 'Participant not found for provided userId' }
  }

  // Fallback: single human participant
  const { data, error } = await supabase
    .from('chat_participants')
    .select('*')
    .eq('participant_type', 'human')
    .limit(1)
    .single()

  if (error || !data) {
    return { data: null, error: 'Human participant not found' }
  }

  return { data: data as Record<string, unknown>, error: null }
}
