// Phase 69 — GET /api/nodes/[node_id]/active-runs (SPEC-69-NODE-02 / Plan 69-07).
// Returns the count of active runs for a given node_id.
//
// BLOCKING-1 (2026-04-20): no fixture import. Real wiring (count from
// `agent_runs` WHERE `status IN ('queued','running')` AND
// `node_id = $1`) lands in Plan 69-05. Until Plan 05 ships, this stub
// returns `{ count: 0 }` — the UI handles 0 gracefully.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ node_id: string }> },
) {
  const { node_id } = await context.params;

  // TODO(plan-69-05): replace with a service-role SELECT COUNT(*) FROM
  // agent_runs WHERE node_id = $1 AND status IN ACTIVE_RUN_STATUSES.
  return NextResponse.json({ node_id, count: 0 });
}
