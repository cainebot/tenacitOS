import { NextRequest, NextResponse } from 'next/server'
import { getFieldDefinitions, createFieldDefinition } from '@/lib/custom-fields'
import type { CardType, CustomFieldType } from '@/types/project'

type RouteParams = { params: Promise<{ id: string }> }

const VALID_FIELD_TYPES: CustomFieldType[] = [
  'text', 'number', 'date', 'url', 'email', 'select', 'multi_select', 'checkbox',
]

const VALID_CARD_TYPES: CardType[] = ['epic', 'story', 'task', 'subtask', 'bug']

function errorResponse(
  status: number,
  message: string,
  details?: string,
  hint?: string,
  code?: string
) {
  return NextResponse.json({ message, details, hint, code }, { status })
}

// GET /api/projects/[id]/fields — return custom field definitions for a project
// Query param: card_type (optional) — filter to fields scoped to that card_type + global fields
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const cardTypeParam = searchParams.get('card_type')

  let cardType: CardType | undefined
  if (cardTypeParam) {
    if (!VALID_CARD_TYPES.includes(cardTypeParam as CardType)) {
      return errorResponse(400, `Invalid card_type: ${cardTypeParam}`, undefined, undefined, 'VALIDATION_ERROR')
    }
    cardType = cardTypeParam as CardType
  }

  try {
    const fields = await getFieldDefinitions(id, cardType)
    return NextResponse.json(fields)
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}

// POST /api/projects/[id]/fields — create a new custom field definition
// Body: { name, field_type, card_type?, options?, position?, required? }
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'Invalid JSON body')
  }

  const { name, field_type, card_type, options, position, required } = body as {
    name?: string
    field_type?: string
    card_type?: string | null
    options?: unknown
    position?: number
    required?: boolean
  }

  // Validate required fields
  if (!name || typeof name !== 'string' || !name.trim()) {
    return errorResponse(400, 'name is required', undefined, undefined, 'VALIDATION_ERROR')
  }

  if (!field_type) {
    return errorResponse(400, 'field_type is required', undefined, undefined, 'VALIDATION_ERROR')
  }

  if (!VALID_FIELD_TYPES.includes(field_type as CustomFieldType)) {
    return errorResponse(
      400,
      `Invalid field_type: ${field_type}. Must be one of: ${VALID_FIELD_TYPES.join(', ')}`,
      undefined,
      undefined,
      'VALIDATION_ERROR'
    )
  }

  // Validate card_type if provided
  if (card_type != null && !VALID_CARD_TYPES.includes(card_type as CardType)) {
    return errorResponse(400, `Invalid card_type: ${card_type}`, undefined, undefined, 'VALIDATION_ERROR')
  }

  // Validate options for select/multi_select
  if (field_type === 'select' || field_type === 'multi_select') {
    if (!Array.isArray(options) || options.length === 0 || !options.every((o) => typeof o === 'string')) {
      return errorResponse(
        400,
        'options must be a non-empty array of strings for select/multi_select fields',
        undefined,
        undefined,
        'VALIDATION_ERROR'
      )
    }
  }

  try {
    const field = await createFieldDefinition(id, {
      name: name.trim(),
      field_type: field_type as CustomFieldType,
      card_type: card_type != null ? (card_type as CardType) : null,
      options: (field_type === 'select' || field_type === 'multi_select') ? (options as string[]) : null,
      position: typeof position === 'number' ? position : 0,
      required: required === true,
    })
    return NextResponse.json(field, { status: 201 })
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    if (e.code === '23505') {
      return errorResponse(409, 'A field with this name already exists for this project and card_type', undefined, undefined, 'CONFLICT')
    }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}
