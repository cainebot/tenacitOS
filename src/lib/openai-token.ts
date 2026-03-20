import { NextRequest } from 'next/server'

/**
 * Returns the OpenAI API token to use for LLM calls.
 * Priority: OPENAI_API_KEY env var → httpOnly cookie 'openai_token' → null
 *
 * Using an async function signature for future-proofing (e.g. token refresh).
 */
export async function getOpenAIToken(request: NextRequest): Promise<string | null> {
  // 1. Server-side env var (highest priority — works without OAuth)
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY
  }

  // 2. OAuth token from httpOnly cookie
  const cookieToken = request.cookies.get('openai_token')?.value
  if (cookieToken) {
    return cookieToken
  }

  return null
}
