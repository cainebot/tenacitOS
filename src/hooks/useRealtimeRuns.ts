"use client";

// Phase 69 Plan 02 stub — useRealtimeRuns.
// Returns empty `AgentRunRow[]` today; real Supabase Realtime subscription
// to `agent_runs` lands in Plan 69-05 (see FIGMA-IMPLEMENTATION.md §6).
//
// BLOCKING-2 convergence (2026-04-20): emits the canonical `AgentRunRow`
// shape from `@/types/supabase` so Plan 05 can drop its subscription here
// with zero consumer-side churn. Until Plan 05 lands this returns an
// empty array; the UI falls through to the "no runs" affordance.

import { useState } from "react";
import type { AgentRunRow } from "@/types/supabase";

export interface UseRealtimeRunsResult {
  runs: AgentRunRow[];
  loading: boolean;
  error: string | null;
  resync: () => Promise<void>;
}

export function useRealtimeRuns(_agentId?: string): UseRealtimeRunsResult {
  // Intentionally empty until Plan 05 wires the real Realtime subscription.
  const [runs] = useState<AgentRunRow[]>([]);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const resync = async () => {
    // TODO(plan-05): trigger a Realtime resync + initial refetch.
  };

  return { runs, loading, error, resync };
}
