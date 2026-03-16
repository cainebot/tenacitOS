import { NextRequest, NextResponse } from 'next/server'
import { reorderColumns } from '@/lib/boards'

type RouteParams = { params: Promise<{ id: string }> }

function errorResponse(
  status: number,
  message: string,
  details?: string,
  hint?: string,
  code?: string
) {
  return NextResponse.json({ message, details, hint, code }, { status })
}

// PATCH /api/boards/[id]/columns/reorder — reorder columns
// Body: { column_ids: string[] } — each column gets position = array index
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'Invalid JSON body')
  }

  const { column_ids } = body as { column_ids?: string[] }

  if (!column_ids || !Array.isArray(column_ids) || column_ids.length === 0) {
    return errorResponse(
      400,
      'column_ids is required and must be a non-empty array',
      undefined,
      undefined,
      'VALIDATION_ERROR'
    )
  }

  try {
    await reorderColumns(id, column_ids)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}
