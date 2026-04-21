// ============================================================
// Phase 69 Plan 11 — /api/agents/[id]/pause
//
// Operational control — NOT approval-gated (Assumption A1).
// Mirrors packages/cli-connect MCP tool pause_agent.
//
// Contract:
//   POST /api/agents/[id]/pause
//     body: { reason?: string }   // ≤ 280 chars
//     200 { status:'paused', agent_id, paused_reason, inflight_run_count }
//     200 { status:'already_paused', agent_id }
//     400 INVALID_ID | VALIDATION_ERROR | FORBIDDEN_FIELD
//     401 unauthorized
//     403 INVALID_ORIGIN
//     404 AGENT_NOT_FOUND
//     415 UNSUPPORTED_MEDIA_TYPE
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireMcAuth } from "@/lib/auth";
import { assertSameOriginJson } from "@/lib/csrf";
import { assertValidAgentId } from "@/lib/uuid";
import { createServiceRoleClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertPlainObject(body: unknown): NextResponse | null {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Body must be a JSON object." },
      { status: 400 },
    );
  }
  if (Object.getPrototypeOf(body) !== Object.prototype) {
    return NextResponse.json(
      {
        error: "FORBIDDEN_FIELD",
        message: "Body prototype mismatch.",
        reason: "prototype_pollution_attempt",
      },
      { status: 400 },
    );
  }
  for (const poison of ["__proto__", "constructor", "prototype"] as const) {
    if (Object.hasOwn(body as object, poison)) {
      return NextResponse.json(
        {
          error: "FORBIDDEN_FIELD",
          message: `Forbidden key '${poison}'.`,
          reason: "prototype_pollution_attempt",
        },
        { status: 400 },
      );
    }
  }
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const idErr = assertValidAgentId(id);
  if (idErr) return idErr;

  const csrfErr = assertSameOriginJson(req);
  if (csrfErr) return csrfErr;

  const auth = requireMcAuth(req);
  if (!auth.ok) return auth.response!;

  let body: unknown = {};
  const ct = (req.headers.get("content-type") ?? "").toLowerCase();
  const hasBody = ct.startsWith("application/json");
  if (hasBody) {
    try {
      // Allow empty body → default to {}.
      const raw = await req.text();
      body = raw.trim().length > 0 ? JSON.parse(raw) : {};
    } catch {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Invalid JSON body." },
        { status: 400 },
      );
    }
  }

  const protoErr = assertPlainObject(body);
  if (protoErr) return protoErr;

  const payload = body as Record<string, unknown>;

  // Whitelist: only `reason` is accepted.
  for (const k of Object.keys(payload)) {
    if (k !== "reason") {
      return NextResponse.json(
        { error: "FORBIDDEN_FIELD", message: `Unknown field '${k}'.` },
        { status: 400 },
      );
    }
  }

  let reason: string | null = null;
  if (payload.reason !== undefined) {
    if (typeof payload.reason !== "string" || payload.reason.length > 280) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          field: "reason",
          message: "reason must be a string ≤ 280 chars.",
        },
        { status: 400 },
      );
    }
    reason = payload.reason;
  }

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
  if (currentStatus === "paused") {
    return NextResponse.json(
      { status: "already_paused", agent_id: id },
      { status: 200 },
    );
  }

  // 3. In-flight-run count (warning only).
  const { count: inflightCount, error: cntErr } = await supabase
    .from("agent_runs")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", id)
    .in("status", ["queued", "running"]);
  if (cntErr) {
    return NextResponse.json(
      { error: "db_error", message: cntErr.message },
      { status: 500 },
    );
  }
  const inflight_run_count = inflightCount ?? 0;
  if (inflight_run_count > 0) {
    console.warn(
      JSON.stringify({
        event: "pause_with_inflight_runs",
        agent_id: id,
        inflight_run_count,
      }),
    );
  }

  // 4. Direct UPDATE (trigger stamps paused_at).
  const { error: updErr } = await supabase
    .from("agents")
    .update({ status: "paused", paused_reason: reason })
    .eq("agent_id", id)
    .neq("status", "paused");
  if (updErr) {
    return NextResponse.json(
      { error: "db_error", message: updErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      status: "paused",
      agent_id: id,
      paused_reason: reason,
      inflight_run_count,
    },
    { status: 200 },
  );
}
