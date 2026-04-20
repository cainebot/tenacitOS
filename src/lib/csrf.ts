// ============================================================
// Phase 69-01 — Same-origin + JSON Content-Type assertion helper
// Consumed by every Phase 69 mutation route (POST/PATCH/DELETE on
// /api/agents, /api/agents/[id]) AND by Phase 69 GET routes that
// expose sensitive payloads (/api/agent-runs/[runId]/logs,
// /api/nodes/[id]/active-runs, /api/agents, /api/agents/[id]).
//
// Closes:
// - REVIEW finding 5 (CSRF defense shared across routes)
// - SECURITY T4 (CSRF via mc_auth cookie + prod allow-list guard)
// - SECURITY T5 (Origin check on sensitive GETs via requireContentType)
//
// The mc_auth cookie is SameSite=Lax (verified in Plan 01 preflight 10),
// so browsers won't send it on cross-site POST. The Origin check is the
// second layer of defense; the HTTP-Origin header is not spoofable from
// a browser context.
// ============================================================

import { NextResponse, type NextRequest } from "next/server";

// ---------- effective allow-list ----------

function readAllowList(): string[] {
  const raw = process.env.CIRCOS_ALLOWED_ORIGINS;
  if (raw && raw.trim().length > 0) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  // Default dev allow-list. Includes every localhost port the control-panel
  // dev server may bind to (3000 canonical, 3003 page-projects worktree,
  // 3007 cli-agent-connect worktree — auto-selected by Next.js when earlier
  // ports are occupied).
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const fallback = [
    "http://localhost:3000",
    "http://localhost:3003",
    "http://localhost:3007",
  ];
  return siteUrl && siteUrl.trim().length > 0 ? [siteUrl, ...fallback] : fallback;
}

function containsLocalhost(origins: readonly string[]): boolean {
  return origins.some((o) => /(^|\/\/)(localhost|127\.0\.0\.1)(:|\/|$)/i.test(o));
}

// ---------- module-load production guard (SECURITY T4) ----------

const NODE_ENV = process.env.NODE_ENV;
const EFFECTIVE_ALLOW_LIST = readAllowList();

if (NODE_ENV === "production" && containsLocalhost(EFFECTIVE_ALLOW_LIST)) {
  // Fail-fast. Next.js surfaces this on any route that imports the module,
  // preventing the server from starting with a dev-style allow-list in prod.
  throw new Error(
    "INSECURE_ORIGIN_ALLOWLIST: production deployment has a localhost entry in " +
      "CIRCOS_ALLOWED_ORIGINS (or the env var is unset and the dev fallback " +
      "leaked). Set CIRCOS_ALLOWED_ORIGINS to your canonical production origins.",
  );
}

// ---------- public API ----------

export interface AssertSameOriginJsonOptions {
  /**
   * Whether to also assert `Content-Type: application/json`.
   * Defaults to `true` for convenience in mutation routes.
   * GETs typically pass `false` (they do not carry a body).
   *
   * Note: mutation methods (POST / PATCH / PUT / DELETE) are always
   * subjected to the content-type check regardless of this flag.
   */
  requireContentType?: boolean;
}

const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/**
 * Asserts the request's Origin header (or Referer as fallback) is in the
 * allow-list, and — for mutation methods or when explicitly requested —
 * that Content-Type is `application/json`.
 *
 * Returns a 403 / 415 NextResponse on failure. Call sites should:
 *
 *   const err = assertSameOriginJson(req);
 *   if (err) return err;
 *
 * On success returns `null` (continue).
 */
export function assertSameOriginJson(
  req: NextRequest,
  opts: AssertSameOriginJsonOptions = {},
): NextResponse | null {
  const method = req.method.toUpperCase();
  const isMutation = MUTATION_METHODS.has(method);

  // --- Origin / Referer check ---
  const originHeader = req.headers.get("origin");
  const refererHeader = req.headers.get("referer");
  const candidateOrigin = originHeader ?? extractOriginFromReferer(refererHeader);

  if (!candidateOrigin) {
    return NextResponse.json(
      { error: "INVALID_ORIGIN", message: "Missing Origin / Referer header." },
      { status: 403 },
    );
  }
  if (!EFFECTIVE_ALLOW_LIST.includes(candidateOrigin)) {
    return NextResponse.json(
      {
        error: "INVALID_ORIGIN",
        message: "Request origin is not in the allow-list.",
      },
      { status: 403 },
    );
  }

  // --- Content-Type check (mutations always; GETs when requireContentType=true) ---
  const shouldCheckCt = isMutation || opts.requireContentType !== false;
  if (shouldCheckCt && isMutation) {
    const ct = (req.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.startsWith("application/json")) {
      return NextResponse.json(
        {
          error: "UNSUPPORTED_MEDIA_TYPE",
          message: "Content-Type must be application/json.",
        },
        { status: 415 },
      );
    }
  }

  return null;
}

function extractOriginFromReferer(referer: string | null): string | null {
  if (!referer) return null;
  try {
    const u = new URL(referer);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

// ---------- test-only exports ----------
// Exposed so `src/lib/__tests__/csrf.test.ts` can assert the effective
// allow-list without re-implementing readAllowList(). Not part of the
// public route contract.
export const __testables = {
  readAllowList,
  containsLocalhost,
  EFFECTIVE_ALLOW_LIST,
} as const;
