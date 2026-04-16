import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import ogs from 'open-graph-scraper'

export const dynamic = 'force-dynamic'

// POST /api/conversations/{id}/messages/{messageId}/link-preview
// Background route: extracts OG metadata from message text, PATCHes message row.
// Called fire-and-forget after a text message containing a URL is sent.
// Supabase Realtime broadcasts the UPDATE so the UI transitions from TextBubble to LinkPreviewBubble.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { id: conversationId, messageId } = await params

  const serviceClient = createServiceRoleClient()

  // Fetch the message to get its text
  const { data: msg, error: fetchErr } = await serviceClient
    .from('messages')
    .select('text, content_type')
    .eq('message_id', messageId)
    .eq('conversation_id', conversationId)
    .single()

  if (fetchErr || !msg?.text) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  }

  // Extract first URL from text
  const urlMatch = msg.text.match(/https?:\/\/[^\s]+/)
  if (!urlMatch) {
    return NextResponse.json({ error: 'No URL found in message' }, { status: 400 })
  }

  const targetUrl = urlMatch[0]

  try {
    const { result } = await ogs({ url: targetUrl, timeout: 8000 })

    const ogTitle = result.ogTitle ?? null
    const ogDescription = result.ogDescription ?? null
    const ogImageUrl = result.ogImage?.[0]?.url ?? null
    const ogSiteName = result.ogSiteName ?? null

    // Only PATCH if we got at least a title or image
    if (!ogTitle && !ogImageUrl) {
      return NextResponse.json({ skipped: true, reason: 'No OG data found' })
    }

    const { error: patchErr } = await serviceClient
      .from('messages')
      .update({
        content_type: 'link',
        og_title: ogTitle,
        og_description: ogDescription,
        og_image_url: ogImageUrl,
        og_site_name: ogSiteName,
        og_url: targetUrl,
      })
      .eq('message_id', messageId)

    if (patchErr) {
      return NextResponse.json({ error: patchErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, og_title: ogTitle })
  } catch (err) {
    // OG scraping failure is non-fatal — message stays as text
    const message = err instanceof Error ? err.message : 'OG scraping failed'
    return NextResponse.json({ skipped: true, reason: message })
  }
}
