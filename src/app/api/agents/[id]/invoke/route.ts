// ============================================================
// Phase 69 Plan 11 — /api/agents/[id]/invoke
//
// Operational control — NOT approval-gated (Assumption A1).
// Mirrors packages/cli-connect MCP tool invoke_agent (heartbeat).
//
// Contract:
//   POST /api/agents/[id]/invoke
//     body: { prompt?: string }   // ≤ 2000 chars
//     200 { run_id, target_node_id, adapter_type }
//     400 INVALID_ID | VALIDATION_ERROR | FORBIDDEN_FIELD | ERR_NO_NODE
//     401 unauthorized
//     403 INVALID_ORIGIN
//     404 AGENT_NOT_FOUND
//     409 ERR_AGENT_PAUSED
//     415 UNSUPPORTED_MEDIA_TYPE
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireMcAuth } from "@/lib/auth";
import { assertSameOriginJson } from "@/lib/csrf";
import { assertValidAgentId } from "@/lib/uuid";
import { createServiceRoleClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_HEARTBEAT_PROMPT =
  "Run a heartbeat to check in on assigned work.";

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
  try {
    const raw = await req.text();
    body = raw.trim().length > 0 ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const protoErr = assertPlainObject(body);
  if (protoErr) return protoErr;

  const payload = body as Record<string, unknown>;

  // Whitelist: only `prompt`.
  for (const k of Object.keys(payload)) {
    if (k !== "prompt") {
      return NextResponse.json(
        { error: "FORBIDDEN_FIELD", message: `Unknown field '${k}'.` },
        { status: 400 },
      );
    }
  }

  let prompt: string | undefined;
  if (payload.prompt !== undefined) {
    if (typeof payload.prompt !== "string" || payload.prompt.length > 2000) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          field: "prompt",
          message: "prompt must be a string ≤ 2000 chars.",
        },
        { status: 400 },
      );
    }
    prompt = payload.prompt;
  }

  const supabase = createServiceRoleClient();

  // 1. Agent lookup.
  const { data: target, error: selErr } = await supabase
    .from("agents")
    .select("agent_id, status, adapter_type, bound_node_id, preferred_node_id")
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

  const row = target as {
    status?: string | null;
    adapter_type?: string | null;
    bound_node_id?: string | null;
    preferred_node_id?: string | null;
  };

  // 2. Hard-reject paused.
  if (row.status === "paused") {
    return NextResponse.json(
      {
        error: "ERR_AGENT_PAUSED",
        message: "Agent is paused; resume before invoking.",
        hint: "Resume the agent before invoking.",
      },
      { status: 409 },
    );
  }

  // 3. Hard-reject missing node.
  const targetNodeId =
    (row.bound_node_id && row.bound_node_id.length > 0 ? row.bound_node_id : null) ??
    (row.preferred_node_id && row.preferred_node_id.length > 0
      ? row.preferred_node_id
      : null);
  if (!targetNodeId) {
    return NextResponse.json(
      {
        error: "ERR_NO_NODE",
        message:
          "Agent has no bound_node_id or preferred_node_id — cannot route run.",
      },
      { status: 400 },
    );
  }

  const adapterType =
    row.adapter_type && row.adapter_type.length > 0
      ? row.adapter_type
      : "claude_local";
  const promptStr = prompt && prompt.length > 0 ? prompt : DEFAULT_HEARTBEAT_PROMPT;

  // 4. Insert agent_runs.
  const { data: inserted, error: insErr } = await supabase
    .from("agent_runs")
    .insert({
      agent_id: id,
      target_node_id: targetNodeId,
      adapter_type: adapterType,
      status: "queued",
      source: "manual",
      wake_reason: "manual_heartbeat",
      context: { type: "heartbeat", prompt: promptStr },
    })
    .select("id")
    .single();
  if (insErr) {
    return NextResponse.json(
      { error: "db_error", message: insErr.message },
      { status: 500 },
    );
  }

  const runId = (inserted as { id?: string } | null)?.id;

  return NextResponse.json(
    {
      run_id: runId,
      target_node_id: targetNodeId,
      adapter_type: adapterType,
    },
    { status: 200 },
  );
}
