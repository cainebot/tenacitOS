// Phase 69 Plan 07 — pure helper extracted from node-status-strip.tsx
// so that unit tests can import it without pulling in the
// `"use client"` component module (which would also require mocking
// `useRealtimeRuns` + `@circos/ui`).
//
// Contract: given the Realtime `agent_runs` snapshot, returns a
// Map<node_id, count> counting runs where:
//   - run.node_id is non-null (skip unclaimed), AND
//   - isActiveRun(run.status) is true (status ∈ ACTIVE_RUN_STATUSES).
//
// Consumed by `node-status-strip.tsx` to derive per-node active-run
// counts. Closes REVIEW finding 3 (active-run semantic drift) — the
// predicate is `isActiveRun` from `@/lib/run-status` (Plan 01), same
// constant the route's SQL and the per-run page use.

import type { AgentRunRow } from "@/types/supabase";
import { isActiveRun } from "@/lib/run-status";

export function computeActiveRunCounts(
  runs: readonly AgentRunRow[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const run of runs) {
    if (!isActiveRun(run.status)) continue;
    const nodeId = run.node_id;
    if (!nodeId) continue;
    counts.set(nodeId, (counts.get(nodeId) ?? 0) + 1);
  }
  return counts;
}
