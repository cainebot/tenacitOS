// ============================================================
// Phase 69-07 — GET /api/nodes/[node_id]/active-runs
//
// Returns the count of active runs (status ∈ ACTIVE_RUN_STATUSES) for a
// given node_id. Consumed by the dashboard NodeStatusStrip as a
// server-proxy fallback / initial snapshot; the Realtime subscription
// on the client side is additive (REVIEW finding 3 + SECURITY T5).
//
// Contract:
//   GET /api/nodes/[node_id]/active-runs
//     200 { node_id, count }               — numeric count from DB
//     400 { error: 'INVALID_ID' }          — malformed node_id (SECURITY T13)
//     403 { error: 'INVALID_ORIGIN' }      — cross-origin GET (SECURITY T5)
//     401 { error: 'unauthorized' }        — mc_auth missing/bad
//     500 { error: 'db_error' }            — Supabase count failed
//
// Security posture (REMEDIATION-2 2026-04-20):
//   1. `assertSameOriginJson(req, {requireContentType: false})` — SECURITY
//      T5. Even though this is a GET, the Origin allow-list blocks
//      cross-origin credentialled fetches that would enumerate active-run
//      cardinality per node (leak signal to a phishing overlay).
//   2. `assertValidAgentId(node_id)` — SECURITY T13. `nodes.node_id` is
//      TEXT PK (migration 001 §3 comment "node_id kept as the PK"), NOT
//      UUID, so `assertValidAgentId` (slug-shape validator from Plan 03)
//      is the correct guard. Bails out with 400 before DB contact so no
//      Postgres error leaks to the client.
//   3. `requireMcAuth` — defense-in-depth (middleware also gates this
//      path).
//   4. `createServiceRoleClient()` — the browser does not SELECT from
//      `agent_runs` for cardinality (V3 §12 + GAP-68-01); this route is
//      the trusted proxy.
//
// The "active run" definition (`ACTIVE_RUN_STATUSES = ['queued','running']`)
// is imported from `@/lib/run-status` — the same constant the strip's
// `useRealtimeRuns` merge uses and the same one the unit tests pin. This
// closes REVIEW finding 3 (semantic drift).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireMcAuth } from "@/lib/auth";
import { assertSameOriginJson } from "@/lib/csrf";
import { assertValidAgentId } from "@/lib/uuid";
import { ACTIVE_RUN_STATUSES } from "@/lib/run-status";
import { createServiceRoleClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ node_id: string }> },
): Promise<NextResponse> {
  const { node_id } = await context.params;

  // 1. SECURITY T5 — Origin allow-list on GET. requireContentType:false
  //    because GETs do not carry a body.
  const csrfErr = assertSameOriginJson(req, { requireContentType: false });
  if (csrfErr) return csrfErr;

  // 2. SECURITY T13 — path-id shape guard BEFORE DB contact. node_id is
  //    TEXT (slug-shape), so assertValidAgentId is the right validator.
  const idErr = assertValidAgentId(node_id);
  if (idErr) return idErr;

  // 3. Defense-in-depth mc_auth check.
  const auth = requireMcAuth(req);
  if (!auth.ok) return auth.response!;

  // 4. SELECT COUNT(*) FROM agent_runs WHERE node_id=$1
  //       AND status = ANY(ACTIVE_RUN_STATUSES::text[])
  const supabase = createServiceRoleClient();
  const { count, error } = await supabase
    .from("agent_runs")
    .select("*", { count: "exact", head: true })
    .eq("node_id", node_id)
    .in("status", ACTIVE_RUN_STATUSES as unknown as string[]);

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ node_id, count: count ?? 0 }, { status: 200 });
}
