// ============================================================
// Phase 69-03 — Path-param ID validators (SECURITY T13)
//
// Prevents Postgres `invalid input syntax for type uuid` 500 errors
// that would otherwise leak stack traces and leave the DB uncertain.
// Every `[id]`-shaped route handler calls one of these helpers
// BEFORE CSRF / DB contact so malformed IDs bail out cleanly.
//
// Consumed by:
//   - Plan 69-03 (this plan) — /api/agents/[id] (uses assertValidAgentId
//     because `agents.agent_id` is TEXT PK, NOT UUID — see DEVIATION
//     note in the plan SUMMARY)
//   - Plan 69-05 — /api/agent-runs/[runId]/logs (assertValidUuid)
//   - Plan 69-07 — /api/nodes/[id]/active-runs (assertValidUuid)
//
// UUID regex matches the canonical 8-4-4-4-12 hex UUID format case-
// insensitively (v1..v5 all share this shape; v7 additions also
// conform). Accepts UPPERCASE, lowercase, mixed.
//
// Agent ID regex matches the slug / kebab-case TEXT PK used by
// `agents.agent_id` — letters, digits, hyphens, underscores, 1..64
// chars. Matches Phase 62 migration-002 constraints.
// ============================================================

import { NextResponse } from "next/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Matches `agents.agent_id` / `agents.slug` shape: 1-64 chars, letters,
// digits, hyphen, underscore. Guards against SQL injection fragments,
// path traversal, and control characters before DB contact.
const AGENT_ID_REGEX = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

/**
 * Returns `null` when the id is a well-formed UUID string; otherwise
 * returns a 400 `INVALID_ID` `NextResponse` that the caller can
 * return directly from its handler.
 *
 * Usage:
 *
 *   const err = assertValidUuid(params.id);
 *   if (err) return err;
 *   // id is safe to pass to Postgres
 *
 * Note: returns 400 not 404 — a malformed id is a client error, not
 * a "not-found" signal. Callers should 404 on DB-level miss.
 */
export function assertValidUuid(id: string | undefined | null): NextResponse | null {
  if (typeof id !== "string" || id.length === 0 || !UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: "INVALID_ID", message: "Path id must be a v4-shaped UUID." },
      { status: 400 },
    );
  }
  return null;
}

/**
 * Pure predicate — does NOT build a `NextResponse`. Useful for
 * batch id validation (`GET /api/agents?ids=a,b,c`) where we want
 * to short-circuit on the first bad id and build a single response.
 */
export function isValidUuid(id: unknown): id is string {
  return typeof id === "string" && UUID_REGEX.test(id);
}

/**
 * Variant for routes whose `[id]` segment is the TEXT PK (slug /
 * agent_id) rather than a UUID. Returns `null` on valid, 400
 * `INVALID_ID` NextResponse otherwise. Used by /api/agents/[id].
 *
 * Rationale: `agents.agent_id` is TEXT (migration 002) — the
 * canonical Phase 62 PK was NOT migrated to UUID. The Plan 03 nominal
 * UUID validator does not fit. We still need a path-param guard to
 * reject control characters, SQL fragments, traversal attempts.
 */
export function assertValidAgentId(id: string | undefined | null): NextResponse | null {
  if (typeof id !== "string" || id.length === 0 || !AGENT_ID_REGEX.test(id)) {
    return NextResponse.json(
      { error: "INVALID_ID", message: "Path id must be a valid agent slug (1-64 chars, letters/digits/hyphen/underscore)." },
      { status: 400 },
    );
  }
  return null;
}

export function isValidAgentId(id: unknown): id is string {
  return typeof id === "string" && AGENT_ID_REGEX.test(id);
}

// test-only — keeps the regex export-free outside the module.
export const __testables = { UUID_REGEX, AGENT_ID_REGEX } as const;
