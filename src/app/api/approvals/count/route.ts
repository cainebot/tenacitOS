// Phase 68 Plan 08 Task 3 — GET /api/approvals/count.
//
// Lightweight counter for the sidebar badge. Same auth + service-role
// pattern as `GET /api/approvals`: `mc_auth` gate (middleware + inline
// `requireMcAuth()`) and service-role client to bypass the
// `auth.role()='authenticated'` RLS constraint that the browser anon
// session cannot satisfy.
//
// Uses `count: 'exact', head: true` so the database returns only the
// count (no rows shipped). Polling-friendly.
//
// Contract:
//   GET /api/approvals/count
//   → 200 { ok: true, count: number }
//   → 401 { ok: false, error: 'unauthorized' }
//   → 500 { ok: false, error: 'db_error' | 'unexpected' }

import { NextResponse, type NextRequest } from "next/server";
import { requireMcAuth } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase";
import { ACTIVE_APPROVAL_STATUSES } from "@/types/approval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireMcAuth(req);
  if (!auth.ok) return auth.response!;

  try {
    const sb = createServiceRoleClient();
    const { count, error } = await sb
      .from("approvals")
      .select("id", { count: "exact", head: true })
      .in("status", ACTIVE_APPROVAL_STATUSES as string[]);

    if (error) {
      return NextResponse.json(
        { ok: false, error: "db_error", message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, count: count ?? 0 }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "unexpected", message: (e as Error).message ?? "unknown" },
      { status: 500 },
    );
  }
}
