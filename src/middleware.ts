import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that never require authentication
const PUBLIC_ROUTES = new Set(["/login"]);

// API routes that are always public (login/logout + health check)
// /api/auth/session requires mc_auth — excluded from public list
const PUBLIC_API_PREFIXES = ["/api/auth/login", "/api/auth/logout", "/api/health"];

function isBrowserAuthenticated(request: NextRequest): boolean {
  const authCookie = request.cookies.get("mc_auth");
  return !!(authCookie && authCookie.value === process.env.AUTH_SECRET);
}

function isAgentRequest(request: NextRequest): boolean {
  return !!request.headers.get("x-agent-key");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public pages (login)
  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // Always allow public API routes (auth + health)
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Agent API requests: allow through if X-Agent-Key header present.
  // Full bcrypt validation happens inside the route handler via validateAgentKey().
  // This avoids running bcrypt/DB in Edge middleware.
  if (pathname.startsWith("/api/") && isAgentRequest(request)) {
    return NextResponse.next();
  }

  // Browser authentication via mc_auth cookie
  if (!isBrowserAuthenticated(request)) {
    // For API routes: return 401 JSON (not a redirect)
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    // For page routes: redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (with extension)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
