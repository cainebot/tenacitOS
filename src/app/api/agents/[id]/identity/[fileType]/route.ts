import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { createServiceRoleClient } from '@/lib/supabase'
import { IDENTITY_FILE_TYPES } from '@/types/agents'
import type { IdentityFileType } from '@/types/agents'

export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string; fileType: string }> }

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { id, fileType } = await params

  if (!IDENTITY_FILE_TYPES.includes(fileType as IdentityFileType)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  // process.cwd() is control-panel/, so '../agents/{id}/{fileType}' resolves to repo-root/agents/{id}/{fileType}
  const filePath = path.join(process.cwd(), '..', 'agents', id, fileType)

  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const updatedAt = fs.statSync(filePath).mtime.toISOString()
      return NextResponse.json({ content, updatedAt })
    }

    // File does not exist — return empty string, NOT 404 (locked decision)
    return NextResponse.json({ content: '', updatedAt: null })
  } catch {
    // Any filesystem error returns empty string
    return NextResponse.json({ content: '', updatedAt: null })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id, fileType } = await params

  if (!IDENTITY_FILE_TYPES.includes(fileType as IdentityFileType)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  let content: unknown
  try {
    const body = await request.json()
    content = body.content
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof content !== 'string') {
    return NextResponse.json({ error: 'content must be a string' }, { status: 400 })
  }

  const filePath = path.join(process.cwd(), '..', 'agents', id, fileType)

  try {
    // Create agent directory if not exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content, 'utf-8')
    const updatedAt = fs.statSync(filePath).mtime.toISOString()

    // Set soul_dirty via Supabase service role client
    const supabase = createServiceRoleClient()
    await supabase.from('agents').update({ soul_dirty: true }).eq('agent_id', id)

    return NextResponse.json({ success: true, updatedAt })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to write file'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
