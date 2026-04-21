// Phase 68 Plan 08 Task 1 — `mc_auth` auth helper (defense-in-depth).
//
// The global Next.js middleware (`src/middleware.ts`) already rejects any
// request under `/api/**` without a valid `mc_auth` cookie with HTTP 401.
// This helper exists so route handlers can re-assert that gate inline:
//
//   1. Defense-in-depth — a future middleware misconfiguration (bad
//      matcher, excluded prefix) would not silently expose approvals data.
//   2. Unit-testable in isolation — route tests do not spin up middleware,
//      so asserting "401 sin mc_auth" requires a check at the handler
//      level.
//   3. Documented contract — the shape `{ ok: boolean; response?: NextResponse }`
//      is what every authenticated endpoint reuses.
//
// SECURITY NOTE: `mc_auth` is a *shared* deployment-scoped secret. Every
// operator using this deployment presents the same cookie value. This
// helper answers "is this request from an authenticated Admin Panel
// session" — NOT "which human". Do not use the return of this helper to
// derive per-human attribution. See BL-01 / `/api/approvals/[id]` for the
// canonical audit-trail pattern (deployment-scoped identity).

import { NextResponse, type NextRequest } from "next/server";

export interface McAuthResult {
  ok: boolean;
  /** Populated only when `ok === false`. */
  response?: NextResponse;
}

/**
 * Validate the `mc_auth` cookie against the server-held `AUTH_SECRET`.
 *
 * Returns `{ ok: true }` on success. On failure returns `{ ok: false,
 * response }` where `response` is a JSON 401 ready to be returned from
 * the route handler.
 *
 * Usage:
 *
 *   export async function GET(req: NextRequest) {
 *     const auth = requireMcAuth(req);
 *     if (!auth.ok) return auth.response!;
 *     // ...authenticated work...
 *   }
 */
export function requireMcAuth(req: NextRequest): McAuthResult {
  const expected = process.env.AUTH_SECRET;
  if (!expected || expected.length < 16) {
    // Misconfiguration: do not silently pass. Treat as auth failure so
    // the endpoint refuses to serve data until env is repaired.
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "auth_misconfigured", message: "server auth is not configured" },
        { status: 500 },
      ),
    };
  }

  const cookie = req.cookies.get("mc_auth");
  if (!cookie || cookie.value !== expected) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "unauthorized", message: "mc_auth cookie required" },
        { status: 401 },
      ),
    };
  }

  return { ok: true };
}
