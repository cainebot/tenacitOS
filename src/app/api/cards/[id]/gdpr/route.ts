import { NextRequest, NextResponse } from 'next/server'
import { gdprAnonymizeCard } from '@/lib/cards'

type RouteParams = { params: Promise<{ id: string }> }

// DELETE /api/cards/[id]/gdpr — GDPR anonymize: remove PII, keep card structure
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    const card = await gdprAnonymizeCard(id)
    return NextResponse.json({
      message: 'Card anonymized per GDPR opt-out',
      card_id: card.card_id,
      state_id: card.state_id,
      labels: card.labels,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (
      (err as { code?: string })?.code === 'PGRST116' ||
      msg.includes('PGRST116')
    ) {
      return NextResponse.json({ message: 'Card not found' }, { status: 404 })
    }
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}
