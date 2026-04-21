"use client";

// Phase 69 Plan 06 — create_agent approval payload renderer.
//
// Shows what the approver is about to bless into existence:
//   - AvatarLabelGroup (avatar preview + name/slug), guarded by
//     isAllowedAvatarUrl for SECURITY T9 defense-in-depth (legacy
//     approvals minted before Plan 03's validator).
//   - SOUL preview: truncated to the first 2,000 chars by default
//     inside a <pre> with React text children (auto-escaped — SECURITY
//     T2 / T3). A "Show full SOUL" toggle reveals the full content so
//     the human approver can audit every character before clicking
//     Approve (SECURITY T18 falsification).
//   - Administered fields (role / adapter / is_seed / bindings) shown
//     as muted chips with a tooltip saying "Assigned by ops". These
//     never land in payload.create_agent (server-whitelist, Plan 03)
//     so the section only advertises the fact — guards against future
//     drift where an operator might believe they can set these.

import { useState } from "react";
import { Badge, Tooltip, TooltipTrigger, Avatar, Button, cx } from "@circos/ui";
import { isAllowedAvatarUrl } from "@/lib/agent-validators";
import { APPROVALS_COPY } from "./copy";

interface CreateAgentPayload {
  agent_id?: string;
  slug?: string;
  name?: string;
  soul_content?: string;
  avatar_url?: string;
  target_snapshot?: {
    slug?: string;
    name?: string;
    avatar_url?: string;
    bound_node_id?: string | null;
    preferred_node_id?: string | null;
  };
}

function AdministeredChips() {
  // These keys are set by ops / dispatcher — never editable in the
  // payload. Rendered as read-only informational badges.
  const keys = ["role", "adapter_type", "is_seed"] as const;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {keys.map((k) => (
        <TooltipTrigger key={k}>
          <Tooltip title="Assigned by ops">
            <Badge color="gray" size="sm" type="pill-color">
              {k}
            </Badge>
          </Tooltip>
        </TooltipTrigger>
      ))}
    </div>
  );
}

export function ApprovalPayloadCreateAgent({
  payload,
}: {
  payload: CreateAgentPayload;
}) {
  const [showFullSoul, setShowFullSoul] = useState(false);

  const name = payload.name ?? payload.target_snapshot?.name ?? "(unnamed)";
  const slug = payload.slug ?? payload.agent_id ?? payload.target_snapshot?.slug ?? "";
  const rawAvatarUrl =
    payload.avatar_url ?? payload.target_snapshot?.avatar_url ?? null;
  // SECURITY T9 defense-in-depth: even though Plan 03 rejects bad
  // schemes at write time, legacy approvals minted before that
  // validator may carry javascript: / data: URLs. Strip before
  // passing to <Avatar src>.
  const safeAvatarUrl = isAllowedAvatarUrl(rawAvatarUrl) ? rawAvatarUrl ?? undefined : undefined;

  const soulContent = payload.soul_content ?? "";
  const soulLength = soulContent.length;
  const soulPreview = showFullSoul ? soulContent : soulContent.slice(0, 2000);
  const soulTruncated = !showFullSoul && soulLength > 2000;

  return (
    <div
      data-testid="approval-payload-create_agent"
      className="flex flex-col gap-4"
    >
      {/* Header: avatar + name + slug subtitle */}
      <section className="flex items-center gap-3">
        <Avatar
          size="lg"
          src={safeAvatarUrl}
          alt={name}
          initials={name.slice(0, 2).toUpperCase()}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-semibold text-primary">{name}</span>
          <span className="truncate text-xs text-tertiary">
            {slug ? `slug: ${slug}` : APPROVALS_COPY.createFieldSlug}
          </span>
        </div>
      </section>

      {/* SOUL preview (SECURITY T18 — expandable to reveal full content) */}
      <section className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-quaternary">
            {APPROVALS_COPY.createFieldSoul}
          </span>
          <span className="font-mono text-xs text-tertiary">
            {soulLength}/50000
          </span>
        </div>
        {soulLength === 0 ? (
          <p className="text-xs text-tertiary italic">
            {APPROVALS_COPY.createNoSoul}
          </p>
        ) : (
          <>
            <pre
              className={cx(
                "max-h-64 overflow-auto rounded-md border border-secondary bg-tertiary p-3",
                "font-mono text-xs text-primary whitespace-pre-wrap break-all",
              )}
              data-testid="approval-payload-create_agent-soul"
            >
              {soulPreview}
            </pre>
            {soulTruncated && (
              <p className="text-xs text-warning-primary">
                {APPROVALS_COPY.createSoulTruncatedNote}
              </p>
            )}
            {soulLength > 2000 && (
              <div>
                <Button
                  color="tertiary"
                  size="sm"
                  onClick={() => setShowFullSoul((v) => !v)}
                >
                  {showFullSoul
                    ? APPROVALS_COPY.createHideFullSoul
                    : `${APPROVALS_COPY.createShowFullSoul} (${soulLength} chars)`}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Administered fields (read-only) */}
      <section className="flex flex-col gap-1">
        <span className="text-xs font-medium text-quaternary">
          Administered fields (read-only)
        </span>
        <AdministeredChips />
      </section>
    </div>
  );
}
