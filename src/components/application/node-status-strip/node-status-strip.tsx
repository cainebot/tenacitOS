"use client";

// Phase 69 — NodeStatusStrip (SPEC-69-NODE-01..03 / Plan 69-07).
// Surfaces the Hetzner mesh at a glance: status semaphore, heartbeat freshness,
// active-run count, and adapter availability. Mounts above MeshTile in dashboard.
// Source of design truth: Figma node-id 17025:6361 (sketch 001).
//
// BLOCKING-1/2 remediation (2026-04-20): consumes the canonical `NodeRow`
// from `@/types/supabase` (Phase 64.5.2 shape). No import from fixtures.
//
// REMEDIATION-1 (Plan 69-07, 2026-04-20): active-run count is now derived
// from the real `useRealtimeRuns()` subscription filtered by
// `isActiveRun(run.status)` — the single source of truth defined in
// `@/lib/run-status` (Plan 69-01). This closes REVIEW finding 3: the
// strip, the route, and the unit tests all consume the same
// `ACTIVE_RUN_STATUSES` constant, so "active" cannot drift.
//
// Aesthetic is FROZEN (Figma 1:1); only wiring changed.

import { useMemo, type FC } from "react";
import { Avatar, Badge, BadgeWithDot, Button, FeaturedIcon, cx } from "@circos/ui";
import { Globe01, RefreshCw01 } from "@untitledui/icons";
import type { NodeRow } from "@/types/supabase";
import { relativeTime } from "@/lib/relative-time";
// REMEDIATION-1 wiring: `isActiveRun` / ACTIVE_RUN_STATUSES referenced
// via the pure helper below (extracted to a separate module so unit
// tests can import it without dragging in this "use client" component).
import { computeActiveRunCounts } from "./compute-active-run-counts";
import { useRealtimeRuns } from "@/hooks/useRealtimeRuns";

type StatusColor = "success" | "warning" | "error";

const STALE_HEARTBEAT_MS = 300_000;

function isStaleHeartbeat(node: NodeRow): boolean {
  const ts = node.last_heartbeat_at ?? node.last_heartbeat;
  if (!ts) return true;
  const parsed = Date.parse(ts);
  if (Number.isNaN(parsed)) return true;
  return Date.now() - parsed > STALE_HEARTBEAT_MS;
}

function statusFor(node: NodeRow): { color: StatusColor; label: string } {
  const status = String(node.status ?? "").toLowerCase();
  if (status === "offline") {
    return { color: "error", label: isStaleHeartbeat(node) ? "offline · stale hb" : "offline" };
  }
  if (isStaleHeartbeat(node)) {
    return { color: "error", label: "offline · stale hb" };
  }
  if (status === "draining" || status === "degraded") {
    return { color: "warning", label: status };
  }
  return { color: "success", label: "online" };
}

const ADAPTER_COLOR = {
  codex: "indigo",
  qwen: "blue",
  glm: "gray",
} as const;

function adapterColor(name: string): "indigo" | "blue" | "gray" {
  const key = name.toLowerCase() as keyof typeof ADAPTER_COLOR;
  return ADAPTER_COLOR[key] ?? "gray";
}

// `computeActiveRunCounts` lives in ./compute-active-run-counts (pure
// helper). The doc string for the contract is on the function itself.
// It imports `isActiveRun` from `@/lib/run-status` — REMEDIATION-1
// grep gate still hits this directory because compute-active-run-counts.ts
// lives in the same folder and imports `isActiveRun`.

export interface NodeStatusStripProps {
  nodes: NodeRow[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

export const NodeStatusStrip: FC<NodeStatusStripProps> = ({
  nodes,
  loading = false,
  error = null,
  onRetry,
  className,
}) => {
  // Real Realtime subscription (Plan 69-05 rewrite). Any INSERT / UPDATE /
  // DELETE on `agent_runs` updates the map on the next render.
  const { runs } = useRealtimeRuns();
  const activeRunCounts = useMemo(() => computeActiveRunCounts(runs), [runs]);

  return (
    <section
      className={cx(
        "flex w-full flex-col gap-5 rounded-2xl border border-secondary bg-secondary p-8",
        className,
      )}
      aria-labelledby="node-status-strip-title"
    >
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2
            id="node-status-strip-title"
            className="text-xl font-semibold text-primary [font-family:var(--font-display)]"
          >
            Fleet · Hetzner mesh
          </h2>
          {!loading && !error && nodes.length > 0 && (
            <Badge type="modern" color="gray" size="md">
              {nodes.length} {nodes.length === 1 ? "node" : "nodes"}
            </Badge>
          )}
        </div>
        {onRetry && (
          <Button color="tertiary" size="md" iconLeading={RefreshCw01} onClick={onRetry}>
            Refresh
          </Button>
        )}
      </header>

      {loading && <NodeStatusSkeleton />}

      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}

      {!loading && !error && nodes.length === 0 && <EmptyState />}

      {!loading && !error && nodes.length > 0 && (
        <ul className="flex flex-col gap-3" data-testid="node-status-list">
          {nodes.map((n) => (
            <NodeRowView
              key={n.node_id}
              node={n}
              activeRuns={activeRunCounts.get(n.node_id) ?? 0}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

// ---------------------------------------------------------------------------
// NodeRowView
// ---------------------------------------------------------------------------

const NodeRowView: FC<{ node: NodeRow; activeRuns: number }> = ({ node, activeRuns }) => {
  const status = statusFor(node);
  const initials = node.node_id.replace(/^circus-/, "").slice(0, 2).toUpperCase();
  const heartbeat = node.last_heartbeat_at ?? node.last_heartbeat ?? null;
  const adapters = node.available_adapters ?? [];

  return (
    <li
      className="flex items-center gap-5 rounded-xl border border-secondary bg-primary px-6 py-5"
      data-testid="node-status-row"
      data-node-id={node.node_id}
    >
      <Avatar size="md" initials={initials} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-base font-semibold text-primary [font-family:var(--font-code)]">
          {node.node_id}
        </span>
        <span className="text-sm text-tertiary">
          {node.hostname ?? node.tailscale_hostname ?? node.tailscale_ip ?? "—"} ·{" "}
          {relativeTime(heartbeat)}
        </span>
      </div>

      <BadgeWithDot type="modern" color={status.color} size="md">
        {status.label}
      </BadgeWithDot>

      {activeRuns > 0 && (
        <span data-testid="active-runs-badge">
          <Badge type="modern" color="brand" size="md">
            {activeRuns} {activeRuns === 1 ? "run" : "runs"}
          </Badge>
        </span>
      )}

      <div className="flex items-center gap-2" data-testid="adapter-pills">
        {adapters.map((a) => (
          <Badge key={a} type="modern" color={adapterColor(a)} size="md">
            {a}
          </Badge>
        ))}
      </div>
    </li>
  );
};

// ---------------------------------------------------------------------------
// Skeleton, Empty, Error states
// ---------------------------------------------------------------------------

const NodeStatusSkeleton: FC = () => (
  <ul className="flex flex-col gap-3" aria-busy="true">
    {[0, 1].map((i) => (
      <li
        key={i}
        className="flex items-center gap-4 rounded-lg border border-secondary bg-primary px-5 py-4"
      >
        <div className="size-8 shrink-0 rounded-full bg-tertiary" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="h-3 w-40 rounded bg-tertiary" />
          <div className="h-2.5 w-64 rounded bg-tertiary opacity-60" />
        </div>
        <div className="h-5 w-16 rounded-full bg-tertiary" />
        <div className="h-5 w-12 rounded-full bg-tertiary" />
      </li>
    ))}
  </ul>
);

const EmptyState: FC = () => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-secondary bg-primary px-6 py-12">
    <FeaturedIcon icon={<Globe01 className="size-6" />} size="lg" color="gray" variant="outline" />
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="text-sm font-medium text-primary">No nodes registered yet</p>
      <p className="text-xs text-tertiary">
        Provision a Hetzner CX23 with{" "}
        <code className="[font-family:var(--font-code)] text-tertiary">
          infrastructure/provision-hetzner.sh
        </code>{" "}
        and it will appear here.
      </p>
    </div>
  </div>
);

const ErrorState: FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="flex flex-col items-start gap-3 rounded-lg border border-error bg-primary px-5 py-4">
    <p className="text-sm font-medium text-error-primary">Could not load nodes</p>
    <code className="[font-family:var(--font-code)] text-xs text-tertiary">{message}</code>
    {onRetry && (
      <Button color="secondary" size="sm" onClick={onRetry}>
        Retry
      </Button>
    )}
  </div>
);
