"use client";

// Phase 68 Plan 08 Task 5 — pending approvals counter (server-proxy + polling).
//
// Previous implementation (Plan 06) used `createBrowserClient()` to
// SELECT directly against the `approvals` table and subscribed to the
// Realtime channel. That path is broken by design (GAP-68-01):
//
//   - The browser client uses the anon key → `auth.role()='anon'`.
//   - RLS `approvals_human_read` requires `auth.role()='authenticated'`.
//   - Control-panel auth is `mc_auth` cookie (not Supabase Auth).
//
// Result: the SELECT returned nothing and Realtime events never fired
// (Realtime honours the same RLS gate for `postgres_changes`).
//
// Plan 08 closes the gap by polling `GET /api/approvals/count` (gated
// by `mc_auth` + service-role) every 3s while the tab is visible.
//
// Upgrade path to real Realtime (deferred): mint a short-lived JWT
// with `role:'authenticated'` signed by `SUPABASE_JWT_SECRET` via
// `GET /api/approvals/token`, call `supabase.realtime.setAuth(token)`,
// then re-enable the channel subscription below. Not in scope for this
// plan — polling is a safe interim with <2s effective latency.

import { useEffect, useRef, useState } from "react";

export interface UseApprovalsCountResult {
  count: number;
  loading: boolean;
  error: string | null;
}

const POLL_MS = 3_000;

interface CountResponse {
  ok: boolean;
  count?: number;
  error?: string;
  message?: string;
}

export function useApprovalsCount(): UseApprovalsCountResult {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    const fetchCount = async () => {
      try {
        const res = await fetch("/api/approvals/count", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const body = (await res.json().catch(() => ({}))) as CountResponse;
        if (cancelledRef.current) return;

        if (!res.ok || !body.ok) {
          setError(body.message ?? body.error ?? `HTTP ${res.status}`);
        } else {
          setCount(body.count ?? 0);
          setError(null);
        }
      } catch (e) {
        if (!cancelledRef.current) setError((e as Error).message);
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    };

    const schedule = () => {
      if (cancelledRef.current) return;
      // Pause polling when the tab is hidden to avoid needless traffic.
      if (typeof document !== "undefined" && document.hidden) {
        timerRef.current = setTimeout(schedule, POLL_MS);
        return;
      }
      void fetchCount();
      timerRef.current = setTimeout(schedule, POLL_MS);
    };

    // Refresh immediately whenever the tab becomes visible again so
    // the badge reflects the queue depth without waiting up to 3s.
    const onVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        void fetchCount();
      }
    };

    void fetchCount();
    timerRef.current = setTimeout(schedule, POLL_MS);

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, []);

  return { count, loading, error };
}
