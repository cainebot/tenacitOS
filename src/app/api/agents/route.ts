// ============================================================
// Phase 69-03 — /api/agents (REWRITE — replaces legacy
// openclaw.json reader that powered the Phase 9 dashboard).
//
// Authoritative list source for the Phase 69 `/agents` UI. Consumed by
// Plan 02's `/agents/page.tsx` (fetch on mount + re-fetch on realtime
// delta) and by Plan 06 bulk-approval renderers (?ids=a,b,c batch).
//
// Contract:
//   GET /api/agents?include_archived=1&ids=a,b,c
//     200 { agents: AgentRow[] }
//     400 INVALID_ID | TOO_MANY_IDS
//     401 unauthorized
//     403 INVALID_ORIGIN              — cross-origin (SECURITY T5)
//
//   POST /api/agents  body: { name, slug?, soul_content?, avatar_url? }
//     200 { approval_id }             — create_agent approval inserted
//     400 VALIDATION_ERROR | FORBIDDEN_FIELD
//     401 unauthorized
//     403 INVALID_ORIGIN              — CSRF (SECURITY T4)
//     409 SLUG_CONFLICT               — slug already exists
//     415 UNSUPPORTED_MEDIA_TYPE
//
// Legacy Phase 9 callers on `/api/agents/[id]/messages`, `/status`,
// `/skills`, `/attention`, `/photo` are unaffected (those subpaths
// stay on their own route.ts files). The `/api/agents/list` route
// still serves dropdowns (Phase 9 board selector).
//
// Security:
//   - GET calls assertSameOriginJson(req, {requireContentType: false})
//     because the row set includes adapter_config, permissions,
//     soul_content which may carry tokens (SECURITY T5).
//   - POST calls assertSameOriginJson(req) (CSRF + Content-Type,
//     SECURITY T4).
//   - Body guarded against prototype-pollution (T7).
//   - avatar_url restricted to http(s) (T9 via isAllowedAvatarUrl).
//   - Forbidden fields rejected (T7 via rejectForbiddenFields).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireMcAuth } from "@/lib/auth";
import { assertSameOriginJson } from "@/lib/csrf";
import { isValidAgentId } from "@/lib/uuid";
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IDS = 100;

function approverHumanId(): string {
  return process.env.CIRCOS_DEPLOYMENT_ID ?? "control-panel";
}

// ============================================================
// GET /api/agents
// ============================================================

export async function GET(req: NextRequest): Promise<NextResponse> {
  // SECURITY T5: Origin check even on GET (row includes adapter_config
  // / permissions / soul_content which may contain tokens).
  const csrfErr = assertSameOriginJson(req, { requireContentType: false });
  if (csrfErr) return csrfErr;

  const auth = requireMcAuth(req);
  if (!auth.ok) return auth.response!;

  const params = req.nextUrl.searchParams;
  const includeArchived = params.get("include_archived") === "1";
  const rawIds = params.get("ids");

  let idsFilter: string[] | null = null;
  if (rawIds !== null) {
    const parts = rawIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length > MAX_IDS) {
      return NextResponse.json(
        {
          error: "TOO_MANY_IDS",
          message: `At most ${MAX_IDS} ids may be batched in a single request.`,
        },
        { status: 400 },
      );
    }

    for (const id of parts) {
      if (!isValidAgentId(id)) {
        return NextResponse.json(
          {
            error: "INVALID_ID",
            message: `Invalid id token: ${id}`,
          },
          { status: 400 },
        );
      }
    }
    idsFilter = parts;
  }

  const supabase = createServiceRoleClient();
  let query = supabase.from("agents").select("*").order("name", { ascending: true });

  if (!includeArchived) {
    query = query.is("deleted_at", null);
  }

  if (idsFilter != null) {
    if (idsFilter.length === 0) {
      return NextResponse.json({ agents: [] }, { status: 200 });
    }
    query = query.in("agent_id", idsFilter);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { agents: (data ?? []) as AgentRow[] },
    { status: 200 },
  );
}

// ============================================================
// POST /api/agents  — insert create_agent approval
// ============================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  // SECURITY T4: CSRF origin + Content-Type enforcement.
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

  // SECURITY T7 hardening — prototype-pollution guard.
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

  const payload = body as Record<string, unknown>;

  // Forbidden-field check: reject any key not in EDITABLE_AGENT_FIELDS.
  const forbiddenErr = rejectForbiddenFields(payload);
  if (forbiddenErr) {
    return NextResponse.json(
      { error: "FORBIDDEN_FIELD", message: forbiddenErr },
      { status: 400 },
    );
  }

  // Name is required.
  const nameRaw = payload.name;
  if (typeof nameRaw !== "string") {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        field: "name",
        message: "name is required and must be a string.",
      },
      { status: 400 },
    );
  }
  const nameErr = validateAgentName(nameRaw);
  if (nameErr) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", field: "name", message: nameErr },
      { status: 400 },
    );
  }
  const name = nameRaw.trim();

  // Slug: optional, auto-kebab from name.
  let slug: string;
  if (Object.hasOwn(payload, "slug") && payload.slug !== undefined) {
    if (typeof payload.slug !== "string") {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", field: "slug", message: "slug must be a string." },
        { status: 400 },
      );
    }
    slug = payload.slug.trim();
  } else {
    slug = kebabify(name);
  }
  const slugErr = validateAgentSlug(slug);
  if (slugErr) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", field: "slug", message: slugErr },
      { status: 400 },
    );
  }

  // soul_content: optional string ≤ 50 000 chars.
  let soulContent: string | null = null;
  if (Object.hasOwn(payload, "soul_content") && payload.soul_content !== undefined) {
    const v = payload.soul_content;
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
      soulContent = v;
    }
  }

  // avatar_url: optional http/https only (SECURITY T9).
  let avatarUrl: string | null = null;
  if (Object.hasOwn(payload, "avatar_url") && payload.avatar_url !== undefined) {
    const v = payload.avatar_url;
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
      avatarUrl = v;
    }
  }

  // Slug conflict pre-check (the dispatcher also enforces on apply).
  const supabase = createServiceRoleClient();
  const { data: existing, error: lookupErr } = await supabase
    .from("agents")
    .select("agent_id")
    .eq("slug", slug)
    .maybeSingle();
  if (lookupErr) {
    return NextResponse.json(
      { error: "db_error", message: lookupErr.message },
      { status: 500 },
    );
  }
  if (existing) {
    return NextResponse.json(
      { error: "SLUG_CONFLICT", message: "An agent with this slug already exists." },
      { status: 409 },
    );
  }

  // target_snapshot mirrors Plan 03 L51: embed the approved-shape in
  // the payload so Plan 06 create renderer can show the proposed agent
  // without a secondary fetch. `bound_node_id` / `preferred_node_id`
  // are null at create time.
  const target_snapshot = {
    name,
    slug,
    avatar_url: avatarUrl,
    bound_node_id: null as string | null,
    preferred_node_id: null as string | null,
  };

  // Dispatcher (migration 036) reads payload.agent_id; we set it to
  // the slug (which is also the TEXT PK for new agents per D-04).
  const approvalPayload = {
    agent_id: slug,
    slug,
    name,
    soul_content: soulContent,
    avatar_url: avatarUrl,
    target_snapshot,
  };

  const { data: approval, error: insertErr } = await supabase
    .from("approvals")
    .insert({
      type: "create_agent",
      status: "pending",
      payload: approvalPayload,
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

  // Ensure the POST body-iteration discipline: only whitelisted fields
  // reached the dispatcher. Defense-in-depth audit (local tests cover
  // this).
  const sentKeys = Object.keys(payload).filter((k) => Object.hasOwn(payload, k));
  for (const k of sentKeys) {
    if (!(EDITABLE_AGENT_FIELDS as readonly string[]).includes(k)) {
      // Should have been rejected earlier; hard-fail audit if it
      // slipped through.
      console.error(
        `[api/agents] POST forbidden key '${k}' leaked past validator — approval_id=${approval!.id}`,
      );
    }
  }

  return NextResponse.json({ approval_id: approval!.id }, { status: 200 });
}
