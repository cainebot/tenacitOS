"use client";

// Phase 69 Plan 10 — update_user_instruction_content approval payload renderer.

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
  file_icon?: string | null;
  prior_content?: string | null;
  prior_version?: number;
};

interface UpdateUserInstructionContentPayload {
  agent_id?: string;
  file_name?: string;
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

export function ApprovalPayloadUpdateUserInstructionContent({
  payload,
}: {
  payload: UpdateUserInstructionContentPayload;
}) {
  const [showFull, setShowFull] = useState(false);
  const snap = payload.target_snapshot ?? {};
  const name = snap.agent_name ?? payload.agent_id ?? "(agent missing)";
  const slug = snap.agent_slug ?? payload.agent_id ?? "";
  const rawAvatar = snap.agent_avatar_url ?? null;
  const safeAvatar = isAllowedAvatarUrl(rawAvatar) ? rawAvatar ?? undefined : undefined;
  const FileIcon = resolveIcon(snap.file_icon);

  const before = typeof snap.prior_content === "string" ? snap.prior_content : "";
  const after = typeof payload.content === "string" ? payload.content : "";
  const beforePreview = showFull ? before : before.slice(0, 2000);
  const afterPreview = showFull ? after : after.slice(0, 2000);

  const priorVer = typeof snap.prior_version === "number" ? snap.prior_version : 1;

  return (
    <div
      data-testid="approval-payload-update_user_instruction_content"
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
        <FileIcon className="size-5 text-fg-quaternary" aria-hidden />
        <Badge type="modern" size="sm">
          {payload.file_name ?? "(unnamed)"}
        </Badge>
        <span className="font-mono text-xs text-tertiary">
          v{priorVer} → v{priorVer + 1}
        </span>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div>
          <span className="mb-1 block text-xs font-medium text-quaternary">Before</span>
          <pre
            className={cx(
              "max-h-48 overflow-auto rounded-md border border-secondary bg-tertiary p-2",
              "font-mono text-xs text-tertiary whitespace-pre-wrap break-all line-through",
            )}
          >
            {beforePreview || "(empty)"}
          </pre>
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-quaternary">After</span>
          <pre
            className={cx(
              "max-h-48 overflow-auto rounded-md border border-secondary bg-tertiary p-2",
              "font-mono text-xs text-primary whitespace-pre-wrap break-all",
            )}
          >
            {afterPreview || "(empty)"}
          </pre>
        </div>
      </section>

      {after.length > 2000 || before.length > 2000 ? (
        <div>
          <Button color="tertiary" size="sm" onClick={() => setShowFull((v) => !v)}>
            {showFull ? "Hide full content" : "Show full content"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
