import { NextRequest, NextResponse } from 'next/server'

// 301 redirect: /api/workflows -> /api/projects
function redirect(request: NextRequest, newPath: string) {
  const url = request.nextUrl.clone()
  url.pathname = newPath
  return NextResponse.redirect(url, 301)
}

export async function GET(request: NextRequest) {
  return redirect(request, '/api/projects')
}

export async function POST(request: NextRequest) {
  return redirect(request, '/api/projects')
}
