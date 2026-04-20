"use client";

// Phase 69 — AgentHeader (Plan 69-02 + Plan 69-11 wiring).
// Source: Figma node 17036:109611 (frame agent-header).
// Avatar lg + name + 4 badges (status pill-color brand + 3 modern gray) +
// 4 actions (Assign task / Run heartbeat / Pause|Resume / Edit primary).
//
// BLOCKING-2: consumes `AgentRow` (canonical). Display-only derivatives come
// from `@/lib/agent-display`.
//
// Plan 69-11 deltas (additive, visual aesthetic preserved):
//   - Pause button flips to "Resume" with PlayCircle icon when agent.status
//     is 'paused'; wires new optional `onResume` callback.
//   - `isDisabled` logic: any in-flight mutation OR agent.status==='pending_approval'
//     (pendingApproval prop from parent; defaults to false — keeps Figma slice working).
//   - Status badge "Paused" tooltip renders `paused_reason` as React text child
//     (never HTML) — T3 XSS defense-in-depth.

import type { FC } from "react";
import { Avatar, Badge, BadgeWithDot, Button, cx, Tooltip } from "@circos/ui";
import { Edit05, PauseCircle, Play, PlayCircle, Plus } from "@untitledui/icons";
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
  /** Phase 69-11 — called when the button flips to "Resume" (agent.status='paused'). */
  onResume?: () => void;
  onEdit?: () => void;
  /** Phase 69-11 — disables all 4 buttons while any mutation is in flight. */
  actionPending?: boolean;
  /** Phase 69-11 — disables when there is an open approval for this agent. */
  pendingApproval?: boolean;
  className?: string;
}

export const AgentHeader: FC<AgentHeaderProps> = ({
  agent,
  onAssignTask,
  onRunHeartbeat,
  onPause,
  onResume,
  onEdit,
  actionPending = false,
  pendingApproval = false,
  className,
}) => {
  const initials = getAgentInitials(agent);
  const statusColor = getStatusColor(agent.status);
  const statusLabel = getStatusLabel(agent.status);
  const adapter = getAdapterLabel(agent);
  const roleLabel = getRoleLabel(agent);

  const isPaused = agent.status === "paused";
  const isDisabled = actionPending || pendingApproval;
  const pausedReason = agent.paused_reason ?? "No reason provided.";

  // Render helper: wrap paused badge in Tooltip when paused + reason present.
  const statusBadge = (
    <BadgeWithDot type="color" color={statusColor} size="sm">
      {statusLabel}
    </BadgeWithDot>
  );

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
          {isPaused ? (
            // Plan 69-11 — `title` is passed as React text (never HTML).
            // UUI Tooltip renders its title inside a <span> text node (T3 XSS defense).
            <Tooltip title={pausedReason} placement="bottom" delay={150}>
              <span
                className="inline-flex cursor-default rounded-full outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
                aria-label={`Paused: ${pausedReason}`}
                tabIndex={0}
              >
                {statusBadge}
              </span>
            </Tooltip>
          ) : (
            statusBadge
          )}
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
        <Button
          color="secondary"
          size="sm"
          iconLeading={Plus}
          onClick={onAssignTask}
          isDisabled={isDisabled}
        >
          Assign task
        </Button>
        <Button
          color="secondary"
          size="sm"
          iconLeading={Play}
          onClick={onRunHeartbeat}
          isDisabled={isDisabled || isPaused}
        >
          Run heartbeat
        </Button>
        {isPaused ? (
          <Button
            color="primary"
            size="sm"
            iconLeading={PlayCircle}
            onClick={onResume}
            isDisabled={isDisabled}
          >
            Resume
          </Button>
        ) : (
          <Button
            color="secondary"
            size="sm"
            iconLeading={PauseCircle}
            onClick={onPause}
            isDisabled={isDisabled}
          >
            Pause
          </Button>
        )}
        <Button
          color="primary"
          size="sm"
          iconLeading={Edit05}
          onClick={onEdit}
          isDisabled={isDisabled}
        >
          Edit
        </Button>
      </div>
    </div>
  );
};
