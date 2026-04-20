"use client";

// Phase 69 — AgentCard (grid view tile).
// Source: Figma node 17036:111407 (Agent_item 17036:111866).
// Portrait placeholder (initials) + status dot + name/role/status badge
// + node/skills badges.
//
// BLOCKING-2: consumes `AgentRow` (canonical). Display-only derivatives come
// from `@/lib/agent-display`. The portrait renders initials via UUI Avatar
// (the 7 unlicensed PNG portraits were removed in BLOCKING-4).

import type { FC } from "react";
import { Avatar, Badge, cx } from "@circos/ui";
import type { AgentRow } from "@/types/supabase";
import {
  getAgentInitials,
  getRoleLabel,
  getStatusColor,
  getStatusLabel,
} from "@/lib/agent-display";

export interface AgentCardProps {
  agent: AgentRow;
  onClick?: (agent: AgentRow) => void;
}

export const AgentCard: FC<AgentCardProps> = ({ agent, onClick }) => {
  const statusColor = getStatusColor(agent.status);
  const statusLabel = getStatusLabel(agent.status);
  const initials = getAgentInitials(agent);
  const roleLabel = getRoleLabel(agent);
  const permissions = agent.permissions;
  const skillsCount = permissions && typeof permissions === "object"
    ? Object.keys(permissions).length
    : 0;
  const dotIsLive = agent.status === "working" || agent.status === "idle" ||
    agent.status === "thinking" || agent.status === "executing_tool";

  return (
    <button
      type="button"
      onClick={onClick ? () => onClick(agent) : undefined}
      className={cx(
        "group relative flex cursor-pointer gap-3 rounded-2xl bg-primary_alt p-2 text-left",
        "transition-all duration-200 ease-out will-change-transform",
        "hover:-translate-y-0.5 hover:bg-secondary_hover hover:shadow-lg",
        "active:translate-y-0 active:scale-[0.99]",
        "focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
      )}
    >
      <Portrait initials={initials} avatarUrl={agent.avatar_url ?? null} />

      <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
        <div className="flex w-full flex-col items-start gap-1">
          <p className="truncate text-2xl font-semibold leading-8 text-primary [font-family:var(--font-display)]">
            {agent.name}
          </p>
          <p className="text-sm font-medium text-tertiary">{roleLabel}</p>
          <Badge type="pill-color" color={statusColor} size="sm">
            {statusLabel}
          </Badge>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 pt-2">
          <Badge type="modern" size="sm">
            {agent.bound_node_id ?? "unbound"}
          </Badge>
          {skillsCount > 0 && (
            <Badge type="modern" size="sm">
              +{skillsCount}
            </Badge>
          )}
        </div>
      </div>

      <span
        className={cx(
          "pointer-events-none absolute size-3 rounded-full ring-[3px]",
          "left-[102px] top-[140px]",
          dotIsLive
            ? "bg-fg-success-secondary ring-bg-primary_alt"
            : "bg-fg-disabled_subtle ring-bg-primary_alt",
        )}
      />
    </button>
  );
};

const Portrait: FC<{ initials: string; avatarUrl: string | null }> = ({ initials, avatarUrl }) => (
  <div className="relative h-[150px] w-[112px] shrink-0 overflow-hidden rounded-xl bg-tertiary">
    <div className="flex h-full w-full items-center justify-center">
      <Avatar
        size="2xl"
        initials={initials}
        src={avatarUrl ?? undefined}
        alt={initials}
      />
    </div>
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-transparent from-[68%] to-black/20"
    />
  </div>
);
