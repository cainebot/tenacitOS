"use client";

// Phase 69 Plan 06 — delete_agents_bulk approval payload renderer.
//
// Snapshot-first (REVIEW finding 6): consumes
// payload.target_snapshots — Array<{agent_id, name, slug, avatar_url}>
// — when present. Zero network calls in that branch.
//
// Legacy fallback: if the Phase 67/68 MCP producer hasn't been
// updated to embed target_snapshots yet, fires a single batched
// fetch `GET /api/agents?ids=a,b,c,...` (added in Plan 03) instead
// of N parallel per-agent fetches.
//
// SECURITY T9 defense-in-depth: every rendered avatar_url passes
// through isAllowedAvatarUrl before reaching <Avatar src>.

import { useEffect, useMemo, useState } from "react";
import { Avatar, Badge, FeaturedIcon, cx } from "@circos/ui";
import { Trash02 } from "@untitledui/icons";
import { isAllowedAvatarUrl } from "@/lib/agent-validators";
import { APPROVALS_COPY } from "./copy";

type BulkSnapshot = {
  agent_id?: string;
  slug?: string;
  name?: string;
  avatar_url?: string | null;
};

interface DeleteAgentsBulkPayload {
  agent_ids?: string[];
  target_snapshots?: BulkSnapshot[];
}

async function fetchAgentsBatched(
  ids: string[],
  signal: AbortSignal,
): Promise<BulkSnapshot[]> {
  if (ids.length === 0) return [];
  try {
    const res = await fetch(
      `/api/agents?ids=${ids.map(encodeURIComponent).join(",")}`,
      { credentials: "same-origin", signal },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { agents?: BulkSnapshot[] };
    return Array.isArray(data?.agents) ? data.agents : [];
  } catch {
    return [];
  }
}

export function ApprovalPayloadDeleteAgentsBulk({
  payload,
}: {
  payload: DeleteAgentsBulkPayload;
}) {
  // Stabilise the array identity so the useEffect below doesn't
  // re-fire every render (react-hooks/exhaustive-deps).
  const ids = useMemo(
    () => (Array.isArray(payload.agent_ids) ? payload.agent_ids : []),
    [payload.agent_ids],
  );
  const initialSnapshots = Array.isArray(payload.target_snapshots)
    ? payload.target_snapshots
    : null;

  const [fallbackSnapshots, setFallbackSnapshots] = useState<BulkSnapshot[] | null>(
    null,
  );

  useEffect(() => {
    if (initialSnapshots || ids.length === 0) return;
    const controller = new AbortController();
    void fetchAgentsBatched(ids, controller.signal).then((snaps) => {
      setFallbackSnapshots(snaps);
    });
    return () => controller.abort();
  }, [initialSnapshots, ids]);

  // Build the displayed list by merging IDs with whichever snapshot
  // source we have (initial or fallback). IDs without a snapshot
  // render with just the agent_id and initials fallback.
  const snapshots = initialSnapshots ?? fallbackSnapshots ?? [];
  const snapshotByKey = new Map<string, BulkSnapshot>();
  for (const snap of snapshots) {
    const key = snap.agent_id ?? snap.slug ?? "";
    if (key) snapshotByKey.set(key, snap);
  }

  return (
    <div
      data-testid="approval-payload-delete_agents_bulk"
      className="flex flex-col gap-4"
    >
      {/* Header */}
      <section className="flex items-center gap-3">
        <FeaturedIcon icon={<Trash02 data-icon className="size-5" />} color="error" size="md" />
        <div>
          <h3 className="text-sm font-semibold text-primary">
            {APPROVALS_COPY.bulkDeleteTitle}
          </h3>
          <p className="text-xs text-tertiary">
            {APPROVALS_COPY.bulkDeleteCountLabel(ids.length)}
          </p>
        </div>
      </section>

      {/* Agent list */}
      <section
        className={cx(
          "flex max-h-80 flex-col gap-2 overflow-auto rounded-md border border-secondary p-2",
        )}
      >
        {ids.length === 0 ? (
          <p className="text-xs text-tertiary italic p-2">
            (no agent ids in payload)
          </p>
        ) : (
          ids.map((id) => {
            const snap = snapshotByKey.get(id);
            const name = snap?.name ?? id;
            const slug = snap?.slug ?? id;
            const safeAvatarUrl = isAllowedAvatarUrl(snap?.avatar_url)
              ? snap?.avatar_url ?? undefined
              : undefined;
            return (
              <div
                key={id}
                className="flex items-center gap-3 rounded-md p-2 hover:bg-secondary"
                data-testid={`approval-payload-delete_agents_bulk-row-${id}`}
              >
                <Avatar
                  size="sm"
                  src={safeAvatarUrl}
                  alt={name}
                  initials={name.slice(0, 2).toUpperCase()}
                />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm text-primary">{name}</span>
                  <span className="truncate text-xs text-tertiary">{slug}</span>
                </div>
                <Badge
                  color="error"
                  size="sm"
                  type="pill-color"
                  className="ml-auto"
                >
                  delete
                </Badge>
              </div>
            );
          })
        )}
      </section>

      {/* Warning banner */}
      <section
        className={cx(
          "rounded-md border border-error bg-error_subtle p-3",
          "text-xs text-error-primary",
        )}
      >
        {APPROVALS_COPY.bulkDeleteWarning}
      </section>
    </div>
  );
}
