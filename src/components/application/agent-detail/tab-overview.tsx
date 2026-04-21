"use client";

// Phase 69 — Overview tab (Plan 69-02).
// Source: Figma node 17036:109627.
// 2-col layout (flex-1 + 440px fixed). Left = administered fields rows.
// Right = Live activity (active run + 3 stat tiles + avg duration).
//
// BLOCKING-2: consumes `AgentRow` (canonical). Administered fields read
// from the superset of Phase 9 + Phase 62 columns.

import type { FC, ReactNode } from "react";
import { BadgeWithDot, cx } from "@circos/ui";
import type { AgentRow } from "@/types/supabase";
import { getAdapterLabel, getRoleLabel } from "@/lib/agent-display";
import { formatTimestamp, relativeTime } from "@/lib/relative-time";
import { useRealtimeRuns } from "@/hooks/useRealtimeRuns";

interface MetaRow {
  key: string;
  value: string;
  locked: boolean;
}

export const TabOverview: FC<{ agent: AgentRow }> = ({ agent }) => {
  const { runs } = useRealtimeRuns(agent.agent_id);
  const activeRun = runs.find((r) => r.status === "running");
  const completed24 = runs.filter((r) => r.status === "completed").length;
  const failed24 = runs.filter((r) => r.status === "failed").length;
  const cancelled24 = runs.filter((r) => r.status === "cancelled").length;
  const finishedDurations = runs
    .map((r) => {
      if (r.started_at && r.finished_at) {
        const start = Date.parse(r.started_at);
        const end = Date.parse(r.finished_at);
        if (!Number.isNaN(start) && !Number.isNaN(end)) return end - start;
      }
      return null;
    })
    .filter((ms): ms is number => ms != null);
  const avgDurationMs = finishedDurations.length
    ? Math.round(finishedDurations.reduce((a, b) => a + b, 0) / finishedDurations.length)
    : null;

  const permissionsLabel = (() => {
    const p = agent.permissions;
    if (p && typeof p === "object") {
      const keys = Object.keys(p);
      return keys.length > 0 ? keys.join(", ") : "—";
    }
    return "—";
  })();

  const metaRows: MetaRow[] = [
    { key: "role", value: getRoleLabel(agent), locked: true },
    { key: "adapter_type", value: getAdapterLabel(agent), locked: true },
    { key: "permissions", value: permissionsLabel, locked: true },
    { key: "preferred_node_id", value: agent.preferred_node_id ?? "—", locked: true },
    { key: "bound_node_id", value: agent.bound_node_id ?? "—", locked: true },
    { key: "is_seed", value: String(Boolean(agent.is_seed)), locked: true },
    { key: "created_at", value: formatTimestamp(agent.created_at), locked: false },
    { key: "updated_at", value: formatTimestamp(agent.updated_at), locked: false },
  ];

  return (
    <div className="flex w-full items-start gap-6">
      <Card title="Administered fields" className="flex-1">
        <ul className="flex flex-col">
          {metaRows.map((row, i) => (
            <li
              key={row.key}
              className={cx(
                "flex items-center justify-between gap-3 px-5 py-3",
                i < metaRows.length - 1 && "border-b border-secondary",
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-tertiary">
                {row.key}
                {row.locked && (
                  <span aria-label="Read-only" className="text-[10px] opacity-60">
                    🔒
                  </span>
                )}
              </span>
              <span className="text-sm text-primary [font-family:var(--font-code)]">
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Live activity (24h)" className="w-[440px] shrink-0">
        <div className="flex flex-col gap-4 px-5 py-4">
          {activeRun ? (
            <div className="flex items-center gap-3 rounded-lg bg-primary px-3 py-2.5">
              <BadgeWithDot type="pill-color" color="brand" size="sm">
                running
              </BadgeWithDot>
              <span className="text-sm text-primary [font-family:var(--font-code)]">
                run-{activeRun.id.slice(0, 8)} · started {relativeTime(activeRun.started_at)}
              </span>
            </div>
          ) : (
            <div className="rounded-lg bg-primary px-3 py-2.5 text-sm text-tertiary">
              No active run
            </div>
          )}

          <div className="flex items-start gap-3">
            <Stat n={completed24} label="completed" color="text-success-primary" />
            <Stat n={failed24} label="failed" color="text-error-primary" />
            <Stat n={cancelled24} label="cancelled" color="text-warning-primary" />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-sm text-tertiary">avg duration</span>
            <span className="text-sm text-primary [font-family:var(--font-code)]">
              {avgDurationMs == null ? "—" : `${Math.round(avgDurationMs / 1000)} s`}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

const Card: FC<{ title: string; children: ReactNode; className?: string }> = ({
  title,
  children,
  className,
}) => (
  <article
    className={cx(
      "flex flex-col overflow-hidden rounded-xl border border-secondary bg-secondary",
      className,
    )}
  >
    <header className="border-b border-secondary px-5 py-4">
      <h3 className="text-base font-bold text-primary [font-family:var(--font-display)]">
        {title}
      </h3>
    </header>
    {children}
  </article>
);

const Stat: FC<{ n: number; label: string; color: string }> = ({ n, label, color }) => (
  <div className="flex flex-1 flex-col gap-1 rounded-lg bg-primary p-3">
    <span className={cx("text-2xl font-bold [font-family:var(--font-display)]", color)}>{n}</span>
    <span className="text-xs text-tertiary">{label}</span>
  </div>
);
