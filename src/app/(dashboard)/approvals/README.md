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

## Phase 68.1 Item 2 — JWT-mint Realtime shipped

- `POST /api/auth/realtime-token` mints an HS256 JWT (TTL 5min) signed
  with `SUPABASE_JWT_SECRET` using `jose.SignJWT`.
- `useRealtimeToken` hook renews every 4min; returns
  `{ token, realtimeEnabled }`. `realtimeEnabled=false` when the
  endpoint returns 500 (auth_misconfigured), so consumers suppress
  "Realtime disconnected" warnings for known misconfig.
- `approvals-table.tsx` uses a **stable channel pattern** (Codex MEDIUM
  Option B):
  - `useEffect([])` — channel setup, persists across token rotations.
  - `useEffect([token])` — `sb.realtime.setAuth(newToken)` imperatively,
    no re-subscribe. Renewal every 4min does NOT tear down the
    subscription.
- The Realtime callback calls `refetch()` exposed by `useApprovalsList`
  (Codex HIGH Option A — explicit refetch contract).
- Latency instrumented via `console.log("[realtime-latency-ms]", n)`
  — use the browser devtools console to compare against the polling
  baseline. Spike measured ~500ms end-to-end (see
  `.planning/phases/68.1-approvals-dynamism-followups/68.1-SPIKE-JWT.md`).
- **Polling 3s from Plan 68-08 STAYS as defence-in-depth.** If the
  Realtime channel fails (CHANNEL_ERROR / CLOSED), the hook keeps
  pulling rows every 3s.

### Security note — JWT blast radius

The minted JWT is **usage-scoped, not cryptographically scoped**. Blast
radius of a leaked token = everything `role='authenticated'` can read
or write under RLS during TTL=5min. Mitigations:

- TTL=5min (short attack window).
- `mc_auth` gate on the mint endpoint.
- RLS is the actual authorisation boundary.
- Token lives in-memory only (hook never persists to localStorage).

See `src/app/api/auth/realtime-token/route.ts` for the full security
comment and `68.1-SPIKE-JWT.md` for the RLS pre-check evidence.

---

## Historical note — Plan 68-08 polling-only path

Before Phase 68.1 Item 2 landed, the approvals page polled `GET
/api/approvals` every 3s (pause-on-hidden) and did NOT subscribe to
Realtime. Rationale was that a non-Supabase-Auth JWT signed by the same
secret had not been verified to pass Supabase Realtime's gateway. The
Phase 68.1 spike proved it does (see `68.1-SPIKE-JWT.md`), so the
upgrade path above is now live.

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
