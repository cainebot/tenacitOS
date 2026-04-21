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
// Auth gate (BL-01 — Phase 68 POST-EXEC):
//   - `mc_auth` shared cookie (middleware) is NOT sufficient by itself:
//     all humans share the same secret, and a client-supplied
//     `x-user-email` header is trivially forgeable. Per the post-exec
//     review, this endpoint moves to a separate, server-held token.
//   - Require `Authorization: Bearer <ADMIN_TOKEN>` (env, never sent to
//     the browser). No header token → 403. Matches the "operator-only"
//     contract; the /agents UI button will call this via a server-side
//     proxy that holds ADMIN_TOKEN, not directly from the browser.
//   - The previous `ADMIN_EMAILS` + `x-user-email` header gate is
//     removed: impossible to authenticate a specific human behind the
//     shared mc_auth cookie without Supabase Auth. Phase 69 will switch
//     this to a real session-backed admin claim.
//
// Runs on the Node.js runtime (service-role Supabase client requires it;
// filesystem reads of agents/<slug>/SOUL.md do too).
import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { resetSeeds } from "@circos/cli-connect/scripts/reset-seeds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * BL-01 — server-held bearer token gate. Replaces the spoofable
 * `x-user-email` allowlist. ADMIN_TOKEN is set only in server env and
 * never shipped to the browser; callers are operator tooling or a
 * server-side proxy that holds the token on behalf of the UI button.
 * Uses constant-time comparison to avoid timing oracle on the token.
 */
function isAdmin(req: NextRequest): { ok: boolean } {
  const expected = process.env.ADMIN_TOKEN?.trim();
  if (!expected || expected.length < 16) return { ok: false };
  const header = req.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return { ok: false };
  const presented = match[1].trim();
  if (presented.length !== expected.length) return { ok: false };
  // Constant-time compare.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ presented.charCodeAt(i);
  }
  return { ok: diff === 0 };
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
