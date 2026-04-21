import { NextRequest, NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ id: string; fieldId: string }> }

// 301 redirect: /api/workflows/[id]/fields/[fieldId] -> /api/projects/[id]/fields/[fieldId]
function redirect(request: NextRequest, newPath: string) {
  const url = request.nextUrl.clone()
  url.pathname = newPath
  return NextResponse.redirect(url, 301)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id, fieldId } = await params
  return redirect(request, `/api/projects/${id}/fields/${fieldId}`)
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id, fieldId } = await params
  return redirect(request, `/api/projects/${id}/fields/${fieldId}`)
}
