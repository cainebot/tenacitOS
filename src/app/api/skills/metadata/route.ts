import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GITHUB_REPO_RE = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(\/.*)?$/

interface GitHubRepoResponse {
  name: string
  description: string | null
  default_branch: string
}

interface MetadataResult {
  name: string
  description: string
  readme: string | null
  raw_skill_md: string | null
}

async function fetchWithToken(url: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'circos/1.0',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return fetch(url, { headers })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const urlParam = searchParams.get('url')

  // Validate presence
  if (!urlParam) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  // Validate protocol — only https:// allowed
  if (!urlParam.startsWith('https://')) {
    return NextResponse.json(
      { error: 'Only https:// URLs are supported' },
      { status: 400 }
    )
  }

  // Validate domain — only github.com
  const repoMatch = urlParam.match(GITHUB_REPO_RE)
  if (!repoMatch) {
    return NextResponse.json(
      { error: 'Only github.com repository URLs are supported (not gist or raw)' },
      { status: 400 }
    )
  }

  const owner = repoMatch[1]
  const repo = repoMatch[2]
  const token = process.env.GITHUB_TOKEN

  try {
    // 1. Fetch repo metadata
    const repoRes = await fetchWithToken(
      `https://api.github.com/repos/${owner}/${repo}`,
      token
    )

    if (repoRes.status === 429) {
      const retryAfter = repoRes.headers.get('Retry-After') ?? '60'
      return NextResponse.json(
        { error: 'GitHub rate limit exceeded', retry_after: parseInt(retryAfter, 10) },
        { status: 429 }
      )
    }

    if (repoRes.status === 404) {
      return NextResponse.json(
        { error: 'Repository not found or is private' },
        { status: 404 }
      )
    }

    if (!repoRes.ok) {
      return NextResponse.json(
        { error: `GitHub API error: ${repoRes.status}` },
        { status: 502 }
      )
    }

    const repoData: GitHubRepoResponse = await repoRes.json()

    // 2. Try to fetch SKILL.md from default branch
    let raw_skill_md: string | null = null
    const skillMdRes = await fetchWithToken(
      `https://api.github.com/repos/${owner}/${repo}/contents/SKILL.md?ref=${repoData.default_branch}`,
      token
    )
    if (skillMdRes.ok) {
      const skillMdData = await skillMdRes.json()
      if (skillMdData.content) {
        // GitHub returns base64-encoded content
        raw_skill_md = Buffer.from(skillMdData.content, 'base64').toString('utf-8')
      }
    }

    // 3. Try to fetch README if no SKILL.md
    let readme: string | null = null
    if (!raw_skill_md) {
      const readmeRes = await fetchWithToken(
        `https://api.github.com/repos/${owner}/${repo}/readme`,
        token
      )
      if (readmeRes.ok) {
        const readmeData = await readmeRes.json()
        if (readmeData.content) {
          readme = Buffer.from(readmeData.content, 'base64').toString('utf-8')
        }
      }
    }

    const result: MetadataResult = {
      name: repoData.name,
      description: repoData.description ?? '',
      readme,
      raw_skill_md,
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to fetch GitHub metadata: ${message}` }, { status: 500 })
  }
}
