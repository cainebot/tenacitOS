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

  // Identify the approver from the middleware-managed x-user-email header if
  // present; otherwise fall back to mc_auth owner (constant 'control-panel').
  const approverEmail =
    req.headers.get("x-user-email")?.trim().toLowerCase() ?? null;
  const approverHumanId = approverEmail ?? "control-panel";

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
