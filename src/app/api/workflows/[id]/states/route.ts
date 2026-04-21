import { NextRequest, NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ id: string }> }

// 301 redirect: /api/workflows/[id]/states -> /api/projects/[id]/states
function redirect(request: NextRequest, newPath: string) {
  const url = request.nextUrl.clone()
  url.pathname = newPath
  return NextResponse.redirect(url, 301)
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  return redirect(request, `/api/projects/${id}/states`)
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  return redirect(request, `/api/projects/${id}/states`)
}
