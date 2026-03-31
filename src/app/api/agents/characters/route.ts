import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import type { CharacterDef } from '@/types/agents'

export const dynamic = 'force-dynamic'

export function GET() {
  const filePath = path.join(process.cwd(), 'public', 'characters.json')
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const characters: CharacterDef[] = JSON.parse(raw)
    return NextResponse.json({ characters })
  } catch {
    // File missing or invalid JSON — return empty list, never 500
    return NextResponse.json({ characters: [] })
  }
}
