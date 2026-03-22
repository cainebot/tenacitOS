import { NextRequest, NextResponse } from 'next/server'
import type { DiscoveredSkill } from '@/types/supabase'

export const dynamic = 'force-dynamic'

// --- skills.sh (primary) ---

interface SkillsShSearchResponse {
  skills?: Array<{
    id: string;
    name: string;
    installs?: number;
    source?: string;
  }>;
}

async function searchSkillsSh(query: string): Promise<DiscoveredSkill[] | null> {
  try {
    const url = `https://skills.sh/api/search?q=${encodeURIComponent(query)}&limit=10`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'circos/1.0' },
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const data: SkillsShSearchResponse = await res.json()
    return (data.skills ?? []).map((s) => ({
      slug: s.id,
      displayName: s.name,
      summary: s.installs != null ? `${s.installs} installs` : null,
      version: null,
      updatedAt: 0,
      source: 'skills_sh' as const,
    }))
  } catch {
    return null
  }
}

// --- ClawHub (secondary fallback) ---

const CLAWHUB_BASE = 'https://clawhub.ai'

interface ClawHubResult {
  score: number;
  slug?: string;
  displayName?: string;
  summary?: string | null;
  version?: string;
  updatedAt?: number;
}

interface ClawHubSearchResponse {
  results?: ClawHubResult[];
}

async function searchClawHub(query: string): Promise<DiscoveredSkill[] | null> {
  try {
    const url = `${CLAWHUB_BASE}/api/v1/skills/?q=${encodeURIComponent(query)}&limit=12&nonSuspicious=true`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'circos/1.0' },
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const data: ClawHubSearchResponse = await res.json()
    return (data.results ?? []).map((r) => ({
      slug: r.slug ?? '',
      displayName: r.displayName ?? r.slug ?? 'Unknown',
      summary: r.summary ?? null,
      version: r.version ?? null,
      updatedAt: r.updatedAt ?? 0,
      source: 'clawhub' as const,
    }))
  } catch {
    return null
  }
}

// --- GET handler ---

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''

  if (!q) {
    return NextResponse.json({ results: [] })
  }

  // Primary: skills.sh
  const skillsShResults = await searchSkillsSh(q)
  if (skillsShResults !== null) {
    return NextResponse.json({ results: skillsShResults })
  }

  // Secondary fallback: ClawHub
  console.warn('[discover] skills.sh unavailable — falling back to ClawHub')
  const clawhubResults = await searchClawHub(q)
  if (clawhubResults !== null) {
    return NextResponse.json({ results: clawhubResults })
  }

  // No results from any source
  console.warn('[discover] ClawHub also unavailable — returning empty results')
  return NextResponse.json({ results: [] })
}
