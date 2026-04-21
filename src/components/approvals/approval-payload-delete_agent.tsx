"use client";

// Phase 69 Plan 06 — delete_agent approval payload renderer.
//
// Shows the target agent card (avatar + name) plus a pending-runs
// count for the bound node, plus a warning banner describing the
// soft-delete contract.
//
// Snapshot-first (REVIEW finding 6): consumes
// payload.target_snapshot.{name, slug, avatar_url, bound_node_id,
// preferred_node_id} — zero secondary fetches for the header/binding.
// Pending-runs fetch is opt-in (only fires when a node binding is
// known) and wraps errors to render "Unknown" without breaking the
// surface.

import { useEffect, useState } from "react";
import { Avatar, Badge, cx } from "@circos/ui";
import { isAllowedAvatarUrl } from "@/lib/agent-validators";
import { APPROVALS_COPY } from "./copy";

type TargetSnapshot = {
  slug?: string;
  name?: string;
  avatar_url?: string | null;
  bound_node_id?: string | null;
  preferred_node_id?: string | null;
};

interface DeleteAgentPayload {
  agent_id?: string;
  slug?: string;
  target_snapshot?: TargetSnapshot;
}

async function fetchAgentSnapshot(
  agentId: string,
  signal: AbortSignal,
): Promise<TargetSnapshot | null> {
  try {
    const res = await fetch(
      `/api/agents/${encodeURIComponent(agentId)}`,
      { credentials: "same-origin", signal },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { agent?: TargetSnapshot };
    return data?.agent ?? null;
  } catch {
    return null;
  }
}

async function fetchActiveRuns(
  nodeId: string,
  signal: AbortSignal,
): Promise<number | null> {
  try {
    const res = await fetch(
      `/api/nodes/${encodeURIComponent(nodeId)}/active-runs`,
      { credentials: "same-origin", signal },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { count?: number };
    return typeof data?.count === "number" ? data.count : null;
  } catch {
    return null;
  }
}

export function ApprovalPayloadDeleteAgent({
  payload,
}: {
  payload: DeleteAgentPayload;
}) {
  const initialSnapshot = payload.target_snapshot;
  const [fallbackSnapshot, setFallbackSnapshot] = useState<TargetSnapshot | null>(
    null,
  );
  const [pendingRuns, setPendingRuns] = useState<number | null | "unknown">(
    "unknown",
  );

  const agentId = payload.agent_id ?? payload.slug ?? initialSnapshot?.slug ?? "";

  // Legacy fallback: fetch agent ONLY when snapshot is absent.
  useEffect(() => {
    if (initialSnapshot || !agentId) return;
    const controller = new AbortController();
    void fetchAgentSnapshot(agentId, controller.signal).then((snap) => {
      if (snap) setFallbackSnapshot(snap);
    });
    return () => controller.abort();
  }, [initialSnapshot, agentId]);

  const snapshot = initialSnapshot ?? fallbackSnapshot;
  const nodeId = snapshot?.bound_node_id ?? snapshot?.preferred_node_id ?? null;

  // Pending-runs fetch is opt-in — only fires with a known node binding.
  // When nodeId is null we reset the state through the effect cleanup
  // instead of a sync setState body (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!nodeId) return;
    const controller = new AbortController();
    void fetchActiveRuns(nodeId, controller.signal).then((count) => {
      setPendingRuns(count);
    });
    return () => {
      controller.abort();
      setPendingRuns("unknown");
    };
  }, [nodeId]);

  const name = snapshot?.name ?? agentId ?? "(agent missing)";
  const slug = snapshot?.slug ?? agentId ?? "";
  const safeAvatarUrl = isAllowedAvatarUrl(snapshot?.avatar_url)
    ? snapshot?.avatar_url ?? undefined
    : undefined;

  return (
    <div
      data-testid="approval-payload-delete_agent"
      className="flex flex-col gap-4"
    >
      {/* Agent card + soft-delete badge */}
      <section className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            size="lg"
            src={safeAvatarUrl}
            alt={name}
            initials={name.slice(0, 2).toUpperCase()}
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-semibold text-primary">{name}</span>
            <span className="truncate text-xs text-tertiary">
              {slug ? `slug: ${slug}` : ""}
            </span>
          </div>
        </div>
        <Badge color="error" size="sm" type="pill-color">
          Soft delete
        </Badge>
      </section>

      {/* Pending runs */}
      <section className="flex items-center gap-2">
        <span className="text-xs font-medium text-quaternary">
          {APPROVALS_COPY.deletePendingRunsLabel}
        </span>
        <span
          className="text-xs text-primary"
          data-testid="approval-payload-delete_agent-pending"
        >
          {pendingRuns === "unknown" || pendingRuns === null
            ? "Unknown"
            : pendingRuns}
        </span>
      </section>

      {/* Warning banner */}
      <section
        className={cx(
          "rounded-md border border-warning bg-warning_subtle p-3",
          "text-xs text-warning-primary",
        )}
      >
        {APPROVALS_COPY.deleteWarning}
      </section>
    </div>
  );
}
