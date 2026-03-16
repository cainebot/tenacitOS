import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import type { CardType, Priority } from '@/types/workflow'

interface ImportError {
  row: number
  message: string
}

// Simple CSV parser that handles quoted fields
function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  return lines.map((line) => {
    const fields: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote inside quoted field
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    fields.push(current.trim())
    return fields
  })
}

// POST /api/cards/import — bulk import cards from a CSV file
// Body: multipart/form-data with:
//   - file: CSV file (first row = headers)
//   - workflow_id: string
//   - card_type: CardType
//   - state_id: string
//
// Required CSV columns: title
// Optional CSV columns: description, priority, labels (comma-separated inside field), assigned_agent_id, due_date
export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { message: 'Invalid multipart/form-data body' },
      { status: 400 }
    )
  }

  const csvFile = formData.get('file') as File | null
  const workflowId = (formData.get('workflow_id') as string | null)?.trim()
  const cardType = (formData.get('card_type') as string | null)?.trim()
  const stateId = (formData.get('state_id') as string | null)?.trim()

  if (!csvFile || !(csvFile instanceof File)) {
    return NextResponse.json(
      { message: 'file is required (multipart field named "file")' },
      { status: 400 }
    )
  }
  if (!workflowId) {
    return NextResponse.json(
      { message: 'workflow_id is required' },
      { status: 400 }
    )
  }

  const validCardTypes: CardType[] = ['epic', 'story', 'task', 'subtask', 'bug']
  if (!cardType || !validCardTypes.includes(cardType as CardType)) {
    return NextResponse.json(
      {
        message: `card_type is required and must be one of: ${validCardTypes.join(', ')}`,
      },
      { status: 400 }
    )
  }
  if (!stateId) {
    return NextResponse.json(
      { message: 'state_id is required' },
      { status: 400 }
    )
  }

  // Read and parse CSV
  const csvText = await csvFile.text()
  const rows = parseCSV(csvText)

  if (rows.length < 2) {
    return NextResponse.json(
      { message: 'CSV must have at least a header row and one data row' },
      { status: 400 }
    )
  }

  const headers = rows[0].map((h) => h.toLowerCase().trim())
  const titleIdx = headers.indexOf('title')

  if (titleIdx === -1) {
    return NextResponse.json(
      { message: 'CSV must contain a "title" column' },
      { status: 400 }
    )
  }

  // Optional column indices
  const descIdx = headers.indexOf('description')
  const priorityIdx = headers.indexOf('priority')
  const labelsIdx = headers.indexOf('labels')
  const agentIdx = headers.indexOf('assigned_agent_id')
  const dueDateIdx = headers.indexOf('due_date')

  const supabase = createServiceRoleClient()

  let imported = 0
  const errors: ImportError[] = []

  const dataRows = rows.slice(1) // skip header

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const rowNum = i + 2 // 1-based, offset by header row

    const title = titleIdx < row.length ? row[titleIdx] : ''
    if (!title || !title.trim()) {
      errors.push({ row: rowNum, message: 'title is empty' })
      continue
    }

    const description =
      descIdx !== -1 && descIdx < row.length && row[descIdx]
        ? row[descIdx]
        : null

    const priorityRaw =
      priorityIdx !== -1 && priorityIdx < row.length ? row[priorityIdx] : ''
    const validPriorities: Priority[] = ['baja', 'media', 'alta']
    const priority: Priority | undefined =
      priorityRaw && validPriorities.includes(priorityRaw as Priority)
        ? (priorityRaw as Priority)
        : undefined

    const labelsRaw =
      labelsIdx !== -1 && labelsIdx < row.length ? row[labelsIdx] : ''
    const labels =
      labelsRaw
        ? labelsRaw
            .split(',')
            .map((l) => l.trim())
            .filter(Boolean)
        : []

    const assignedAgentId =
      agentIdx !== -1 && agentIdx < row.length && row[agentIdx]
        ? row[agentIdx]
        : null

    const dueDate =
      dueDateIdx !== -1 && dueDateIdx < row.length && row[dueDateIdx]
        ? row[dueDateIdx]
        : null

    // Generate sort_order as zero-padded index
    const sortOrder = String(i).padStart(5, '0')

    try {
      const { error: insertError } = await supabase
        .from('cards')
        .insert({
          workflow_id: workflowId,
          state_id: stateId,
          card_type: cardType as CardType,
          title: title.trim(),
          description,
          priority,
          labels,
          assigned_agent_id: assignedAgentId,
          due_date: dueDate,
          sort_order: sortOrder,
        })

      if (insertError) {
        errors.push({ row: rowNum, message: insertError.message })
      } else {
        imported++
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push({ row: rowNum, message: msg })
    }
  }

  return NextResponse.json({ imported, errors }, { status: 201 })
}
