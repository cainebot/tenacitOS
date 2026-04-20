// ============================================================
// Phase 69 Plan 11 — /api/agents/[id]/resume
//
// Operational control — NOT approval-gated (Assumption A1).
// Mirrors packages/cli-connect MCP tool resume_agent.
//
// Contract:
//   POST /api/agents/[id]/resume
//     (no body)
//     200 { status:'resumed', agent_id, current_status:'idle' }
//     200 { status:'already_active', agent_id, current_status }
//     400 INVALID_ID
//     401 unauthorized
//     403 INVALID_ORIGIN
//     404 AGENT_NOT_FOUND
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireMcAuth } from "@/lib/auth";
import { assertSameOriginJson } from "@/lib/csrf";
import { assertValidAgentId } from "@/lib/uuid";
import { createServiceRoleClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const idErr = assertValidAgentId(id);
  if (idErr) return idErr;

  // Resume takes no body. We still validate Origin; since the mutation
  // method matches the CSRF guard's MUTATION_METHODS set, the helper
  // will enforce Content-Type = application/json. Clients therefore
  // send an empty `{}` with the proper header.
  const csrfErr = assertSameOriginJson(req);
  if (csrfErr) return csrfErr;

  const auth = requireMcAuth(req);
  if (!auth.ok) return auth.response!;

  const supabase = createServiceRoleClient();

  // 1. Agent existence.
  const { data: target, error: selErr } = await supabase
    .from("agents")
    .select("agent_id, status")
    .eq("agent_id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (selErr) {
    return NextResponse.json(
      { error: "db_error", message: selErr.message },
      { status: 500 },
    );
  }
  if (!target) {
    return NextResponse.json(
      { error: "AGENT_NOT_FOUND", message: "Agent not found." },
      { status: 404 },
    );
  }

  const currentStatus = (target as { status?: string | null }).status ?? null;

  // 2. Idempotency.
  if (currentStatus !== "paused") {
    return NextResponse.json(
      {
        status: "already_active",
        agent_id: id,
        current_status: currentStatus,
      },
      { status: 200 },
    );
  }

  // 3. Direct UPDATE (trigger clears paused_at/paused_reason).
  const { error: updErr } = await supabase
    .from("agents")
    .update({ status: "idle" })
    .eq("agent_id", id)
    .eq("status", "paused");
  if (updErr) {
    return NextResponse.json(
      { error: "db_error", message: updErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { status: "resumed", agent_id: id, current_status: "idle" },
    { status: 200 },
  );
}
