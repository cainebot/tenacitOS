// ============================================================
// Phase 69-01 — Single source of truth for "active run" semantics
// Consumed by Plans 05 (useRealtimeRunLogs), 06 (run detail polling
// stop condition), 07 (NodeStatusStrip active-runs count). Closes
// REVIEW finding 3: active-run semantic drift between UI/route/tests.
// ============================================================

import type { AgentRunRow, AgentRunStatus } from "@/types/supabase";

/**
 * Canonical list of statuses that mean a run is "in flight" — a poller
 * must keep hitting the logs endpoint; the node's active-run tile must
 * render the gauge; terminal UI must NOT mark the run as complete.
 */
export const ACTIVE_RUN_STATUSES = ["queued", "running"] as const satisfies readonly AgentRunStatus[];

export type ActiveRunStatus = (typeof ACTIVE_RUN_STATUSES)[number];

/**
 * Returns true when the run is still progressing (queued or running).
 * Everything else — completed / failed / cancelled — is terminal.
 *
 * Accepts either a raw status string or the full AgentRunRow for
 * ergonomic call sites:
 *
 *   isActiveRun(run.status)  // status string
 *   isActiveRun(run)          // whole row
 */
export function isActiveRun(input: AgentRunRow | AgentRunStatus | string | null | undefined): boolean {
  if (!input) return false;
  const status = typeof input === "string" ? input : input.status;
  return (ACTIVE_RUN_STATUSES as readonly string[]).includes(status);
}
