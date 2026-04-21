// Phase 69 Plan 02 — display-only selectors for AgentRow.
//
// Components never render `AgentRow` fields directly; they call these helpers
// to compute initials, human-friendly status labels, and safe role labels.
// Keeping derivations here (not duplicated in each component) is the cheap
// half of BLOCKING-2 (AgentRow convergence).
//
// NOTE: Purely functional. No Supabase access. Importable from both RSC and
// client components. Keep this file free of Next.js / React imports.

import type { AgentRow, AgentStatus } from "@/types/supabase";

/**
 * 2-letter uppercase initials from the agent's name.
 * - Uses the first non-whitespace char of each token, max 2.
 * - Falls back to `??` when the name is empty / whitespace.
 * - Never throws on Unicode — emoji-leading names collapse to `??` too.
 */
export function getAgentInitials(agent: Pick<AgentRow, "name">): string {
  const trimmed = (agent.name ?? "").trim();
  if (trimmed.length === 0) return "??";
  const tokens = trimmed.split(/\s+/).slice(0, 2);
  const letters = tokens
    .map((tok) => {
      // Grab the first ASCII-letter-ish char, else fall back to the 1st codepoint.
      const m = tok.match(/[A-Za-z0-9]/);
      return (m ? m[0] : tok[0] ?? "").toUpperCase();
    })
    .filter(Boolean)
    .join("");
  return letters.length > 0 ? letters.slice(0, 2) : "??";
}

/**
 * Human-friendly label for the seven canonical AgentStatus values.
 * Unknown values pass through as-is so UI doesn't hide bad data.
 */
export function getStatusLabel(status: AgentStatus | string | null | undefined): string {
  if (!status) return "unknown";
  switch (status) {
    case "idle":
      return "idle";
    case "working":
      return "working";
    case "thinking":
      return "thinking";
    case "queued":
      return "queued";
    case "executing_tool":
      return "executing tool";
    case "error":
      return "error";
    case "offline":
      return "offline";
    case "paused":
      return "paused";
    default:
      return String(status);
  }
}

/**
 * Canonical color bucket for an agent status — used by BadgeWithDot / dots.
 * Aligned with `agents_status_check` CHECK constraint (Phase 62 migration 002).
 */
export type AgentStatusColor = "success" | "brand" | "warning" | "error" | "gray";

export function getStatusColor(
  status: AgentStatus | string | null | undefined,
): AgentStatusColor {
  switch (status) {
    case "idle":
      return "success";
    case "working":
    case "thinking":
    case "executing_tool":
      return "brand";
    case "queued":
      return "warning";
    case "error":
      return "error";
    case "offline":
      return "gray";
    case "paused":
      return "warning";
    default:
      return "gray";
  }
}

/**
 * True when the agent is soft-deleted (Phase 62 migration 002 adds
 * `agents.deleted_at`). Consumers filter these out by default; the list
 * page opts in via the "include archived" toggle.
 */
export function isArchived(agent: Pick<AgentRow, "deleted_at">): boolean {
  return agent.deleted_at != null;
}

/**
 * Slug accessor that falls back to agent_id when slug is missing.
 * Seed rows in the Phase 62 backfill have slug === agent_id; post-Phase-62
 * rows always set slug explicitly. Components consume this helper so the
 * URL path (`/agents/${slug}`) works on both generations of data.
 */
export function getAgentSlug(agent: Pick<AgentRow, "slug" | "agent_id">): string {
  return agent.slug && agent.slug.length > 0 ? agent.slug : agent.agent_id;
}

/**
 * Adapter label — reads optional Phase 62 `adapter_type`, otherwise "—".
 */
export function getAdapterLabel(
  agent: Pick<AgentRow, "adapter_type">,
): string {
  return agent.adapter_type && agent.adapter_type.length > 0 ? agent.adapter_type : "—";
}

/**
 * Role label compatible with both Phase 9 enum (lead / specialist / intern)
 * and Phase 62 role text (scrum_master / prospector / …). Kebab to
 * space-separated for display.
 */
export function getRoleLabel(agent: Pick<AgentRow, "role">): string {
  if (!agent.role) return "—";
  return String(agent.role).replace(/[_-]+/g, " ");
}
