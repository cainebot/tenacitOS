// Phase 68 Plan 08 Task 2 — GET /api/approvals (server-proxy for the UI).
//
// Closes GAP-68-01 (VERIFICATION.md): the browser Supabase client runs
// as `anon`, and the RLS policy `approvals_human_read` requires
// `auth.role()='authenticated'`. Since the control-panel's human auth
// is the `mc_auth` cookie (not Supabase Auth), the anon client cannot
// SELECT the `approvals` table — so the UI list would stay empty even
// when approvals exist.
//
// Fix: proxy the read through this route handler, which is gated by
// `mc_auth` (middleware + defense-in-depth `requireMcAuth()`) and uses
// the service-role client to bypass RLS. This preserves the Golden
// Rule gate (only authenticated operators see approvals) without
// relaxing any policy and without introducing Supabase Auth full.
//
// Upgrade path (deferred, not this plan): mint a short-lived JWT with
// `role: 'authenticated'` signed by `SUPABASE_JWT_SECRET` and call
// `supabase.realtime.setAuth(token)` on the client so the browser can
// resubscribe to Realtime events. Until then, the client polls this
// endpoint every 3s (pause-on-hidden). See the module README.
//
// Contract:
//   GET /api/approvals?types=a,b&statuses=pending,revision_requested&limit=50
//   → 200 { ok: true, rows: ApprovalRow[], total: number }
//   → 401 { ok: false, error: 'unauthorized' }   (no mc_auth)
//   → 400 { ok: false, error: 'invalid_query' } (query validation fail)
//
// Threat notes:
//   - T-68-08-IDOR: returns ALL approvals. `requireMcAuth()` is the
//     gate. Do NOT add any per-user filter here — approvals are a
//     shared human queue.
//   - T-68-08-RATE: client polls at 3s. `limit` capped at 200.
//     `count:'exact'` runs once per request; add row-level rate-limit
//     if operator count × tab count spikes load.
//   - T-68-08-CACHE: Next.js fetch caching is avoided by
//     `dynamic = 'force-dynamic'`. Client calls add `cache:'no-store'`.

import { NextResponse, type NextRequest } from "next/server";
import { requireMcAuth } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase";
import type { ApprovalRow, ApprovalStatus, ApprovalType } from "@/types/approval";

// Plan 08 note: zod is NOT a control-panel dependency (checked via
// package.json on 2026-04-19). The original plan draft named zod; we
// hand-rolled an equivalent validator rather than introduce a new
// runtime dep for a single endpoint. Behaviour is identical: unknown
// value → 400 { error: 'invalid_query' }.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const DEFAULT_STATUSES: ApprovalStatus[] = ["pending", "revision_requested"];

const VALID_TYPES: readonly ApprovalType[] = [
  "create_agent",
  "delete_agent",
  "delete_agents_bulk",
  "update_agent",
  "send_external_message",
] as const;

const VALID_STATUSES: readonly ApprovalStatus[] = [
  "pending",
  "revision_requested",
  "approved",
  "rejected",
  "expired",
  "cancelled",
] as const;

interface ParsedQuery {
  types?: ApprovalType[];
  statuses?: ApprovalStatus[];
  limit: number;
}

function parseQuery(
  params: URLSearchParams,
): { ok: true; value: ParsedQuery } | { ok: false; message: string } {
  const rawTypes = params.get("types");
  const rawStatuses = params.get("statuses");
  const rawLimit = params.get("limit");

  let types: ApprovalType[] | undefined;
  if (rawTypes !== null) {
    const parts = rawTypes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const t of parts) {
      if (!VALID_TYPES.includes(t as ApprovalType)) {
        return { ok: false, message: `unknown approval type: ${t}` };
      }
    }
    types = parts as ApprovalType[];
  }

  let statuses: ApprovalStatus[] | undefined;
  if (rawStatuses !== null) {
    const parts = rawStatuses
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const s of parts) {
      if (!VALID_STATUSES.includes(s as ApprovalStatus)) {
        return { ok: false, message: `unknown approval status: ${s}` };
      }
    }
    statuses = parts as ApprovalStatus[];
  }

  let limit = DEFAULT_LIMIT;
  if (rawLimit !== null) {
    const parsed = Number.parseInt(rawLimit, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { ok: false, message: "limit must be a positive integer" };
    }
    limit = Math.min(parsed, MAX_LIMIT);
  }

  return { ok: true, value: { types, statuses, limit } };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireMcAuth(req);
  if (!auth.ok) return auth.response!;

  const parsed = parseQuery(req.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: "invalid_query", message: parsed.message },
      { status: 400 },
    );
  }

  const { types, statuses, limit } = parsed.value;
  const effectiveStatuses = statuses && statuses.length > 0 ? statuses : DEFAULT_STATUSES;

  try {
    const sb = createServiceRoleClient();
    let query = sb
      .from("approvals")
      .select("*", { count: "exact" })
      .in("status", effectiveStatuses as string[])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (types && types.length > 0) {
      query = query.in("type", types as string[]);
    }

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json(
        { ok: false, error: "db_error", message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        rows: (data ?? []) as ApprovalRow[],
        total: count ?? 0,
      },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "unexpected", message: (e as Error).message ?? "unknown" },
      { status: 500 },
    );
  }
}
