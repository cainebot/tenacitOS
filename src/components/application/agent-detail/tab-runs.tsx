"use client";

// Phase 69 — Runs tab (Plan 69-02 + 69-05).
// Per-agent run history table. Source: Figma sketch 004 variant C.
//
// BLOCKING-2: consumes `AgentRow` + `AgentRunRow` (canonical shapes from
// `@/types/supabase`). Until Plan 05 wires the real Realtime subscription,
// `useRealtimeRuns` returns `[]` and the table falls through to the empty
// affordance.

import type { FC } from "react";
import Link from "next/link";
import { Badge, BadgeWithDot, Button, cx } from "@circos/ui";
import { RefreshCw01 } from "@untitledui/icons";
import type { AgentRow, AgentRunRow, AgentRunStatus } from "@/types/supabase";
import { getAgentSlug } from "@/lib/agent-display";
import { formatDuration, relativeTime } from "@/lib/relative-time";
import { useRealtimeRuns } from "@/hooks/useRealtimeRuns";

const STATUS_COLOR: Record<AgentRunStatus, "brand" | "success" | "error" | "warning" | "gray"> = {
  queued: "warning",
  running: "brand",
  completed: "success",
  failed: "error",
  cancelled: "warning",
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

export const TabRuns: FC<{ agent: AgentRow }> = ({ agent }) => {
  const { runs, loading, resync } = useRealtimeRuns(agent.agent_id);
  const slug = getAgentSlug(agent);

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-xl border border-secondary bg-secondary">
      <header className="flex items-center gap-3 border-b border-secondary px-6 py-5">
        <h3 className="text-lg font-semibold text-primary [font-family:var(--font-display)]">
          Runs · last {runs.length || 0}
        </h3>
        <div className="ml-auto flex items-center gap-2">
          <Badge type="modern" color="gray" size="md">
            {runs.length}
          </Badge>
          <Button
            color="secondary"
            size="md"
            iconTrailing={RefreshCw01}
            onClick={resync}
            isDisabled={loading}
          >
            Refresh
          </Button>
        </div>
      </header>

      <table className="w-full border-collapse" aria-busy={loading}>
        <thead>
          <tr className="border-b border-secondary bg-primary">
            <Th className="w-60 pl-6">Run ID</Th>
            <Th className="w-36">Status</Th>
            <Th className="w-28">Adapter</Th>
            <Th className="w-32">Duration</Th>
            <Th className="w-24">Exit</Th>
            <Th className="w-36">Started</Th>
            <Th className="w-24 pr-6 text-right">Open</Th>
          </tr>
        </thead>
        <tbody>
          {loading && <SkeletonRows />}
          {!loading && runs.length === 0 && (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-sm text-tertiary">
                No runs yet — this agent has not been woken.
              </td>
            </tr>
          )}
          {!loading &&
            runs.map((r) => <RunRowView key={r.id} run={r} agentSlug={slug} />)}
        </tbody>
      </table>
    </article>
  );
};

const Th: FC<{ children?: React.ReactNode; className?: string }> = ({ children, className }) => (
  <th
    className={cx(
      "px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-tertiary",
      className,
    )}
  >
    {children}
  </th>
);

const Td: FC<{ children?: React.ReactNode; className?: string }> = ({ children, className }) => (
  <td className={cx("px-4 py-5 align-middle text-base", className)}>{children}</td>
);

const RunRowView: FC<{ run: AgentRunRow; agentSlug: string }> = ({ run, agentSlug }) => {
  const durationMs = computeDurationMs(run);
  return (
    <tr className="border-b border-secondary last:border-b-0">
      <Td className="pl-6">
        <span className="text-primary [font-family:var(--font-code)]">run-{run.id.slice(0, 8)}</span>
      </Td>
      <Td>
        <BadgeWithDot type="modern" color={STATUS_COLOR[run.status]} size="md">
          {run.status}
        </BadgeWithDot>
      </Td>
      <Td>
        <Badge type="modern" size="md">
          {run.adapter_type}
        </Badge>
      </Td>
      <Td className="text-primary [font-family:var(--font-code)]">{formatDuration(durationMs)}</Td>
      <Td
        className={cx(
          "[font-family:var(--font-code)]",
          run.exit_code === 0 && "text-success-primary",
          run.exit_code != null && run.exit_code !== 0 && "text-error-primary",
          run.exit_code == null && "text-tertiary",
        )}
      >
        {run.exit_code == null ? "—" : run.exit_code}
      </Td>
      <Td className="text-tertiary">{relativeTime(run.started_at)}</Td>
      <Td className="pr-6 text-right">
        <Link
          href={`/agents/${agentSlug}/runs/${run.id}`}
          className="text-base font-medium text-brand-secondary hover:text-brand-primary"
        >
          View →
        </Link>
      </Td>
    </tr>
  );
};

const SkeletonRows: FC = () => (
  <>
    {[0, 1, 2, 3].map((i) => (
      <tr key={i} className="border-b border-secondary last:border-b-0">
        {[0, 1, 2, 3, 4, 5, 6].map((c) => (
          <td key={c} className="px-3 py-4">
            <div className="h-3 w-full max-w-[120px] rounded bg-tertiary opacity-60" />
          </td>
        ))}
      </tr>
    ))}
  </>
);
