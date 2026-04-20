"use client";

// Phase 69 Plan 06 — update_agent approval payload renderer.
//
// Shows a before/after diff of the whitelisted fields
// (name, soul_content, avatar_url). Snapshot-aware: consumes
// `payload.target_snapshot` embedded by Plan 03 at approval-creation
// time. Zero network fetches for the snapshot-present branch
// (closes REVIEW finding 6 N+1 on modal open).
//
// SECURITY:
//   - T2 consistency: the after-column for soul_content reuses the
//     same <pre> + 2000-char slice + "Show full SOUL" expand toggle
//     as create_agent. React text children only — no markdown, no
//     dangerouslySetInnerHTML.
//   - T9 defense-in-depth: avatar_url values (both before and after)
//     pass through isAllowedAvatarUrl before being rendered.
//   - T18 falsification: "Show full SOUL" button reveals all 50 KB so
//     the operator can audit hidden prompt-injection payload.
//
// Keys outside the whitelist render as a visible warning row so a
// future drift (dispatcher accepting a new key without UI support)
// is loud instead of silent.

import { useEffect, useState } from "react";
import { Avatar, Button, cx } from "@circos/ui";
import { isAllowedAvatarUrl } from "@/lib/agent-validators";
import { APPROVALS_COPY } from "./copy";

type TargetSnapshot = {
  slug?: string;
  name?: string;
  avatar_url?: string | null;
  bound_node_id?: string | null;
  preferred_node_id?: string | null;
};

interface UpdateAgentPayload {
  agent_id?: string;
  changes?: Record<string, unknown>;
  target_snapshot?: TargetSnapshot;
}

const WHITELISTED_KEYS = ["name", "soul_content", "avatar_url"] as const;
type WhitelistedKey = (typeof WHITELISTED_KEYS)[number];

function isWhitelistedKey(k: string): k is WhitelistedKey {
  return (WHITELISTED_KEYS as readonly string[]).includes(k);
}

function safeAvatar(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  return isAllowedAvatarUrl(raw) ? raw : undefined;
}

function AvatarDiffRow({
  before,
  after,
}: {
  before: unknown;
  after: unknown;
}) {
  const safeBefore = safeAvatar(before);
  const safeAfter = safeAvatar(after);
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-2">
        <Avatar size="sm" src={safeBefore} alt="before" initials="—" />
        <span className="truncate text-xs text-tertiary line-through">
          {typeof before === "string" && before.length > 0 ? before : "—"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Avatar size="sm" src={safeAfter} alt="after" initials="→" />
        <span className="truncate text-xs font-medium text-primary">
          {typeof after === "string" && after.length > 0 ? after : "—"}
        </span>
      </div>
    </div>
  );
}

function SoulDiffRow({
  before,
  after,
}: {
  before: unknown;
  after: unknown;
}) {
  const [showFull, setShowFull] = useState(false);
  const afterStr = typeof after === "string" ? after : "";
  const beforeStr = typeof before === "string" ? before : "";
  const afterLen = afterStr.length;
  const beforeLen = beforeStr.length;
  const afterPreview = showFull ? afterStr : afterStr.slice(0, 2000);
  const beforePreview = showFull ? beforeStr : beforeStr.slice(0, 2000);
  const beforeAvailable = beforeLen > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="mb-1 block text-xs font-medium text-quaternary">
            {APPROVALS_COPY.updateBeforeLabel}
          </span>
          {beforeAvailable ? (
            <pre
              className={cx(
                "max-h-48 overflow-auto rounded-md border border-secondary bg-tertiary p-2",
                "font-mono text-xs text-tertiary whitespace-pre-wrap break-all line-through",
              )}
              data-testid="approval-payload-update_agent-soul-before"
            >
              {beforePreview}
            </pre>
          ) : (
            <p className="text-xs text-tertiary italic">
              (previous SOUL hidden — approve to apply)
            </p>
          )}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="block text-xs font-medium text-quaternary">
              {APPROVALS_COPY.updateAfterLabel}
            </span>
            <span className="font-mono text-xs text-tertiary">
              {afterLen}/50000
            </span>
          </div>
          <pre
            className={cx(
              "max-h-48 overflow-auto rounded-md border border-secondary bg-tertiary p-2",
              "font-mono text-xs text-primary whitespace-pre-wrap break-all",
            )}
            data-testid="approval-payload-update_agent-soul-after"
          >
            {afterPreview}
          </pre>
        </div>
      </div>
      {/* ME-07 — toggle gated on EITHER column exceeding 2000 chars so the
          before-column (SECURITY T18 falsification) is always reachable. */}
      {(afterLen > 2000 || beforeLen > 2000) && (
        <div>
          <Button
            color="tertiary"
            size="sm"
            onClick={() => setShowFull((v) => !v)}
          >
            {showFull
              ? APPROVALS_COPY.createHideFullSoul
              : `${APPROVALS_COPY.createShowFullSoul} (${Math.max(afterLen, beforeLen)} chars)`}
          </Button>
        </div>
      )}
    </div>
  );
}

function SimpleDiffRow({
  before,
  after,
}: {
  before: unknown;
  after: unknown;
}) {
  const beforeStr = typeof before === "string" && before.length > 0 ? before : "—";
  const afterStr = typeof after === "string" && after.length > 0 ? after : "—";
  return (
    <div className="grid grid-cols-2 gap-3">
      <span className="truncate text-sm text-tertiary line-through">
        {beforeStr}
      </span>
      <span className="truncate text-sm font-medium text-primary underline decoration-success-primary">
        {afterStr}
      </span>
    </div>
  );
}

async function fetchAgentSnapshot(
  agentId: string,
  signal: AbortSignal,
): Promise<TargetSnapshot | null> {
  try {
    const res = await fetch(
      `/api/agents/${encodeURIComponent(agentId)}`,
      { credentials: "same-origin", signal },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { agent?: TargetSnapshot };
    return data?.agent ?? null;
  } catch {
    return null;
  }
}

export function ApprovalPayloadUpdateAgent({
  payload,
}: {
  payload: UpdateAgentPayload;
}) {
  const snapshot = payload.target_snapshot;
  const changes = (payload.changes ?? {}) as Record<string, unknown>;
  const agentId = payload.agent_id ?? snapshot?.slug ?? "";

  // Snapshot-present branch → zero fetches (REVIEW finding 6).
  // Legacy fallback: only when snapshot is absent do we hit /api/agents/:id.
  const [fallbackSnapshot, setFallbackSnapshot] = useState<TargetSnapshot | null>(
    null,
  );

  useEffect(() => {
    if (snapshot || !agentId) return;
    const controller = new AbortController();
    void fetchAgentSnapshot(agentId, controller.signal).then((snap) => {
      if (snap) setFallbackSnapshot(snap);
    });
    return () => controller.abort();
  }, [snapshot, agentId]);

  const effectiveSnapshot = snapshot ?? fallbackSnapshot;
  const headerName =
    effectiveSnapshot?.name ??
    (typeof changes.name === "string" ? changes.name : agentId) ??
    "(agent missing)";
  const headerAvatarUrl = safeAvatar(effectiveSnapshot?.avatar_url);
  const headerSubtitle = effectiveSnapshot?.slug ?? agentId ?? "";

  const changeEntries = Object.entries(changes);

  return (
    <div
      data-testid="approval-payload-update_agent"
      className="flex flex-col gap-4"
    >
      {/* Header */}
      <section className="flex items-center gap-3">
        <Avatar
          size="lg"
          src={headerAvatarUrl}
          alt={headerName}
          initials={headerName.slice(0, 2).toUpperCase()}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-semibold text-primary">
            {headerName}
          </span>
          <span className="truncate text-xs text-tertiary">
            {headerSubtitle}
          </span>
        </div>
      </section>

      <p className="text-xs text-tertiary">{APPROVALS_COPY.updateWhitelistNote}</p>

      {/* Changes */}
      <section className="flex flex-col gap-3">
        {changeEntries.length === 0 ? (
          <p className="text-xs text-tertiary italic">
            {APPROVALS_COPY.updateNoChanges}
          </p>
        ) : (
          changeEntries.map(([key, afterValue]) => {
            if (!isWhitelistedKey(key)) {
              return (
                <div
                  key={key}
                  className="rounded-md border border-error bg-error_subtle p-2 text-xs text-error-primary"
                  data-testid={`approval-payload-update_agent-warning-${key}`}
                >
                  Non-whitelisted key ignored: <code>{key}</code>
                </div>
              );
            }
            // before value from snapshot for name/avatar_url; soul_content
            // may carry previous content if the snapshot/producer embedded it.
            const beforeValue =
              key === "name"
                ? effectiveSnapshot?.name
                : key === "avatar_url"
                  ? effectiveSnapshot?.avatar_url
                  : key === "soul_content"
                    ? (effectiveSnapshot as Record<string, unknown> | undefined)?.soul_content
                    : undefined;

            return (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-quaternary">{key}</span>
                {key === "soul_content" ? (
                  <SoulDiffRow before={beforeValue} after={afterValue} />
                ) : key === "avatar_url" ? (
                  <AvatarDiffRow before={beforeValue} after={afterValue} />
                ) : (
                  <SimpleDiffRow before={beforeValue} after={afterValue} />
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
