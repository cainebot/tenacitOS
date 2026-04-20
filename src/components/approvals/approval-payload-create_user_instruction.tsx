"use client";

// Phase 69 Plan 10 — create_user_instruction approval payload renderer.

import { useState } from "react";
import { Avatar, Badge, Button, cx } from "@circos/ui";
import * as UntitledIcons from "@untitledui/icons";
import { File06 } from "@untitledui/icons";
import { isAllowedAvatarUrl } from "@/lib/agent-validators";

type IconComp = typeof File06;

type TargetSnapshot = {
  agent_name?: string | null;
  agent_slug?: string | null;
  agent_avatar_url?: string | null;
};

interface CreateUserInstructionPayload {
  agent_id?: string;
  file_name?: string;
  icon?: string;
  content?: string;
  target_snapshot?: TargetSnapshot;
}

function resolveIcon(name: string | null | undefined): IconComp {
  const idx = UntitledIcons as unknown as Record<string, IconComp>;
  if (typeof name === "string" && name in idx) {
    const v = idx[name];
    if (typeof v === "function" || typeof v === "object") return v;
  }
  return File06;
}

export function ApprovalPayloadCreateUserInstruction({
  payload,
}: {
  payload: CreateUserInstructionPayload;
}) {
  const [showFull, setShowFull] = useState(false);
  const snap = payload.target_snapshot ?? {};
  const name = snap.agent_name ?? payload.agent_id ?? "(agent missing)";
  const slug = snap.agent_slug ?? payload.agent_id ?? "";
  const rawAvatar = snap.agent_avatar_url ?? null;
  const safeAvatar = isAllowedAvatarUrl(rawAvatar) ? rawAvatar ?? undefined : undefined;
  const FileIcon = resolveIcon(payload.icon);

  const content = typeof payload.content === "string" ? payload.content : "";
  const preview = showFull ? content : content.slice(0, 500);

  return (
    <div
      data-testid="approval-payload-create_user_instruction"
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
        <Badge color="brand" size="sm">New file</Badge>
        <FileIcon className="size-5 text-fg-quaternary" aria-hidden />
        <code className="text-sm font-medium text-primary">{payload.file_name ?? "(unnamed)"}</code>
        <span className="font-mono text-xs text-tertiary">
          {content.length.toLocaleString()}/50,000 chars
        </span>
      </section>

      {content.length === 0 ? (
        <p className="text-xs text-tertiary italic">(no initial content)</p>
      ) : (
        <>
          <pre
            className={cx(
              "max-h-64 overflow-auto rounded-md border border-secondary bg-tertiary p-3",
              "font-mono text-xs text-primary whitespace-pre-wrap break-all",
            )}
          >
            {preview}
          </pre>
          {content.length > 500 && (
            <div>
              <Button color="tertiary" size="sm" onClick={() => setShowFull((v) => !v)}>
                {showFull
                  ? "Hide full content"
                  : `Show full content (${content.length.toLocaleString()} chars)`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
