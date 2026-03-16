import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase'
import type { SavedFilterRow } from '@/types/workflow'

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

// GET /api/boards/[id]/filters — return saved filters for a board
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const client = createServerClient()

  const { data, error } = await client
    .from('saved_filters')
    .select('*')
    .eq('board_id', id)
    .order('created_at')

  if (error) {
    return errorResponse(500, error.message, error.details, error.hint, error.code)
  }

  return NextResponse.json(data as SavedFilterRow[])
}

// POST /api/boards/[id]/filters — create a saved filter
// Body: { name: string, config: Record<string, unknown> }
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'Invalid JSON body')
  }

  const { name, config } = body as {
    name?: string
    config?: Record<string, unknown>
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return errorResponse(400, 'name is required', undefined, undefined, 'VALIDATION_ERROR')
  }

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return errorResponse(
      400,
      'config is required and must be an object',
      undefined,
      undefined,
      'VALIDATION_ERROR'
    )
  }

  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('saved_filters')
    .insert({ board_id: id, name: name.trim(), config })
    .select()
    .single()

  if (error) {
    return errorResponse(500, error.message, error.details, error.hint, error.code)
  }

  return NextResponse.json(data as SavedFilterRow, { status: 201 })
}
