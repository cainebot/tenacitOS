"use client";

// Phase 64.5.2-04 — Polls /api/mesh/local-status every 15s and exposes the
// orchestrator's local Tailscale state to the Mesh tile. Reads `error_code`
// (envelope-on-nonzero-exit per plan 03) so the UI can humanize via
// useErrorMessages.

import { useEffect, useState } from "react";

export interface LocalMeshStatus {
  tailscale_daemon_ok: boolean;
  tailscale_hostname: string | null;
  loading: boolean;
  error: string | null;
  error_code?: string;
}

const POLL_MS = 15_000;

export function useLocalMeshStatus(): LocalMeshStatus {
  const [state, setState] = useState<LocalMeshStatus>({
    tailscale_daemon_ok: false,
    tailscale_hostname: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const ac = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const res = await fetch("/api/mesh/local-status", { signal: ac.signal });
        if (!res.ok) {
          setState({
            tailscale_daemon_ok: false,
            tailscale_hostname: null,
            loading: false,
            error: `HTTP ${res.status}`,
          });
        } else {
          const body = await res.json();
          setState({
            tailscale_daemon_ok: body.tailscale_daemon_ok ?? false,
            tailscale_hostname: body.tailscale_hostname ?? null,
            loading: false,
            error: body.error ?? null,
            error_code: body.error_code,
          });
        }
      } catch (e) {
        if (ac.signal.aborted) return;
        setState({
          tailscale_daemon_ok: false,
          tailscale_hostname: null,
          loading: false,
          error: e instanceof Error ? e.message : "Failed to reach /api/mesh/local-status",
        });
      } finally {
        if (!ac.signal.aborted) {
          timer = setTimeout(tick, POLL_MS);
        }
      }
    };

    tick();

    return () => {
      ac.abort();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return state;
}
