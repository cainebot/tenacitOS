import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const clientId = process.env.OPENAI_CLIENT_ID
  const redirectUri = process.env.OPENAI_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'OpenAI OAuth not configured. Set OPENAI_CLIENT_ID and OPENAI_REDIRECT_URI.' },
      { status: 501 }
    )
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openai',
  })

  const authorizeUrl = `https://auth.openai.com/oauth2/authorize?${params.toString()}`

  return NextResponse.redirect(authorizeUrl)
}
