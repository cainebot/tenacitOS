// Phase 68 Plan 05 Task 5 — admin endpoint for "Reset seeds".
//
// POST /api/admin/reset-seeds
//
// Restores the 7 canonical seed agents (gangle, jax, kaufmo, kinger,
// pomni, ragatha, zooble) to the alive state using the pure `resetSeeds`
// core from `@circos/cli-connect/scripts/reset-seeds`.
//
// Phase 68 ships this as a STUB — the UI "Reset seeds" button on /agents
// lands in Phase 69. The endpoint is safe to call manually (curl / admin
// dashboard) in the meantime.
//
// Auth gate (T-68-05-ADMIN-LEAK):
//   - ADMIN_EMAILS env (comma-separated) MUST be set.
//   - Caller supplies `x-user-email` header.
//   - Header value must be in the allowlist. Otherwise 403.
//
// This matches the temporary gate shipped in
// /api/admin/error-messages (64.5.2-05). Both migrate to Supabase Auth
// session-backed admin claims post-v1.9.
//
// Runs on the Node.js runtime (service-role Supabase client requires it;
// filesystem reads of agents/<slug>/SOUL.md do too).
import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { resetSeeds } from "@circos/cli-connect/scripts/reset-seeds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(req: NextRequest): { ok: boolean; email?: string } {
  const adminEmailsRaw = process.env.ADMIN_EMAILS ?? "";
  const allow = adminEmailsRaw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allow.length === 0) return { ok: false };
  const headerEmail = req.headers.get("x-user-email")?.trim().toLowerCase();
  if (!headerEmail) return { ok: false };
  if (!allow.includes(headerEmail)) return { ok: false, email: headerEmail };
  return { ok: true, email: headerEmail };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gate = isAdmin(req);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "forbidden", message: "admin access required" },
      { status: 403 },
    );
  }

  try {
    const sb = createServiceRoleClient();
    const out = await resetSeeds({ sb });
    const status =
      out.errors.length > 0
        ? 207 /* Multi-Status — partial success */
        : 200;
    return NextResponse.json(out, { status });
  } catch (e) {
    const message = (e as Error).message ?? "unknown";
    return NextResponse.json(
      { error: "reset_seeds_failed", message },
      { status: 500 },
    );
  }
}
