"use client";

// Phase 69 — /agents (SPEC-69-CRUD-01 / Plan 69-02).
//
// BLOCKING-3 remediation (2026-04-20): authoritative list source is
// `GET /api/agents?include_archived=…` (Plan 69-03). `useRealtimeAgents()`
// is consumed ONLY as an invalidation signal — whenever its emission
// changes (delta in agent rows), we trigger a silent debounced refetch.
// Row state comes from the API response, never from the hook's cached
// `agents` array. REVIEW finding 1 closed.
//
// The Figma-approved visual layout (breadcrumb, header, filter bar, table,
// pagination) is FINAL — only the data source changed. See
// FIGMA-IMPLEMENTATION.md §3 for the visual contract.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, cx } from "@circos/ui";
import { ChevronRight, Download01, HomeLine, Plus } from "@untitledui/icons";
import { AgentsTable } from "@/components/application/agents-table";
import type { AgentRow } from "@/types/supabase";
import { useRealtimeAgents } from "@/hooks/useRealtimeAgents";
import { getAgentSlug } from "@/lib/agent-display";

const REFETCH_DEBOUNCE_MS = 250;

export default function AgentsPage() {
  const router = useRouter();
  const [view, setView] = useState<"list" | "grid">("list");
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // BLOCKING-3: hook is consumed ONLY for its change-signal, not for data.
  // We read `agents.length` + the last `updated_at` as a lightweight
  // fingerprint; any delta triggers a debounced refetch of the API.
  const { agents: realtimeAgents } = useRealtimeAgents();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAgents = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const url = `/api/agents?include_archived=${includeArchived ? 1 : 0}`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { agents?: AgentRow[] } | AgentRow[];
        const rows = Array.isArray(body) ? body : (body.agents ?? []);
        setAgents(rows);
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [includeArchived],
  );

  // Initial load + refetch on include_archived toggle.
  useEffect(() => {
    const controller = new AbortController();
    void fetchAgents(controller.signal);
    return () => controller.abort();
  }, [fetchAgents]);

  // BLOCKING-3 invalidation: whenever the Realtime fingerprint changes,
  // trigger a debounced refetch of the API (source of truth).
  const fingerprint = computeFingerprint(realtimeAgents);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchAgents();
    }, REFETCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fingerprint, fetchAgents]);

  return (
    <section className="flex w-full flex-col">
      <header className="flex flex-col gap-5 border-b border-secondary px-12 pb-6 pt-2">
        <Breadcrumb />
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-primary [font-family:var(--font-display)]">
              Agents
            </h1>
            <p className="text-sm text-tertiary">
              Manage all agents of your organization.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button color="secondary" size="md" iconLeading={Download01}>
              Export
            </Button>
            <Button
              color="primary"
              size="md"
              iconLeading={Plus}
              onClick={() => router.push("/agents/new")}
            >
              New agent
            </Button>
          </div>
        </div>
      </header>

      <div className="flex w-full flex-col gap-6 px-12 py-6">
        <AgentsTable
          agents={agents}
          loading={loading}
          error={error}
          view={view}
          includeArchived={includeArchived}
          onChangeView={setView}
          onToggleArchived={setIncludeArchived}
          onRefresh={() => fetchAgents()}
          onCreate={() => router.push("/agents/new")}
          onRowClick={(a) => router.push(`/agents/${getAgentSlug(a)}`)}
        />
      </div>
    </section>
  );
}

/**
 * Lightweight fingerprint of the realtime agents set. Changes whenever:
 * - a row is added/removed (length change)
 * - an existing row is updated (sum of parsed `updated_at` epochs)
 */
function computeFingerprint(rows: AgentRow[]): string {
  if (!rows || rows.length === 0) return "0:0";
  let sum = 0;
  for (const r of rows) {
    const t = Date.parse(r.updated_at ?? "");
    if (!Number.isNaN(t)) sum += t;
  }
  return `${rows.length}:${sum}`;
}

const Breadcrumb = () => (
  <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-tertiary">
    <Link
      href="/"
      className={cx(
        "flex size-7 items-center justify-center rounded-md",
        "text-quaternary transition-colors hover:bg-primary_hover hover:text-tertiary",
      )}
      aria-label="Home"
    >
      <HomeLine className="size-4" />
    </Link>
    <ChevronRight className="size-4 text-quaternary" />
    <span
      aria-current="page"
      className="rounded-md bg-active px-2 py-1 text-xs font-semibold text-secondary"
    >
      Agents
    </span>
  </nav>
);
