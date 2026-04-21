import { NextRequest, NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ id: string; stateId: string }> }

// 301 redirect: /api/workflows/[id]/states/[stateId] -> /api/projects/[id]/states/[stateId]
function redirect(request: NextRequest, newPath: string) {
  const url = request.nextUrl.clone()
  url.pathname = newPath
  return NextResponse.redirect(url, 301)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id, stateId } = await params
  return redirect(request, `/api/projects/${id}/states/${stateId}`)
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id, stateId } = await params
  return redirect(request, `/api/projects/${id}/states/${stateId}`)
}
