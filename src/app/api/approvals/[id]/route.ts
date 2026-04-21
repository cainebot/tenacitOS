// Phase 68 Plan 06 Task 5 — PATCH /api/approvals/[id]
//
// Transitions an approval row to a terminal status (approved, rejected)
// or back to revision_requested. The Phase 68 Plan 02 BEFORE-UPDATE
// trigger on `approvals` then dispatches the real-world side effect
// (agent create/delete/update/message) inside the same transaction, so
// the API layer here is deliberately thin.
//
// Auth
// ----
// The control-panel global middleware already requires the mc_auth
// cookie for every request under /api/** (see src/middleware.ts). That
// is the "authenticated human" gate. This route does the DB write with
// the service-role client — RLS policy `approvals_human_update`
// (migration 028) allows authenticated role only, but we intentionally
// bypass RLS via service_role here because mc_auth is the canonical
// control-panel auth and does not mint a Supabase session.
//
// BL-01 (Phase 68 POST-EXEC review) — approver identity is derived
// server-side, NEVER from the client-supplied `x-user-email` header.
// Rationale: `mc_auth` is a shared deployment-scoped secret (all humans
// using the Admin Panel share the same cookie value); it has no binding
// to a specific email. Trusting a client header to stamp
// `approver_human_id` would let any holder of mc_auth impersonate any
// admin in the audit trail. Until a real auth provider (Supabase
// Auth, Phase 69+) mints per-human sessions, we record the audit trail
// as a stable deployment-scoped identity `system:<deployment>` where
// <deployment> comes from CIRCOS_DEPLOYMENT_ID (falls back to
// "control-panel"). This is a bounded, documented contract: the audit
// field answers "which Admin Panel instance approved this" rather than
// "which human", which is correct given the current auth model.
//
// The update is idempotent (Paperclip pattern): the WHERE clause only
// matches rows whose current status is still in ('pending',
// 'revision_requested'), so retries after the trigger has run are safe
// no-ops (rowCount=0 → 409 conflict).
//
// T-68-06-CSRF: mc_auth cookie is SameSite by Next.js default + the
// middleware rejects missing cookies with 401. No explicit token.
import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import type {
  ApprovalAction,
  ApprovalPatchBody,
  ApprovalPatchResponse,
  ApprovalStatus,
} from "@/types/approval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ACTIONS: readonly ApprovalAction[] = [
  "approve",
  "reject",
  "request_revision",
] as const;

function actionToStatus(action: ApprovalAction): ApprovalStatus {
  switch (action) {
    case "approve": return "approved";
    case "reject": return "rejected";
    case "request_revision": return "revision_requested";
  }
}

function isTerminal(status: ApprovalStatus): boolean {
  return status === "approved" || status === "rejected";
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApprovalPatchResponse>> {
  // ME-02 (POST-EXEC) — defense-in-depth CSRF check on top of SameSite
  // cookie behaviour. Require the request Origin to match this app's
  // origin. A cross-site attacker cannot spoof Origin in a fetch, so
  // this defeats any stray CORS / redirect pivot that a subtle
  // SameSite=Lax on `mc_auth` would leave exposed.
  const origin = req.headers.get("origin");
  if (origin !== null) {
    try {
      const expected = req.nextUrl.origin;
      if (origin !== expected) {
        return NextResponse.json(
          { ok: false, error: "bad_origin", message: "cross-origin PATCH denied" },
          { status: 403 },
        );
      }
    } catch {
      // nextUrl.origin unavailable — conservative allow only when no Origin header.
    }
  }

  const { id } = await context.params;

  if (!id || typeof id !== "string" || id.length > 64) {
    return NextResponse.json(
      { ok: false, error: "invalid_id", message: "invalid approval id" },
      { status: 400 },
    );
  }

  let body: ApprovalPatchBody;
  try {
    body = (await req.json()) as ApprovalPatchBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json", message: "body must be JSON" },
      { status: 400 },
    );
  }

  if (!body || !VALID_ACTIONS.includes(body.action)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_action",
        message: `action must be one of: ${VALID_ACTIONS.join(", ")}`,
      },
      { status: 400 },
    );
  }

  if (
    body.decision_note !== undefined &&
    (typeof body.decision_note !== "string" || body.decision_note.length > 4000)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_decision_note",
        message: "decision_note must be a string ≤ 4000 chars",
      },
      { status: 400 },
    );
  }

  const newStatus = actionToStatus(body.action);
  const decisionNote =
    typeof body.decision_note === "string" && body.decision_note.trim() !== ""
      ? body.decision_note.trim()
      : null;

  // BL-01 — Do NOT trust `x-user-email`. `mc_auth` is a shared secret with
  // no binding to a specific human, so any holder can forge any email.
  // Until Phase 69 Supabase Auth lands, stamp a deployment-scoped identity
  // instead. This records "which control-panel deployment approved" — the
  // only non-forgeable fact we have today.
  const deploymentId =
    process.env.CIRCOS_DEPLOYMENT_ID?.trim() || "control-panel";
  const approverHumanId = `system:${deploymentId}`;

  try {
    const sb = createServiceRoleClient();
    const patch: Record<string, unknown> = {
      status: newStatus,
      approver_human_id: approverHumanId,
    };
    if (decisionNote !== null) {
      patch.decision_note = decisionNote;
    }
    if (isTerminal(newStatus)) {
      patch.resolved_at = new Date().toISOString();
    }

    // Idempotent: only update rows still in the active set so retries after
    // the trigger has fired are no-ops.
    const { data, error } = await sb
      .from("approvals")
      .update(patch)
      .eq("id", id)
      .in("status", ["pending", "revision_requested"])
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: "db_error", message: error.message },
        { status: 500 },
      );
    }
    if (!data) {
      // Either the id doesn't exist or the row is already terminal.
      return NextResponse.json(
        {
          ok: false,
          error: "conflict",
          message:
            "approval not found or already resolved (cannot transition non-active row)",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true, approval: data }, { status: 200 });
  } catch (e) {
    const message = (e as Error).message ?? "unknown";
    return NextResponse.json(
      { ok: false, error: "unexpected", message },
      { status: 500 },
    );
  }
}
