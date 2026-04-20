// ============================================================
// Phase 69 Plan 10 — /api/agents/[id]/instructions
//
// Contract:
//   GET    /api/agents/[id]/instructions
//     200 { files: InstructionFileRow[] }
//     400 INVALID_ID
//     401 unauthorized
//     403 INVALID_ORIGIN
//     404 AGENT_NOT_FOUND
//
//   POST   /api/agents/[id]/instructions
//     body: { file_name, icon?, content? }
//     200 { approval_id }
//     400 INVALID_ID | VALIDATION_ERROR | INVALID_ICON | RESERVED_NAME | FORBIDDEN_FIELD
//     401 unauthorized
//     403 INVALID_ORIGIN
//     404 AGENT_NOT_FOUND
//     409 DUPLICATE_FILE
//     415 UNSUPPORTED_MEDIA_TYPE
//
// GET merges:
//   - SOUL.md  (synthesized from agents.soul_content + agents.icon)
//   - canonical 6 file_types from agent_identity_files (v1.9 hides
//     `user` + `identity` per memory feedback_no_frontend_aesthetic_changes)
//   - user-created rows from agent_instructions, alphabetical
//
// POST writes an `approvals` row of type `create_user_instruction`
// (same direct-insert pattern as Plan 03 `POST /api/agents`, since
// route handlers and MCP tools both terminate at the same dispatcher).
// The dispatcher (migration 040) materializes the INSERT into
// agent_instructions on approve.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireMcAuth } from "@/lib/auth";
import { assertSameOriginJson } from "@/lib/csrf";
import { assertValidAgentId } from "@/lib/uuid";
import { createServiceRoleClient } from "@/lib/supabase";
import {
  FILE_NAME_REGEX,
  isReservedName,
  canonicalTypeToDisplayName,
} from "@/lib/agent-file-name";
import { ALLOWED_ICONS } from "@/lib/icon-whitelist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface InstructionFileRow {
  file_name: string;
  icon: string;
  content: string;
  is_canonical: boolean;
  file_type?: string;
  updated_at: string;
}

function approverHumanId(): string {
  return process.env.CIRCOS_DEPLOYMENT_ID ?? "control-panel";
}

// ============================================================
// GET
// ============================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const idErr = assertValidAgentId(id);
  if (idErr) return idErr;

  // SECURITY T5: row set includes file content; Origin check mandatory.
  const csrfErr = assertSameOriginJson(req, { requireContentType: false });
  if (csrfErr) return csrfErr;

  const auth = requireMcAuth(req);
  if (!auth.ok) return auth.response!;

  const supabase = createServiceRoleClient();

  // 1. Agent lookup + SOUL.md synthesis fields.
  const { data: agent, error: agentErr } = await supabase
    .from("agents")
    .select("agent_id, name, slug, avatar_url, soul_content, icon")
    .eq("agent_id", id)
    .maybeSingle();
  if (agentErr) {
    return NextResponse.json(
      { error: "db_error", message: agentErr.message },
      { status: 500 },
    );
  }
  if (!agent) {
    return NextResponse.json(
      { error: "AGENT_NOT_FOUND", message: "Agent not found." },
      { status: 404 },
    );
  }

  // 2. Canonical file_types (excluding 'soul'; v1.9 also hides 'user' + 'identity').
  const { data: identityRows, error: idErr2 } = await supabase
    .from("agent_identity_files")
    .select("file_type, icon, content, updated_at")
    .eq("agent_id", id)
    .neq("file_type", "soul")
    .order("file_type", { ascending: true });
  if (idErr2) {
    return NextResponse.json(
      { error: "db_error", message: idErr2.message },
      { status: 500 },
    );
  }

  // 3. User-created rows.
  const { data: userRows, error: userErr } = await supabase
    .from("agent_instructions")
    .select("file_name, icon, content, updated_at")
    .eq("agent_id", id)
    .order("file_name", { ascending: true });
  if (userErr) {
    return NextResponse.json(
      { error: "db_error", message: userErr.message },
      { status: 500 },
    );
  }

  // 4. Merge: SOUL.md first, canonicals (hiding user+identity) alphabetically,
  //    user-created alphabetically.
  const agentRow = agent as {
    icon?: string | null;
    soul_content?: string | null;
    name?: string | null;
    slug?: string | null;
  };
  const soulRow: InstructionFileRow = {
    file_name: "SOUL.md",
    icon: typeof agentRow.icon === "string" && agentRow.icon.length > 0
      ? agentRow.icon
      : "FileHeart02",
    content: typeof agentRow.soul_content === "string" ? agentRow.soul_content : "",
    is_canonical: true,
    file_type: "soul",
    updated_at: new Date().toISOString(),
  };

  const canonicalRows: InstructionFileRow[] = ((identityRows ?? []) as Array<{
    file_type: string;
    icon: string | null;
    content: string;
    updated_at: string;
  }>)
    .filter((row) => row.file_type !== "user" && row.file_type !== "identity")
    .map((row) => ({
      file_name: canonicalTypeToDisplayName(row.file_type),
      icon: typeof row.icon === "string" && row.icon.length > 0 ? row.icon : "FileCheck02",
      content: row.content ?? "",
      is_canonical: true,
      file_type: row.file_type,
      updated_at: row.updated_at,
    }));

  const userFiles: InstructionFileRow[] = ((userRows ?? []) as Array<{
    file_name: string;
    icon: string;
    content: string;
    updated_at: string;
  }>).map((row) => ({
    file_name: row.file_name,
    icon: typeof row.icon === "string" && row.icon.length > 0 ? row.icon : "FileCheck02",
    content: row.content ?? "",
    is_canonical: false,
    updated_at: row.updated_at,
  }));

  const files: InstructionFileRow[] = [soulRow, ...canonicalRows, ...userFiles];

  return NextResponse.json({ files }, { status: 200 });
}

// ============================================================
// POST — insert create_user_instruction approval
// ============================================================

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  // SECURITY T7 — prototype-pollution guard.
  const protoErr = assertPlainObject(body);
  if (protoErr) return protoErr;

  const payload = body as Record<string, unknown>;

  // Whitelist: only file_name / icon / content are accepted. Anything else rejected.
  for (const k of Object.keys(payload)) {
    if (!["file_name", "icon", "content"].includes(k)) {
      return NextResponse.json(
        { error: "FORBIDDEN_FIELD", message: `Unknown field '${k}'.` },
        { status: 400 },
      );
    }
  }

  const fileName = payload.file_name;
  if (typeof fileName !== "string" || fileName.length === 0 || fileName.length > 64) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        field: "file_name",
        message: "file_name must be a 1-64 char string ending in `.md`.",
      },
      { status: 400 },
    );
  }
  if (!FILE_NAME_REGEX.test(fileName)) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        field: "file_name",
        message: "file_name must match ^[A-Za-z0-9_-]+\\.md$",
      },
      { status: 400 },
    );
  }

  // Defense-in-depth: explicit RESERVED_NAME reject (mirrors the Zod refine
  // in the MCP tool + DB CHECK constraint).
  if (isReservedName(fileName)) {
    return NextResponse.json(
      {
        error: "RESERVED_NAME",
        field: "file_name",
        message:
          "file_name shadows a canonical file_type (soul/agents/user/identity/tools/heartbeat/memory/memoy).",
      },
      { status: 400 },
    );
  }

  // Icon validation (Zod refine would reject at MCP layer; explicit here for
  // clear error code).
  const iconRaw = payload.icon;
  let icon = "FileCheck02";
  if (iconRaw !== undefined) {
    if (typeof iconRaw !== "string" || !ALLOWED_ICONS.has(iconRaw)) {
      return NextResponse.json(
        {
          error: "INVALID_ICON",
          field: "icon",
          message: "icon must be in the @untitledui/icons whitelist.",
        },
        { status: 400 },
      );
    }
    icon = iconRaw;
  }

  // Content validation.
  let content = "";
  if (payload.content !== undefined) {
    if (typeof payload.content !== "string" || payload.content.length > 50_000) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          field: "content",
          message: "content must be a string ≤ 50 000 chars.",
        },
        { status: 400 },
      );
    }
    content = payload.content;
  }

  const supabase = createServiceRoleClient();

  // Agent existence check.
  const { data: agent, error: agentErr } = await supabase
    .from("agents")
    .select("agent_id, name, slug, avatar_url")
    .eq("agent_id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (agentErr) {
    return NextResponse.json(
      { error: "db_error", message: agentErr.message },
      { status: 500 },
    );
  }
  if (!agent) {
    return NextResponse.json(
      { error: "AGENT_NOT_FOUND", message: "Agent not found." },
      { status: 404 },
    );
  }

  // Duplicate pre-check.
  const { data: existing, error: dupErr } = await supabase
    .from("agent_instructions")
    .select("id")
    .eq("agent_id", id)
    .eq("file_name", fileName)
    .maybeSingle();
  if (dupErr) {
    return NextResponse.json(
      { error: "db_error", message: dupErr.message },
      { status: 500 },
    );
  }
  if (existing) {
    return NextResponse.json(
      { error: "DUPLICATE_FILE", message: "A file with that name already exists for this agent." },
      { status: 409 },
    );
  }

  const agentRow = agent as { name?: string | null; slug?: string | null; avatar_url?: string | null };
  const approvalPayload = {
    agent_id: id,
    file_name: fileName,
    icon,
    content,
    target_snapshot: {
      agent_name: agentRow.name ?? null,
      agent_slug: agentRow.slug ?? null,
      agent_avatar_url: agentRow.avatar_url ?? null,
    },
  };

  const { data: approval, error: insErr } = await supabase
    .from("approvals")
    .insert({
      type: "create_user_instruction",
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
