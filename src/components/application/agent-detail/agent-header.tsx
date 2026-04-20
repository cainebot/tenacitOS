"use client";

// Phase 69 — AgentHeader (Plan 69-02).
// Source: Figma node 17036:109611 (frame agent-header).
// Avatar lg + name + 4 badges (status pill-color brand + 3 modern gray) +
// 4 actions (Assign task / Run heartbeat / Pause / Edit primary).
//
// BLOCKING-2: consumes `AgentRow` (canonical). Display-only derivatives come
// from `@/lib/agent-display`.

import type { FC } from "react";
import { Avatar, Badge, BadgeWithDot, Button, cx } from "@circos/ui";
import { Edit05, PauseCircle, Play, Plus } from "@untitledui/icons";
import type { AgentRow } from "@/types/supabase";
import {
  getAdapterLabel,
  getAgentInitials,
  getRoleLabel,
  getStatusColor,
  getStatusLabel,
} from "@/lib/agent-display";

export interface AgentHeaderProps {
  agent: AgentRow;
  onAssignTask?: () => void;
  onRunHeartbeat?: () => void;
  onPause?: () => void;
  onEdit?: () => void;
  className?: string;
}

export const AgentHeader: FC<AgentHeaderProps> = ({
  agent,
  onAssignTask,
  onRunHeartbeat,
  onPause,
  onEdit,
  className,
}) => {
  const initials = getAgentInitials(agent);
  const statusColor = getStatusColor(agent.status);
  const statusLabel = getStatusLabel(agent.status);
  const adapter = getAdapterLabel(agent);
  const roleLabel = getRoleLabel(agent);

  return (
    <div className={cx("flex w-full items-start gap-6", className)}>
      <Avatar
        size="2xl"
        initials={initials}
        src={agent.avatar_url ?? undefined}
        status="online"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h1 className="text-3xl font-bold text-primary [font-family:var(--font-display)]">
          {agent.name}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <BadgeWithDot type="color" color={statusColor} size="sm">
            {statusLabel}
          </BadgeWithDot>
          <Badge type="modern" size="sm">
            {adapter}
          </Badge>
          {roleLabel !== "—" && (
            <Badge type="modern" size="sm">
              {roleLabel}
            </Badge>
          )}
          {agent.bound_node_id && (
            <Badge type="modern" size="sm">
              {agent.bound_node_id}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-start gap-2">
        <Button color="secondary" size="sm" iconLeading={Plus} onClick={onAssignTask}>
          Assign task
        </Button>
        <Button color="secondary" size="sm" iconLeading={Play} onClick={onRunHeartbeat}>
          Run heartbeat
        </Button>
        <Button color="secondary" size="sm" iconLeading={PauseCircle} onClick={onPause}>
          Pause
        </Button>
        <Button color="primary" size="sm" iconLeading={Edit05} onClick={onEdit}>
          Edit
        </Button>
      </div>
    </div>
  );
};
