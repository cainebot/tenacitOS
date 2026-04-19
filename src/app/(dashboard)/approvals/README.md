# /approvals — Data path

## Architecture (Plan 68-08)

The approvals page reads from the database via a **server-side proxy**,
not the browser Supabase client.

```
Browser (mc_auth cookie)
   │
   ├── GET /api/approvals            → service-role SELECT → JSON rows
   └── GET /api/approvals/count      → service-role COUNT  → JSON count
             │
             └── requireMcAuth() gate (defense-in-depth over middleware)
```

## Why not the browser Supabase client?

The control-panel authenticates humans via the `mc_auth` cookie (a
shared deployment secret checked in `src/middleware.ts`). It does
**not** mint a Supabase Auth session, so any browser Supabase client
uses the anon key.

The `approvals` table is guarded by RLS policy `approvals_human_read`
(migration 028) which requires `auth.role()='authenticated'`. The
anon session cannot satisfy that, so:

- A browser `supabase.from('approvals').select('*')` returns **zero
  rows**, regardless of how many approvals exist.
- A `postgres_changes` Realtime subscription against `approvals`
  delivers **no events** (Realtime enforces the same RLS gate).

Both symptoms were caught as **GAP-68-01** during Phase 68 verification
and closed by Plan 08.

## Why polling instead of Realtime?

Our operator queue is ~10s granularity; polling at 3s (pause-on-hidden)
gives <2s effective latency and requires zero new infrastructure.

Real Realtime requires either:

1. Full Supabase Auth integration (out of scope for v1.9), or
2. Minting a short-lived JWT with `role='authenticated'` signed by
   `SUPABASE_JWT_SECRET`, handing it to the browser via an endpoint
   like `GET /api/approvals/token`, then calling
   `supabase.realtime.setAuth(token)` before subscribing.

Option 2 is the documented upgrade path. It's intentionally deferred:
we haven't verified that a non-Supabase-Auth JWT signed by the same
secret is accepted by Supabase Realtime in our deployment, and the
polling interim has no security debt.

## Files

| File | Role |
|------|------|
| `src/app/api/approvals/route.ts` | `GET` — list approvals (mc_auth + service-role) |
| `src/app/api/approvals/count/route.ts` | `GET` — pending counter (same auth) |
| `src/app/api/approvals/[id]/route.ts` | `PATCH` — Plan 06 — approve / reject / request_revision |
| `src/hooks/useApprovalsList.ts` | Polling fetcher for the table |
| `src/hooks/useApprovalsCount.ts` | Polling fetcher for the sidebar badge |
| `src/app/(dashboard)/approvals/approvals-table.tsx` | Table UI (client) |
| `src/app/(dashboard)/approvals/approval-detail-modal.tsx` | Detail modal (unchanged from Plan 06) |

## Invariants

- **No browser Supabase client** for `approvals` reads or Realtime.
  Verified by `approvals-table.no-browser-client.test.ts`.
- **RLS untouched.** `approvals_human_read` still requires
  `auth.role()='authenticated'`. The anon client remains blocked;
  the server proxy is the only read path.
- **Service-role stays server-only.** `SUPABASE_SERVICE_ROLE_KEY` is
  read via `createServiceRoleClient()` from the route handlers and
  never shipped to the browser.
