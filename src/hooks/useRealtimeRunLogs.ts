"use client";

// ============================================================
// Phase 69-05 — useRealtimeRunLogs (polling bridge).
//
// Polls `GET /api/agent-runs/<runId>/logs?after=<cursor>` every 2s
// while the run is active, appends chunks to a bounded in-memory buffer,
// and pauses cleanly when the tab is hidden or the run reaches a
// terminal status.
//
// Rationale:
//   - Per V3 §12 L946 + CONTEXT Q3, `agent_run_logs` is NOT realtime-
//     published (too much volume). Polling is the contract.
//   - Pattern lifted from `useApprovalsList.ts` (polling + visibility
//     pause + cancellation on unmount / dep-change).
//
// Contract:
//   const { chunks, loading, error } = useRealtimeRunLogs(runId, { active });
//
//   chunks  — AgentRunLogRow[] (capped at 500; oldest dropped on overflow)
//   loading — true until the first poll resolves
//   error   — string | null
//
// Behaviour:
//   - runId === null OR active === false → hook is inert. Returns
//     {chunks:[], loading:false, error:null} and performs no network
//     work. This keeps the list-of-runs surfaces from each spawning
//     their own polling loop.
//   - On mount (active): GET /api/agent-runs/<runId>/logs → seed chunks.
//   - Every 2s thereafter: GET ?after=<lastId>. Append to chunks.
//     Trim front when length > 500 (DOM cap from RunLogStream).
//   - visibilitychange: pause on hidden; immediate refetch on visible.
//   - Cleanup: clearInterval on unmount or dep change.
// ============================================================

import { useEffect, useRef, useState } from "react";
import type { AgentRunLogRow } from "@/types/supabase";

const POLL_MS = 2_000;
const CHUNK_CAP = 500;

export interface UseRealtimeRunLogsOptions {
  /** Whether the run is currently active (queued | running). Derived
   *  via `isActiveRun(run.status)` at the call site. When false, the
   *  hook is inert and will NOT start a polling loop — essential for
   *  SPEC-69-LOGS-04 ("polling stops within one tick of terminal"). */
  active: boolean;
}

export interface UseRealtimeRunLogsResult {
  chunks: AgentRunLogRow[];
  loading: boolean;
  error: string | null;
}

interface ListResponse {
  chunks?: AgentRunLogRow[];
  nextCursor?: number | null;
  error?: string;
  message?: string;
}

export function useRealtimeRunLogs(
  runId: string | null,
  opts: UseRealtimeRunLogsOptions,
): UseRealtimeRunLogsResult {
  const { active } = opts;
  const [chunks, setChunks] = useState<AgentRunLogRow[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(runId && active));
  const [error, setError] = useState<string | null>(null);

  // Cursor of the largest id we've already ingested — advances
  // monotonically so repeated polls only pull new chunks.
  const cursorRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef<boolean>(false);

  useEffect(() => {
    // Reset local state any time runId or active change — the previous
    // buffer belongs to a different (or null) stream.
    setChunks([]);
    setError(null);
    cursorRef.current = 0;

    if (!runId || !active) {
      // Inert mode: no polling loop, no network traffic.
      setLoading(false);
      return () => undefined;
    }

    setLoading(true);
    cancelledRef.current = false;

    const fetchPage = async () => {
      try {
        const url = `/api/agent-runs/${encodeURIComponent(runId)}/logs?after=${cursorRef.current}`;
        const res = await fetch(url, {
          cache: "no-store",
          credentials: "same-origin",
        });
        const body = (await res.json().catch(() => ({}))) as ListResponse;
        if (cancelledRef.current) return;

        if (!res.ok) {
          setError(body.message ?? body.error ?? `HTTP ${res.status}`);
          return;
        }

        const incoming = body.chunks ?? [];
        if (incoming.length > 0) {
          const lastId = incoming[incoming.length - 1]!.id;
          if (lastId > cursorRef.current) cursorRef.current = lastId;
          setChunks((prev) => {
            const merged = prev.concat(incoming);
            return merged.length > CHUNK_CAP
              ? merged.slice(merged.length - CHUNK_CAP)
              : merged;
          });
        }
        setError(null);
      } catch (e) {
        if (!cancelledRef.current) {
          setError(e instanceof Error ? e.message : "Failed to fetch logs");
        }
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    };

    const schedule = () => {
      if (cancelledRef.current) return;
      if (typeof document !== "undefined" && document.hidden) {
        timerRef.current = setTimeout(schedule, POLL_MS);
        return;
      }
      void fetchPage();
      timerRef.current = setTimeout(schedule, POLL_MS);
    };

    const onVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        void fetchPage();
      }
    };

    // Initial poll + timer kickoff.
    void fetchPage();
    timerRef.current = setTimeout(schedule, POLL_MS);

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, [runId, active]);

  return { chunks, loading, error };
}
