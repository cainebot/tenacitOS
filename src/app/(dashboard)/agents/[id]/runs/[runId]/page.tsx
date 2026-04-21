"use client";

// ============================================================
// Phase 69-05 — /agents/[id]/runs/[runId]
//
// Per-run detail page. Client component (per plan L76) so the same
// useRealtimeRuns subscription that the Runs-tab uses can keep this
// surface live without a separate server fetch path.
//
// Flow:
//   1. Read both path params via `useParams()`.
//   2. Subscribe to agent_runs filtered by agent_id via
//      useRealtimeRuns({ agentId }). Find the matching row by runId.
//   3. Derive `active` via isActiveRun(run.status) — the single source
//      of truth shared with Plan 05's log-poller and Plan 07's node
//      tile (REVIEW finding 3).
//   4. useRealtimeRunLogs(runId, { active }) starts polling while the
//      run is queued/running; stops within one 2s tick on terminal.
//   5. Render PageHeader (title/status pill/breadcrumbs/meta) + the
//      RunLogStream component that already owns the SECURITY T6 banner.
//
// Not-found handling: until the snapshot resolves (loading === true)
// we render the loading state. After loading, a missing run falls
// through to the EmptyState — covers both "wrong agent" and
// "pruned run" cases.
// ============================================================

import { use } from "react";
import Link from "next/link";
import {
  Badge,
  BadgeWithDot,
  Button,
  EmptyState,
  LoadingIndicator,
  PageHeader,
  cx,
} from "@circos/ui";
import { ArrowLeft, SearchLg } from "@untitledui/icons";
import { useRealtimeRuns } from "@/hooks/useRealtimeRuns";
import { useRealtimeRunLogs } from "@/hooks/useRealtimeRunLogs";
import { RunLogStream } from "@/components/application/run-log-stream";
import { isActiveRun } from "@/lib/run-status";
import { formatDuration, formatTimestamp, relativeTime } from "@/lib/relative-time";
import { AGENT_DETAIL_COPY } from "../../copy";
import type { AgentRunRow, AgentRunStatus } from "@/types/supabase";

interface PageProps {
  params: Promise<{ id: string; runId: string }>;
}

const STATUS_BADGE: Record<
  AgentRunStatus,
  { color: "success" | "warning" | "error" | "gray" | "brand"; label: string }
> = {
  queued: { color: "warning", label: "Queued" },
  running: { color: "brand", label: "Running" },
  completed: { color: "success", label: "Completed" },
  failed: { color: "error", label: "Failed" },
  cancelled: { color: "gray", label: "Cancelled" },
};

function computeDurationMs(run: AgentRunRow): number | null {
  if (!run.started_at) return null;
  const start = Date.parse(run.started_at);
  if (Number.isNaN(start)) return null;
  if (run.finished_at) {
    const end = Date.parse(run.finished_at);
    if (Number.isNaN(end)) return null;
    return end - start;
  }
  return Date.now() - start;
}

export default function RunDetailPage({ params }: PageProps) {
  // Next 16 convention: `params` is a Promise in client components.
  const { id: agentId, runId } = use(params);

  const { runs, loading } = useRealtimeRuns({ agentId });
  const run = runs.find((r) => r.id === runId) ?? null;
  const active = run ? isActiveRun(run.status) : false;
  const { chunks } = useRealtimeRunLogs(runId, { active });

  // Loading (initial snapshot) — keep it simple; no skeleton required
  // per plan scope.
  if (loading && !run) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center p-10">
        <LoadingIndicator size="md" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex flex-col gap-6 p-6 lg:p-10">
        <PageHeader
          title={AGENT_DETAIL_COPY.runDetailTitle}
          description="This run could not be located for this agent."
          breadcrumbs={[
            { label: "Agents", href: "/agents" },
            { label: agentId, href: `/agents/${agentId}` },
            { label: runId.slice(0, 8) },
          ]}
          actions={
            <Button
              color="secondary"
              iconLeading={ArrowLeft}
              href={`/agents/${agentId}`}
            >
              {AGENT_DETAIL_COPY.runDetailBack}
            </Button>
          }
        />
        <EmptyState
          icon={<SearchLg className="size-12" aria-hidden />}
          title={AGENT_DETAIL_COPY.runDetailNotFoundTitle}
          description={AGENT_DETAIL_COPY.runDetailNotFoundDescription}
        />
      </div>
    );
  }

  const durationMs = computeDurationMs(run);
  const status = STATUS_BADGE[run.status];
  const shortId = run.id.slice(0, 8);

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-10">
      <PageHeader
        title={`Run ${shortId}`}
        description={`Agent: ${agentId} · Started: ${relativeTime(run.started_at)}`}
        breadcrumbs={[
          { label: "Agents", href: "/agents" },
          { label: agentId, href: `/agents/${agentId}` },
          { label: shortId },
        ]}
        actions={
          <Button
            color="secondary"
            iconLeading={ArrowLeft}
            href={`/agents/${agentId}`}
          >
            {AGENT_DETAIL_COPY.runDetailBack}
          </Button>
        }
      />

      {/* Meta strip — status + adapter + node + duration + exit code */}
      <dl className="grid grid-cols-2 gap-4 rounded-xl border border-secondary bg-secondary px-5 py-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetaCell label="Status">
          <BadgeWithDot type="pill-color" color={status.color} size="md">
            {status.label}
          </BadgeWithDot>
        </MetaCell>
        <MetaCell label={AGENT_DETAIL_COPY.runDetailAdapterLabel}>
          <Badge type="modern" size="md">
            {run.adapter_type}
          </Badge>
        </MetaCell>
        <MetaCell label={AGENT_DETAIL_COPY.runDetailNodeLabel}>
          {run.node_id ? (
            <Link
              href={`/nodes`}
              className="text-sm font-medium text-brand-secondary hover:text-brand-primary [font-family:var(--font-code)]"
            >
              {run.node_id}
            </Link>
          ) : (
            <span className="text-sm text-tertiary">—</span>
          )}
        </MetaCell>
        <MetaCell label={AGENT_DETAIL_COPY.runDetailDurationLabel}>
          <span className={cx(
            "text-sm text-primary [font-family:var(--font-code)]",
          )}>
            {formatDuration(durationMs)}
          </span>
        </MetaCell>
        <MetaCell label={AGENT_DETAIL_COPY.runDetailStartedLabel}>
          <span className="text-sm text-primary" title={run.started_at ?? ""}>
            {formatTimestamp(run.started_at)}
          </span>
        </MetaCell>
        {!active ? (
          <MetaCell label={AGENT_DETAIL_COPY.runDetailExitCodeLabel}>
            <span
              className={cx(
                "text-sm [font-family:var(--font-code)]",
                run.exit_code === 0 && "text-success-primary",
                run.exit_code != null && run.exit_code !== 0 && "text-error-primary",
                run.exit_code == null && "text-tertiary",
              )}
            >
              {run.exit_code == null ? "—" : run.exit_code}
            </span>
          </MetaCell>
        ) : (
          <MetaCell label={AGENT_DETAIL_COPY.runDetailRunIdLabel}>
            <span className="text-sm text-tertiary [font-family:var(--font-code)]">
              {shortId}
            </span>
          </MetaCell>
        )}
      </dl>

      {/* Log stream — carries the SECURITY T6 banner + auto-scroll UX */}
      <RunLogStream chunks={chunks} active={active} />
    </div>
  );
}

function MetaCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wider text-tertiary">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
