"use client";

// Phase 69 Plan 11 — operator actions for a specific agent.
//
// All 4 actions wrap POST /api/agents/[id]/{pause,resume,invoke,assign-task}
// and expose a pending state + optional error. No toast library is wired in
// v1.9 yet (see memory project_v19_parallel_branch); consumers surface
// outcomes inline. Adding sonner later would be a drop-in replacement at
// the marked "toast hook point" comments.

import { useCallback, useState } from "react";

export type AgentActionKind = "pause" | "resume" | "invoke" | "assign-task";

export interface InvokeResult {
  run_id: string;
  target_node_id: string;
  adapter_type: string;
}

export interface PauseResult {
  status: "paused" | "already_paused";
  agent_id: string;
  paused_reason?: string | null;
  inflight_run_count?: number;
}

export interface ResumeResult {
  status: "resumed" | "already_active";
  agent_id: string;
  current_status: string | null;
}

export interface AssignTaskResult {
  card_id: string;
  assigned_agent_id: string;
  workflow_id: string;
  state_id: string;
}

export interface AssignTaskInput {
  title: string;
  description?: string;
  workflow_id: string;
  state_id: string;
  card_type?: "epic" | "story" | "task" | "subtask" | "bug";
  priority?: "low" | "medium" | "high" | "critical";
  due_date?: string | null;
  labels?: string[];
}

export interface UseAgentActionsResult {
  pending: AgentActionKind | null;
  error: string | null;
  pause: (reason?: string) => Promise<PauseResult>;
  resume: () => Promise<ResumeResult>;
  invoke: (prompt?: string) => Promise<InvokeResult>;
  assignTask: (input: AssignTaskInput) => Promise<AssignTaskResult>;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let parsed: unknown = null;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // leave as raw text
    }
  }
  if (!res.ok) {
    const msg =
      (parsed && typeof parsed === "object" && parsed !== null && "message" in parsed
        ? String((parsed as { message?: unknown }).message ?? "")
        : "") || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return parsed as T;
}

/**
 * Operator actions for a specific agent. Call with `agent_id` (TEXT PK /
 * slug) — not the UUID internal ID.
 */
export function useAgentActions(agentId: string): UseAgentActionsResult {
  const [pending, setPending] = useState<AgentActionKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const encoded = encodeURIComponent(agentId);

  const run = useCallback(
    async <T,>(kind: AgentActionKind, url: string, body: unknown): Promise<T> => {
      setPending(kind);
      setError(null);
      try {
        const out = await postJson<T>(url, body);
        // toast hook point: success
        return out;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        // toast hook point: error
        console.error(`[useAgentActions:${kind}]`, msg);
        throw err;
      } finally {
        setPending(null);
      }
    },
    [],
  );

  const pause = useCallback(
    (reason?: string) =>
      run<PauseResult>("pause", `/api/agents/${encoded}/pause`, { reason }),
    [encoded, run],
  );

  const resume = useCallback(
    () => run<ResumeResult>("resume", `/api/agents/${encoded}/resume`, {}),
    [encoded, run],
  );

  const invoke = useCallback(
    (prompt?: string) =>
      run<InvokeResult>("invoke", `/api/agents/${encoded}/invoke`, { prompt }),
    [encoded, run],
  );

  const assignTask = useCallback(
    (input: AssignTaskInput) =>
      run<AssignTaskResult>("assign-task", `/api/agents/${encoded}/assign-task`, input),
    [encoded, run],
  );

  return { pending, error, pause, resume, invoke, assignTask };
}
