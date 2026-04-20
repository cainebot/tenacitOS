"use client";

// ============================================================
// Phase 69-05 — useRealtimeRuns (BLOCKING stub-removal 2026-04-20).
//
// REPLACES the Plan 02 stub (which returned an empty placeholder
// referencing the old fixture module) with a real Supabase Realtime
// subscription on `public.agent_runs`. Pattern lifted from
// `useRealtimeNodes.ts` L40-55 (mount-unique topic avoids StrictMode
// double-subscribe rejections from the cached-topic client).
//
// Contract (stable — relied on by Plan 02 Runs-tab AND Plan 07
// NodeStatusStrip AND the new Plan 05 per-run page):
//
//   const { runs, loading, error, resync } = useRealtimeRuns({ agentId });
//
//   runs    — AgentRunRow[] (canonical shape from @/types/supabase)
//   loading — true until the initial snapshot resolves
//   error   — string | null (DB / network message)
//   resync  — () => Promise<void> manual refetch
//
// Behaviour:
//   - On mount: SELECT * FROM agent_runs ORDER BY started_at DESC NULLS
//     LAST, optionally filtered by agent_id. Result caps at 50 rows so
//     the UI never holds a runaway backlog.
//   - Subscribes to `postgres_changes` on `agent_runs`. If `agentId` is
//     provided, the filter `agent_id=eq.<id>` is applied server-side
//     (the Realtime client supports equality filters on the filter
//     option).
//   - INSERT → prepend the new row, trim to 50.
//   - UPDATE → replace row by `id`.
//   - DELETE → remove row by `id`.
//
// Calling-code shape preserved: prior callers used the overloaded
// `useRealtimeRuns(agentId?: string)` positional form. The new
// `useRealtimeRuns({ agentId })` options form is the canonical entry;
// the positional form is retained via runtime narrowing so the Plan 02
// Runs-tab keeps working without a simultaneous rewrite.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase";
import type { AgentRunRow } from "@/types/supabase";

const RUNS_CAP = 50;

export interface UseRealtimeRunsOptions {
  /** When set, subscribes with filter `agent_id=eq.<agentId>` and
   *  scopes the initial snapshot to the same agent. */
  agentId?: string;
}

export interface UseRealtimeRunsResult {
  runs: AgentRunRow[];
  loading: boolean;
  error: string | null;
  resync: () => Promise<void>;
}

/**
 * Narrows the overloaded call shape:
 *   useRealtimeRuns()                       → global feed
 *   useRealtimeRuns("gangle")               → legacy positional (Plan 02)
 *   useRealtimeRuns({ agentId: "gangle" })  → canonical options form
 */
function normaliseOptions(
  arg: string | UseRealtimeRunsOptions | undefined,
): UseRealtimeRunsOptions {
  if (typeof arg === "string") return { agentId: arg };
  return arg ?? {};
}

export function useRealtimeRuns(
  arg?: string | UseRealtimeRunsOptions,
): UseRealtimeRunsResult {
  const { agentId } = normaliseOptions(arg);
  const [runs, setRuns] = useState<AgentRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient();

  const fetchAllRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("agent_runs")
        .select("*")
        .order("started_at", { ascending: false, nullsFirst: false })
        .limit(RUNS_CAP);
      if (agentId) {
        query = query.eq("agent_id", agentId);
      }
      const { data, error: fetchError } = await query;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setRuns(((data as AgentRunRow[]) ?? []).slice(0, RUNS_CAP));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch runs");
    } finally {
      setLoading(false);
    }
  }, [supabase, agentId]);

  const resync = useCallback(async () => {
    await fetchAllRuns();
  }, [fetchAllRuns]);

  useEffect(() => {
    fetchAllRuns();

    // Unique topic per mount so React StrictMode's dev double-invoke
    // does not reuse an already-subscribed channel (same rationale as
    // useRealtimeNodes.ts L40-55).
    const topic = `agent-runs-realtime-${Math.random().toString(36).slice(2)}`;

    const filterOpts: {
      event: "*";
      schema: "public";
      table: "agent_runs";
      filter?: string;
    } = {
      event: "*",
      schema: "public",
      table: "agent_runs",
    };
    if (agentId) {
      filterOpts.filter = `agent_id=eq.${agentId}`;
    }

    const channel = supabase
      .channel(topic)
      // Cast needed: the Supabase type for `.on("postgres_changes", …)`
      // narrows the filter to a string-keyed record that is compatible
      // but TS loses track of the discriminant here.
      .on(
        "postgres_changes" as unknown as "system",
        filterOpts as unknown as Record<string, unknown>,
        (payload: {
          eventType: "INSERT" | "UPDATE" | "DELETE";
          new: AgentRunRow;
          old: Pick<AgentRunRow, "id">;
        }) => {
          if (payload.eventType === "INSERT") {
            const inserted = payload.new;
            setRuns((prev) => [inserted, ...prev].slice(0, RUNS_CAP));
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new;
            setRuns((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r)),
            );
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old;
            setRuns((prev) => prev.filter((r) => r.id !== deleted.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAllRuns, supabase, agentId]);

  return { runs, loading, error, resync };
}
