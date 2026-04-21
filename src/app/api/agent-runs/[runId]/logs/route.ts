// ============================================================
// Phase 69-05 — GET /api/agent-runs/[runId]/logs
//
// Paginated cursor-based read of `agent_run_logs` for a single run.
// Consumed by `useRealtimeRunLogs` (client polling, every 2s) and
// indirectly by the per-run page at `/agents/[id]/runs/[runId]`.
//
// Contract:
//   GET /api/agent-runs/[runId]/logs?after=<bigint>
//     200 { chunks: AgentRunLogRow[], nextCursor: number | null }
//     400 { error: 'INVALID_ID' }       — malformed UUID path param (SECURITY T13)
//     400 { error: 'INVALID_CURSOR' }   — unparseable ?after= value
//     401 { error: 'unauthorized' }     — mc_auth missing/bad
//     403 { error: 'INVALID_ORIGIN' }   — cross-origin GET (SECURITY T5)
//
// Security posture:
//   - `assertValidUuid` first — prevents Postgres "invalid input syntax
//     for type uuid" 500 + stack-trace leakage on malformed paths.
//   - `assertSameOriginJson(requireContentType: false)` — even on GET,
//     the Origin allow-list runs to block credentialled cross-origin
//     fetches (logs may contain secrets). GETs carry no body, so the
//     Content-Type check is explicitly skipped via the opt-out flag.
//     See REVIEW finding 5 + SECURITY T5.
//   - `requireMcAuth` — defense-in-depth; middleware also gates this
//     path.
//   - Uses `createServiceRoleClient()` — browser never subscribes to
//     `agent_run_logs` directly (V3 §12 L946 + GAP-68-01).
//
// SECURITY T6: DEFERRED
//   Raw `chunk` bytes are returned verbatim. Per product-owner decision
//   (SECURITY.md §Human-decision flags #1 and FOLLOW-UPS.md §F-69-01),
//   server-side regex redaction is NOT implemented in Phase 69. The UI
//   renders a persistent non-dismissible warning banner in
//   `RunLogStream`; that banner is the interim mitigation. The
//   accompanying unit test asserts that `sk-…`, `ghp_…`, and JWT
//   substrings are echoed verbatim, so any future masking refactor
//   intentionally updates the regression test.
//
// Pagination:
//   `after` defaults to 0. Rows are fetched `ORDER BY id ASC LIMIT 500`.
//   `nextCursor` is the last row's id when the page is full, else null.
//   Callers incrementally request `?after=nextCursor` to page forward.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireMcAuth } from "@/lib/auth";
import { assertSameOriginJson } from "@/lib/csrf";
import { assertValidUuid } from "@/lib/uuid";
import { createServiceRoleClient } from "@/lib/supabase";
import type { AgentRunLogRow } from "@/types/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_LIMIT = 500;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
): Promise<NextResponse> {
  const { runId } = await params;

  // 1. SECURITY T13 — path-id shape first (before auth / CSRF / DB).
  const idErr = assertValidUuid(runId);
  if (idErr) return idErr;

  // 2. SECURITY T5 — Origin allow-list on GET. Even though this is a
  //    read-only GET, the route runs under service-role and may return
  //    secrets in stderr; the Origin check blocks cross-origin credentialled
  //    fetches. Content-Type check is skipped (GETs carry no body).
  const csrfErr = assertSameOriginJson(req, { requireContentType: false });
  if (csrfErr) return csrfErr;

  // 3. Defense-in-depth mc_auth check.
  const auth = requireMcAuth(req);
  if (!auth.ok) return auth.response!;

  // 4. Parse ?after= cursor (defaults to 0 — i.e. from the start).
  const afterRaw = req.nextUrl.searchParams.get("after");
  let after = 0;
  if (afterRaw !== null && afterRaw.length > 0) {
    const parsed = Number(afterRaw);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
      return NextResponse.json(
        {
          error: "INVALID_CURSOR",
          message: "Query param 'after' must be a non-negative integer.",
        },
        { status: 400 },
      );
    }
    after = parsed;
  }

  // 5. Fetch the next page of chunks.
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("agent_run_logs")
    .select("*")
    .eq("run_id", runId)
    .gt("id", after)
    .order("id", { ascending: true })
    .limit(PAGE_LIMIT);

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500 },
    );
  }

  const chunks = (data ?? []) as AgentRunLogRow[];
  const nextCursor =
    chunks.length === PAGE_LIMIT ? chunks[chunks.length - 1]!.id : null;

  // SECURITY T6: DEFERRED — see FOLLOW-UPS.md §F-69-01.
  // Raw `chunk` bytes are returned verbatim. The UI banner in
  // `RunLogStream` is the interim mitigation. The regression test below
  // documents this by asserting secret-looking substrings are echoed.
  return NextResponse.json({ chunks, nextCursor }, { status: 200 });
}
