import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

type RouteParams = { params: Promise<{ id: string; filterId: string }> }

function errorResponse(
  status: number,
  message: string,
  details?: string,
  hint?: string,
  code?: string
) {
  return NextResponse.json({ message, details, hint, code }, { status })
}

// DELETE /api/boards/[id]/filters/[filterId] — delete a saved filter
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { filterId } = await params
  const client = createServiceRoleClient()

  const { error } = await client
    .from('saved_filters')
    .delete()
    .eq('filter_id', filterId)

  if (error) {
    return errorResponse(500, error.message, error.details, error.hint, error.code)
  }

  return new NextResponse(null, { status: 204 })
}
