import { NextRequest, NextResponse } from 'next/server'
import { updateFieldDefinition, deleteFieldDefinition } from '@/lib/custom-fields'
import type { CustomFieldType } from '@/types/project'

type RouteParams = { params: Promise<{ id: string; fieldId: string }> }

const VALID_FIELD_TYPES: CustomFieldType[] = [
  'text', 'number', 'date', 'url', 'email', 'select', 'multi_select', 'checkbox',
]

function errorResponse(
  status: number,
  message: string,
  details?: string,
  hint?: string,
  code?: string
) {
  return NextResponse.json({ message, details, hint, code }, { status })
}

// PATCH /api/projects/[id]/fields/[fieldId] — update a field definition
// Body: { name?, field_type?, options?, position?, required? }
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { fieldId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'Invalid JSON body')
  }

  const { name, field_type, options, position, required } = body as {
    name?: string
    field_type?: string
    options?: unknown
    position?: number
    required?: boolean
  }

  // Validate field_type if provided
  if (field_type !== undefined && !VALID_FIELD_TYPES.includes(field_type as CustomFieldType)) {
    return errorResponse(
      400,
      `Invalid field_type: ${field_type}. Must be one of: ${VALID_FIELD_TYPES.join(', ')}`,
      undefined,
      undefined,
      'VALIDATION_ERROR'
    )
  }

  // Validate options for select/multi_select
  if (field_type === 'select' || field_type === 'multi_select') {
    if (options !== undefined && (!Array.isArray(options) || !options.every((o) => typeof o === 'string'))) {
      return errorResponse(
        400,
        'options must be an array of strings for select/multi_select fields',
        undefined,
        undefined,
        'VALIDATION_ERROR'
      )
    }
  }

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = (name as string).trim()
  if (field_type !== undefined) updateData.field_type = field_type
  if (options !== undefined) updateData.options = options
  if (position !== undefined) updateData.position = position
  if (required !== undefined) updateData.required = required

  if (Object.keys(updateData).length === 0) {
    return errorResponse(400, 'At least one field to update is required', undefined, undefined, 'VALIDATION_ERROR')
  }

  try {
    const field = await updateFieldDefinition(fieldId, updateData)
    return NextResponse.json(field)
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    if (e.code === 'PGRST116') {
      return errorResponse(404, 'Field definition not found', undefined, undefined, 'NOT_FOUND')
    }
    if (e.code === '23505') {
      return errorResponse(409, 'A field with this name already exists for this project and card_type', undefined, undefined, 'CONFLICT')
    }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}

// DELETE /api/projects/[id]/fields/[fieldId] — delete a field definition
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { fieldId } = await params

  try {
    await deleteFieldDefinition(fieldId)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}
