// ============================================================
// Phase 69-03 — /api/agents/[id] (REWRITE — replaces the legacy
// GET-with-dept-join + PUT + hard-delete handler). The rewrite is
// authoritative for Phase 69 flows: approval-gated PATCH + DELETE,
// enriched GET with `pending_approval` embed (closes REVIEW finding 2).
//
// Contract:
//   GET    /api/agents/[id] →
//     200 { agent: AgentRow, pending_approval: {approval_id, type, created_at} | null }
//     400 { error: 'INVALID_ID' }            — malformed path id (SECURITY T13)
//     401 { error: 'unauthorized' }          — mc_auth missing/bad
//     403 { error: 'INVALID_ORIGIN' }        — cross-origin (SECURITY T5)
//     404 { error: 'NOT_FOUND' }             — agent missing
//
//   PATCH  /api/agents/[id]  body: { name?, slug?, soul_content?, avatar_url? }
//     200 { approval_id }                    — approval row inserted
//     400 INVALID_ID / VALIDATION_ERROR / FORBIDDEN_FIELD
//     401 unauthorized
//     403 INVALID_ORIGIN
//     404 NOT_FOUND
//     409 PENDING_APPROVAL_EXISTS            — double-submit guard
//     415 UNSUPPORTED_MEDIA_TYPE
//
//   DELETE /api/agents/[id]
//     200 { approval_id }                    — approval row inserted
//     400 INVALID_ID
//     401 unauthorized
//     403 INVALID_ORIGIN
//     404 NOT_FOUND
//     409 PENDING_APPROVAL_EXISTS
//     415 UNSUPPORTED_MEDIA_TYPE
//
// The actual mutation on `agents` happens inside `fn_apply_approved_approval`
// (Phase 68 migration 036) after human approval. This route NEVER
// touches the `agents` table directly.
//
// Notes:
//   - `approvals.target_id` is UUID; `agents.agent_id` is TEXT. We
//     therefore set `target_id: null` + `target_type: 'agent'` +
//     `payload.agent_id: <text>` so the dispatcher can re-resolve the
//     target. The snapshot embed (`payload.target_snapshot`) satisfies
//     REVIEW finding 6 without relying on UUID linkage.
//   - `approver_human_id` is deployment-scoped (inherited from Phase
//     68 BL-01; post-v1.9 Supabase Auth will replace).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireMcAuth } from "@/lib/auth";
import { assertSameOriginJson } from "@/lib/csrf";
import { assertValidAgentId } from "@/lib/uuid";
import { createServiceRoleClient } from "@/lib/supabase";
import {
  EDITABLE_AGENT_FIELDS,
  validateAgentName,
  validateAgentSlug,
  validateSoulContent,
  validateAvatarUrl,
  isAllowedAvatarUrl,
  rejectForbiddenFields,
  kebabify,
} from "@/lib/agent-validators";
import type { AgentRow } from "@/types/supabase";
import type { ApprovalStatus, ApprovalType } from "@/types/approval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PENDING_STATUSES: ApprovalStatus[] = ["pending", "revision_requested"];
const PENDING_TYPES: ApprovalType[] = ["update_agent", "delete_agent"];

interface PendingApprovalSummary {
  approval_id: string;
  type: ApprovalType;
  created_at: string;
}

interface AgentSnapshot {
  name: string | null;
  slug: string | null;
  avatar_url: string | null;
  bound_node_id: string | null;
  preferred_node_id: string | null;
}

function approverHumanId(): string {
  return process.env.CIRCOS_DEPLOYMENT_ID ?? "control-panel";
}

async function fetchAgentOr404(
  supabase: ReturnType<typeof createServiceRoleClient>,
  agentId: string,
): Promise<{ agent: AgentRow | null; errorResponse: NextResponse | null }> {
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("agent_id", agentId)
    .maybeSingle();

  if (error) {
    return {
      agent: null,
      errorResponse: NextResponse.json(
        { error: "db_error", message: error.message },
        { status: 500 },
      ),
    };
  }

  if (!data) {
    return {
      agent: null,
      errorResponse: NextResponse.json(
        { error: "NOT_FOUND", message: "Agent not found." },
        { status: 404 },
      ),
    };
  }

  return { agent: data as AgentRow, errorResponse: null };
}

async function fetchPendingApproval(
  supabase: ReturnType<typeof createServiceRoleClient>,
  agentId: string,
): Promise<PendingApprovalSummary | null> {
  // target_id is UUID (and agents.agent_id is TEXT) so pending-lookup
  // filters by `payload->>agent_id = <text>` rather than target_id.
  const { data, error } = await supabase
    .from("approvals")
    .select("id, type, created_at, status, payload")
    .in("status", PENDING_STATUSES as string[])
    .in("type", PENDING_TYPES as string[])
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) return null;

  const match = data.find(
    (row) =>
      typeof row.payload === "object" &&
      row.payload != null &&
      (row.payload as Record<string, unknown>).agent_id === agentId,
  );

  if (!match) return null;

  return {
    approval_id: match.id as string,
    type: match.type as ApprovalType,
    created_at: match.created_at as string,
  };
}

function snapshotOf(agent: AgentRow): AgentSnapshot {
  return {
    name: agent.name ?? null,
    slug: agent.slug ?? null,
    avatar_url: agent.avatar_url ?? null,
    bound_node_id: agent.bound_node_id ?? null,
    preferred_node_id: agent.preferred_node_id ?? null,
  };
}

// ============================================================
// GET /api/agents/[id]
// ============================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  // 1. SECURITY T13: path-id shape first (before auth / CSRF / DB).
  const idErr = assertValidAgentId(id);
  if (idErr) return idErr;

  // 2. SECURITY T5: Origin allow-list even on GET (full row contains
  //    adapter_config, permissions, soul_content — cross-origin credentialed
  //    fetch must not exfiltrate).
  const csrfErr = assertSameOriginJson(req, { requireContentType: false });
  if (csrfErr) return csrfErr;

  // 3. Defense-in-depth mc_auth check.
  const auth = requireMcAuth(req);
  if (!auth.ok) return auth.response!;

  const supabase = createServiceRoleClient();
  const { agent, errorResponse } = await fetchAgentOr404(supabase, id);
  if (errorResponse) return errorResponse;

  const pending = await fetchPendingApproval(supabase, id);

  return NextResponse.json(
    { agent, pending_approval: pending },
    { status: 200 },
  );
}

// ============================================================
// PATCH /api/agents/[id]  — insert update_agent approval
// ============================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const idErr = assertValidAgentId(id);
  if (idErr) return idErr;

  // Mutation path: full Origin + Content-Type check.
  const csrfErr = assertSameOriginJson(req);
  if (csrfErr) return csrfErr;

  const auth = requireMcAuth(req);
  if (!auth.ok) return auth.response!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  // SECURITY T7 hardening: reject non-plain-object bodies and
  // prototype-pollution attempts.
  const protoError = assertPlainObject(body);
  if (protoError) return protoError;

  const changes = body as Record<string, unknown>;

  // Non-editable-field guard (T7 belt).
  const forbiddenErr = rejectForbiddenFields(changes);
  if (forbiddenErr) {
    return NextResponse.json(
      { error: "FORBIDDEN_FIELD", message: forbiddenErr },
      { status: 400 },
    );
  }

  // Must target at least one editable field.
  const editableKeys = Object.keys(changes).filter(
    (k) => Object.hasOwn(changes, k) && (EDITABLE_AGENT_FIELDS as readonly string[]).includes(k),
  );
  if (editableKeys.length === 0) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message:
          "Provide at least one of: " + EDITABLE_AGENT_FIELDS.join(", "),
      },
      { status: 400 },
    );
  }

  // Per-field validation (whitelisted fields only).
  const validationErr = validateChangesPatch(changes);
  if (validationErr) return validationErr;

  const supabase = createServiceRoleClient();

  // Fetch target agent (for snapshot + 404 + pre-existing pending check).
  const { agent, errorResponse } = await fetchAgentOr404(supabase, id);
  if (errorResponse) return errorResponse;

  const pending = await fetchPendingApproval(supabase, id);
  if (pending) {
    return NextResponse.json(
      {
        error: "PENDING_APPROVAL_EXISTS",
        message: "An update or delete approval is already pending for this agent.",
        approval_id: pending.approval_id,
      },
      { status: 409 },
    );
  }

  const target_snapshot = snapshotOf(agent!);
  const payload = {
    agent_id: id,
    changes,
    target_snapshot,
  };

  const { data: approval, error: insertErr } = await supabase
    .from("approvals")
    .insert({
      type: "update_agent",
      status: "pending",
      payload,
      target_type: "agent",
      target_id: null,
      requested_by_agent_id: null,
      requested_by_run_id: null,
      approver_human_id: approverHumanId(),
    })
    .select("id")
    .single();

  if (insertErr) {
    return NextResponse.json(
      { error: "db_error", message: insertErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ approval_id: approval!.id }, { status: 200 });
}

// ============================================================
// DELETE /api/agents/[id]  — insert delete_agent approval
// ============================================================

export async function DELETE(
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

  const supabase = createServiceRoleClient();
  const { agent, errorResponse } = await fetchAgentOr404(supabase, id);
  if (errorResponse) return errorResponse;

  const pending = await fetchPendingApproval(supabase, id);
  if (pending) {
    return NextResponse.json(
      {
        error: "PENDING_APPROVAL_EXISTS",
        message: "An update or delete approval is already pending for this agent.",
        approval_id: pending.approval_id,
      },
      { status: 409 },
    );
  }

  const target_snapshot = snapshotOf(agent!);
  const payload = {
    agent_id: id,
    slug: agent!.slug ?? id,
    target_snapshot,
  };

  const { data: approval, error: insertErr } = await supabase
    .from("approvals")
    .insert({
      type: "delete_agent",
      status: "pending",
      payload,
      target_type: "agent",
      target_id: null,
      requested_by_agent_id: null,
      requested_by_run_id: null,
      approver_human_id: approverHumanId(),
    })
    .select("id")
    .single();

  if (insertErr) {
    return NextResponse.json(
      { error: "db_error", message: insertErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ approval_id: approval!.id }, { status: 200 });
}

// ============================================================
// Helpers
// ============================================================

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

function validateChangesPatch(changes: Record<string, unknown>): NextResponse | null {
  if (Object.hasOwn(changes, "name")) {
    const v = changes.name;
    if (typeof v !== "string") {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", field: "name", message: "name must be a string." },
        { status: 400 },
      );
    }
    const err = validateAgentName(v);
    if (err) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", field: "name", message: err },
        { status: 400 },
      );
    }
  }

  if (Object.hasOwn(changes, "slug")) {
    const v = changes.slug;
    if (typeof v !== "string") {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", field: "slug", message: "slug must be a string." },
        { status: 400 },
      );
    }
    const err = validateAgentSlug(v);
    if (err) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", field: "slug", message: err },
        { status: 400 },
      );
    }
  }

  if (Object.hasOwn(changes, "soul_content")) {
    const v = changes.soul_content;
    if (v !== null && typeof v !== "string") {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          field: "soul_content",
          message: "soul_content must be a string or null.",
        },
        { status: 400 },
      );
    }
    if (typeof v === "string") {
      const err = validateSoulContent(v);
      if (err) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", field: "soul_content", message: err },
          { status: 400 },
        );
      }
    }
  }

  if (Object.hasOwn(changes, "avatar_url")) {
    const v = changes.avatar_url;
    if (v !== null && typeof v !== "string") {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          field: "avatar_url",
          message: "avatar_url must be a string or null.",
        },
        { status: 400 },
      );
    }
    if (typeof v === "string" && v.length > 0) {
      if (!isAllowedAvatarUrl(v)) {
        return NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            field: "avatar_url",
            reason: "unsupported_scheme",
            message: validateAvatarUrl(v) ?? "avatar_url must be http:// or https://",
          },
          { status: 400 },
        );
      }
    }
  }

  return null;
}

// Export pure helpers for POST route (/api/agents) to avoid duplication.
export const __helpers = {
  assertPlainObject,
  validateChangesPatch,
  snapshotOf,
  approverHumanId,
  kebabify,
} as const;
