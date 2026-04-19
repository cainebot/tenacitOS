"use client";

// Phase 68.1 Item 2 — Renewing JWT token for Supabase Realtime setAuth.
//
// Mints a JWT via POST /api/auth/realtime-token (mc_auth-gated, TTL 5min)
// and renews every 4min so the in-flight Realtime subscription never sees
// expiration. Returns { token, realtimeEnabled }:
//   - token: string | null (null during first mint or after failure).
//   - realtimeEnabled: boolean — false if the endpoint returns 500
//     (auth_misconfigured). Consumer can suppress "Realtime disconnected"
//     warnings when this is false — the misconfig is known.
//
// Defense-in-depth: useApprovalsList polling (Plan 68-08) STAYS. If
// setAuth/Realtime silently fails, polling covers the gap.

import { useEffect, useState } from "react";

const RENEW_MS = 4 * 60 * 1_000;

export interface UseRealtimeTokenResult {
  token: string | null;
  realtimeEnabled: boolean;
}

export function useRealtimeToken(): UseRealtimeTokenResult {
  const [token, setToken] = useState<string | null>(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/auth/realtime-token", {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
        });
        if (cancelled) return;
        if (res.status === 500) {
          // Endpoint reports auth_misconfigured — disable Realtime gracefully.
          setRealtimeEnabled(false);
          // eslint-disable-next-line no-console
          console.warn(
            "[useRealtimeToken] endpoint 500 — realtimeEnabled=false",
          );
          return;
        }
        if (!res.ok) {
          // eslint-disable-next-line no-console
          console.warn("[useRealtimeToken] mint failed", res.status);
          return;
        }
        const body = (await res.json()) as { ok: boolean; token?: string };
        if (cancelled) return;
        if (body.ok && body.token) {
          setToken(body.token);
          setRealtimeEnabled(true);
        }
      } catch (e) {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.warn("[useRealtimeToken] error", e);
        }
      }
    };

    void load();
    const iv = setInterval(load, RENEW_MS);

    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);

  return { token, realtimeEnabled };
}
