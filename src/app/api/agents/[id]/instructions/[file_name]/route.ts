// ============================================================
// Phase 69 Plan 10 — /api/agents/[id]/instructions/[file_name]
//
// Contract:
//   PATCH  body: { content?: string, icon?: string }
//     200 { approval_id, approval_url? } | { status:'updated', icon } | { icon_updated:true, content_approval_id }
//     400 INVALID_ID | INVALID_FILE_NAME | VALIDATION_ERROR | INVALID_ICON
//     400 UNSUPPORTED_PATH     (SOUL.md with content → routes through update_agent)
//     400 EMPTY_PATCH
//     401 unauthorized
//     403 INVALID_ORIGIN
//     404 AGENT_NOT_FOUND | FILE_NOT_FOUND
//     415 UNSUPPORTED_MEDIA_TYPE
//
//   DELETE
//     200 { approval_id }
//     400 INVALID_ID | INVALID_FILE_NAME | UNDELETABLE
//     401 unauthorized
//     403 INVALID_ORIGIN
//     404 AGENT_NOT_FOUND | FILE_NOT_FOUND
//     415 UNSUPPORTED_MEDIA_TYPE
//
// Icon-only PATCH is direct (visual-only, no approval). Content PATCH is
// approval-gated via direct `approvals` INSERT (same path as POST route).
// Both content + icon in one body: icon UPDATE executes first (fast), then
// content approval row is queued.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireMcAuth } from "@/lib/auth";
import { assertSameOriginJson } from "@/lib/csrf";
import { assertValidAgentId } from "@/lib/uuid";
import { createServiceRoleClient } from "@/lib/supabase";
import {
  assertValidFileName,
  isCanonicalDisplayName,
  resolveFileHandle,
} from "@/lib/agent-file-name";
import { ALLOWED_ICONS } from "@/lib/icon-whitelist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function approverHumanId(): string {
  return process.env.CIRCOS_DEPLOYMENT_ID ?? "control-panel";
}

// ============================================================
// PATCH
// ============================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; file_name: string }> },
): Promise<NextResponse> {
  const { id, file_name } = await params;

  const idErr = assertValidAgentId(id);
  if (idErr) return idErr;
  const fnErr = assertValidFileName(file_name);
  if (fnErr) return fnErr;

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

  const protoErr = assertPlainObject(body);
  if (protoErr) return protoErr;

  const payload = body as Record<string, unknown>;
  for (const k of Object.keys(payload)) {
    if (!["content", "icon"].includes(k)) {
      return NextResponse.json(
        { error: "FORBIDDEN_FIELD", message: `Unknown field '${k}'.` },
        { status: 400 },
      );
    }
  }

  const hasContent = Object.hasOwn(payload, "content");
  const hasIcon = Object.hasOwn(payload, "icon");
  if (!hasContent && !hasIcon) {
    return NextResponse.json(
      { error: "EMPTY_PATCH", message: "Provide content and/or icon." },
      { status: 400 },
    );
  }

  // Validate content.
  let content: string | undefined;
  if (hasContent) {
    const v = payload.content;
    if (typeof v !== "string" || v.length > 50_000) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          field: "content",
          message: "content must be a string ≤ 50 000 chars.",
        },
        { status: 400 },
      );
    }
    content = v;
  }

  // Validate icon.
  let icon: string | undefined;
  if (hasIcon) {
    const v = payload.icon;
    if (typeof v !== "string" || !ALLOWED_ICONS.has(v)) {
      return NextResponse.json(
        {
          error: "INVALID_ICON",
          field: "icon",
          message: "icon must be in the @untitledui/icons whitelist.",
        },
        { status: 400 },
      );
    }
    icon = v;
  }

  const handle = resolveFileHandle(file_name);
  if (!handle) {
    return NextResponse.json(
      { error: "INVALID_FILE_NAME", message: "file_name could not be resolved." },
      { status: 400 },
    );
  }

  // SOUL.md + content → 400 UNSUPPORTED_PATH (content must route through Plan 03).
  if (handle.kind === "soul" && content !== undefined) {
    return NextResponse.json(
      {
        error: "UNSUPPORTED_PATH",
        message:
          "Use PATCH /api/agents/[id] with {changes:{soul_content}} for SOUL.md content edits.",
        redirect: `/api/agents/${encodeURIComponent(id)}`,
      },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();

  // Agent existence + snapshot.
  const { data: agent, error: agentErr } = await supabase
    .from("agents")
    .select("agent_id, name, slug, avatar_url")
    .eq("agent_id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (agentErr) {
    return NextResponse.json({ error: "db_error", message: agentErr.message }, { status: 500 });
  }
  if (!agent) {
    return NextResponse.json(
      { error: "AGENT_NOT_FOUND", message: "Agent not found." },
      { status: 404 },
    );
  }

  // ============================================================
  // Branch A — icon-only (no content) → direct UPDATE, non-approval-gated.
  // ============================================================
  if (icon !== undefined && content === undefined) {
    return applyIconOnly(supabase, handle, id, icon, file_name);
  }

  // ============================================================
  // Branch B — both icon + content → icon UPDATE first, then queue content approval.
  // ============================================================
  if (icon !== undefined && content !== undefined) {
    const iconRes = await applyIconOnly(supabase, handle, id, icon, file_name);
    if (iconRes.status !== 200) return iconRes;
    const approvalRes = await queueContentApproval(supabase, handle, id, file_name, content, agent);
    if (approvalRes.approvalResponse.status !== 200) return approvalRes.approvalResponse;
    return NextResponse.json(
      {
        icon_updated: true,
        content_approval_id: approvalRes.approvalId,
      },
      { status: 200 },
    );
  }

  // ============================================================
  // Branch C — content-only → queue approval.
  // ============================================================
  const approvalRes = await queueContentApproval(
    supabase,
    handle,
    id,
    file_name,
    content as string,
    agent,
  );
  return approvalRes.approvalResponse;
}

// ============================================================
// DELETE
// ============================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; file_name: string }> },
): Promise<NextResponse> {
  const { id, file_name } = await params;

  const idErr = assertValidAgentId(id);
  if (idErr) return idErr;
  const fnErr = assertValidFileName(file_name);
  if (fnErr) return fnErr;

  const csrfErr = assertSameOriginJson(req, { requireContentType: false });
  if (csrfErr) return csrfErr;

  const auth = requireMcAuth(req);
  if (!auth.ok) return auth.response!;

  // Canonical / SOUL.md → 400 UNDELETABLE.
  if (isCanonicalDisplayName(file_name)) {
    return NextResponse.json(
      {
        error: "UNDELETABLE",
        message: "This is a canonical file and cannot be deleted.",
      },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();

  const { data: agent, error: agentErr } = await supabase
    .from("agents")
    .select("agent_id, name, slug, avatar_url")
    .eq("agent_id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (agentErr) {
    return NextResponse.json({ error: "db_error", message: agentErr.message }, { status: 500 });
  }
  if (!agent) {
    return NextResponse.json(
      { error: "AGENT_NOT_FOUND", message: "Agent not found." },
      { status: 404 },
    );
  }

  const { data: file, error: fileErr } = await supabase
    .from("agent_instructions")
    .select("content, icon")
    .eq("agent_id", id)
    .eq("file_name", file_name)
    .maybeSingle();
  if (fileErr) {
    return NextResponse.json({ error: "db_error", message: fileErr.message }, { status: 500 });
  }
  if (!file) {
    return NextResponse.json(
      { error: "FILE_NOT_FOUND", message: "File not found for this agent." },
      { status: 404 },
    );
  }

  const agentRow = agent as { name?: string | null; slug?: string | null; avatar_url?: string | null };
  const fileRow = file as { content?: string | null; icon?: string | null };
  const priorLen = typeof fileRow.content === "string" ? fileRow.content.length : 0;
  const priorIcon = typeof fileRow.icon === "string" ? fileRow.icon : "FileCheck02";

  const approvalPayload = {
    agent_id: id,
    file_name,
    target_snapshot: {
      agent_name: agentRow.name ?? null,
      agent_slug: agentRow.slug ?? null,
      agent_avatar_url: agentRow.avatar_url ?? null,
      file_icon: priorIcon,
      prior_content_length: priorLen,
    },
  };

  const { data: approval, error: insErr } = await supabase
    .from("approvals")
    .insert({
      type: "delete_user_instruction",
      status: "pending",
      payload: approvalPayload,
      target_type: "agent_instructions",
      target_id: null,
      requested_by_agent_id: null,
      requested_by_run_id: null,
      approver_human_id: approverHumanId(),
    })
    .select("id")
    .single();
  if (insErr) {
    return NextResponse.json(
      { error: "db_error", message: insErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ approval_id: approval!.id }, { status: 200 });
}

// ============================================================
// Helpers
// ============================================================

async function applyIconOnly(
  supabase: ReturnType<typeof createServiceRoleClient>,
  handle: ReturnType<typeof resolveFileHandle>,
  agentId: string,
  icon: string,
  fileName: string,
): Promise<NextResponse> {
  if (!handle) {
    return NextResponse.json({ error: "INVALID_FILE_NAME" }, { status: 400 });
  }
  if (handle.kind === "soul") {
    const { error } = await supabase
      .from("agents")
      .update({ icon })
      .eq("agent_id", agentId);
    if (error) {
      return NextResponse.json({ error: "db_error", message: error.message }, { status: 500 });
    }
    return NextResponse.json({ status: "updated", icon }, { status: 200 });
  }
  if (handle.kind === "canonical") {
    const { error } = await supabase
      .from("agent_identity_files")
      .update({ icon })
      .eq("agent_id", agentId)
      .eq("file_type", handle.fileType);
    if (error) {
      return NextResponse.json({ error: "db_error", message: error.message }, { status: 500 });
    }
    return NextResponse.json({ status: "updated", icon }, { status: 200 });
  }
  // user
  const { error } = await supabase
    .from("agent_instructions")
    .update({ icon })
    .eq("agent_id", agentId)
    .eq("file_name", fileName);
  if (error) {
    return NextResponse.json({ error: "db_error", message: error.message }, { status: 500 });
  }
  return NextResponse.json({ status: "updated", icon }, { status: 200 });
}

async function queueContentApproval(
  supabase: ReturnType<typeof createServiceRoleClient>,
  handle: ReturnType<typeof resolveFileHandle>,
  agentId: string,
  fileName: string,
  content: string,
  agentRowRaw: unknown,
): Promise<{ approvalResponse: NextResponse; approvalId?: string }> {
  if (!handle) {
    return {
      approvalResponse: NextResponse.json(
        { error: "INVALID_FILE_NAME" },
        { status: 400 },
      ),
    };
  }
  if (handle.kind === "soul") {
    // Should not happen — guarded earlier.
    return {
      approvalResponse: NextResponse.json(
        { error: "UNSUPPORTED_PATH", message: "Use PATCH /api/agents/[id]." },
        { status: 400 },
      ),
    };
  }

  const agentRow = agentRowRaw as {
    name?: string | null;
    slug?: string | null;
    avatar_url?: string | null;
  };

  if (handle.kind === "canonical") {
    // Pre-flight SELECT for snapshot embedding.
    const { data: file, error: fileErr } = await supabase
      .from("agent_identity_files")
      .select("content, icon")
      .eq("agent_id", agentId)
      .eq("file_type", handle.fileType)
      .maybeSingle();
    if (fileErr) {
      return {
        approvalResponse: NextResponse.json(
          { error: "db_error", message: fileErr.message },
          { status: 500 },
        ),
      };
    }
    if (!file) {
      return {
        approvalResponse: NextResponse.json(
          { error: "FILE_NOT_FOUND", message: "Canonical file row missing." },
          { status: 404 },
        ),
      };
    }
    const row = file as { content?: string | null; icon?: string | null };
    const approvalPayload = {
      agent_id: agentId,
      file_type: handle.fileType,
      content,
      target_snapshot: {
        agent_name: agentRow.name ?? null,
        agent_slug: agentRow.slug ?? null,
        agent_avatar_url: agentRow.avatar_url ?? null,
        file_icon: typeof row.icon === "string" ? row.icon : "FileCheck02",
        prior_content:
          typeof row.content === "string" ? row.content.slice(0, 2000) : "",
      },
    };
    const { data: approval, error: insErr } = await supabase
      .from("approvals")
      .insert({
        type: "update_identity_file_content",
        status: "pending",
        payload: approvalPayload,
        target_type: "agent_identity_files",
        target_id: null,
        requested_by_agent_id: null,
        requested_by_run_id: null,
        approver_human_id: approverHumanId(),
      })
      .select("id")
      .single();
    if (insErr) {
      return {
        approvalResponse: NextResponse.json(
          { error: "db_error", message: insErr.message },
          { status: 500 },
        ),
      };
    }
    return {
      approvalResponse: NextResponse.json(
        { approval_id: approval!.id },
        { status: 200 },
      ),
      approvalId: approval!.id as string,
    };
  }

  // user-created branch
  const { data: file, error: fileErr } = await supabase
    .from("agent_instructions")
    .select("content, content_version, icon")
    .eq("agent_id", agentId)
    .eq("file_name", fileName)
    .maybeSingle();
  if (fileErr) {
    return {
      approvalResponse: NextResponse.json(
        { error: "db_error", message: fileErr.message },
        { status: 500 },
      ),
    };
  }
  if (!file) {
    return {
      approvalResponse: NextResponse.json(
        { error: "FILE_NOT_FOUND", message: "User-created file not found." },
        { status: 404 },
      ),
    };
  }
  const row = file as {
    content?: string | null;
    content_version?: number;
    icon?: string | null;
  };
  const approvalPayload = {
    agent_id: agentId,
    file_name: fileName,
    content,
    target_snapshot: {
      agent_name: agentRow.name ?? null,
      agent_slug: agentRow.slug ?? null,
      agent_avatar_url: agentRow.avatar_url ?? null,
      file_icon: typeof row.icon === "string" ? row.icon : "FileCheck02",
      prior_content:
        typeof row.content === "string" ? row.content.slice(0, 2000) : "",
      prior_version: typeof row.content_version === "number" ? row.content_version : 1,
    },
  };
  const { data: approval, error: insErr } = await supabase
    .from("approvals")
    .insert({
      type: "update_user_instruction_content",
      status: "pending",
      payload: approvalPayload,
      target_type: "agent_instructions",
      target_id: null,
      requested_by_agent_id: null,
      requested_by_run_id: null,
      approver_human_id: approverHumanId(),
    })
    .select("id")
    .single();
  if (insErr) {
    return {
      approvalResponse: NextResponse.json(
        { error: "db_error", message: insErr.message },
        { status: 500 },
      ),
    };
  }
  return {
    approvalResponse: NextResponse.json({ approval_id: approval!.id }, { status: 200 }),
    approvalId: approval!.id as string,
  };
}

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
