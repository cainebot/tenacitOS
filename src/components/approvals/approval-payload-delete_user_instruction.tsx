"use client";

// Phase 69 Plan 10 — delete_user_instruction approval payload renderer.

import { Avatar, Badge, cx } from "@circos/ui";
import { AlertTriangle } from "@untitledui/icons";
import { isAllowedAvatarUrl } from "@/lib/agent-validators";
import { resolveIcon } from "@/lib/icon-resolve";

type TargetSnapshot = {
  agent_name?: string | null;
  agent_slug?: string | null;
  agent_avatar_url?: string | null;
  file_icon?: string | null;
  prior_content_length?: number;
};

interface DeleteUserInstructionPayload {
  agent_id?: string;
  file_name?: string;
  target_snapshot?: TargetSnapshot;
}

export function ApprovalPayloadDeleteUserInstruction({
  payload,
}: {
  payload: DeleteUserInstructionPayload;
}) {
  const snap = payload.target_snapshot ?? {};
  const name = snap.agent_name ?? payload.agent_id ?? "(agent missing)";
  const slug = snap.agent_slug ?? payload.agent_id ?? "";
  const rawAvatar = snap.agent_avatar_url ?? null;
  const safeAvatar = isAllowedAvatarUrl(rawAvatar) ? rawAvatar ?? undefined : undefined;
  // HI-02 — resolveIcon is module-scoped and cached by icon-name.
  // The disable lives on the <FileIcon /> JSX site below because that
  // is where react-hooks/static-components reports the violation.
  // See src/lib/icon-resolve.ts for the cache + rationale.
  const FileIcon = resolveIcon(snap.file_icon);
  const priorLen =
    typeof snap.prior_content_length === "number" ? snap.prior_content_length : 0;

  return (
    <div
      data-testid="approval-payload-delete_user_instruction"
      className="flex flex-col gap-4"
    >
      <section className="flex items-center gap-3">
        <Avatar size="lg" src={safeAvatar} alt={name} initials={name.slice(0, 2).toUpperCase()} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-semibold text-primary">{name}</span>
          <span className="truncate text-xs text-tertiary">{slug}</span>
        </div>
      </section>

      <section className="flex items-center gap-2">
        {/* eslint-disable-next-line react-hooks/static-components */}
        <FileIcon className="size-5 text-fg-quaternary" aria-hidden />
        <Badge color="error" size="sm">Will be deleted</Badge>
        <code className="text-sm font-medium text-primary">{payload.file_name ?? "(unnamed)"}</code>
      </section>

      <section
        className={cx(
          "flex items-start gap-3 rounded-md border border-warning bg-warning_subtle p-3",
        )}
      >
        <AlertTriangle className="size-5 shrink-0 text-warning-primary" aria-hidden />
        <div className="flex flex-col gap-1 text-sm text-warning-primary">
          <p>
            File <code className="font-mono">{payload.file_name ?? "(unnamed)"}</code> will be
            permanently removed. This cannot be reversed by approvers.
          </p>
          <p className="text-xs text-tertiary">
            {priorLen.toLocaleString()} chars will be discarded.
          </p>
        </div>
      </section>
    </div>
  );
}
