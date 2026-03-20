import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CLAWHUB_BASE = 'https://clawhub.ai'

export async function GET(request: NextRequest) {
  const slug = new URL(request.url).searchParams.get('slug')?.trim() ?? ''

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

  // Sanitize slug — only allow alphanumeric, hyphen, underscore, slash, dot
  if (!/^[a-zA-Z0-9_.\-/]+$/.test(slug)) {
    return NextResponse.json({ error: 'invalid slug' }, { status: 400 })
  }

  try {
    const url = `${CLAWHUB_BASE}/api/v1/skills/${encodeURIComponent(slug)}/file?path=SKILL.md`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'openclaw-office/1.0' },
    })

    if (!res.ok) {
      return NextResponse.json({ content: null }, { status: 200 })
    }

    // ClawHub file endpoint: response shape is uncertain (text/plain or { content: string })
    // Handle both gracefully
    const contentType = res.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const json = await res.json()
      const content: string | null = typeof json.content === 'string' ? json.content : null
      return NextResponse.json({ content })
    }

    // Assume text/plain
    const content = await res.text()
    return NextResponse.json({ content: content || null })
  } catch {
    return NextResponse.json({ content: null }, { status: 200 })
  }
}
