"use client";

// Phase 69 Plan 02 — /agents/[id]/edit (SPEC-69-CRUD-03).
//
// Loads BOTH the agent row + the pending-approval flag on mount
// (closes REVIEW finding 2). When `pending_approval !== null` on first
// paint, the form renders read-only with an inline banner linking to
// `/approvals/${approval_id}`. This is server-driven state — the lock
// survives navigation and reload.
//
// GET /api/agents/[id] (Plan 69-03) returns:
//   { agent: AgentRow, pending_approval: { approval_id, type, created_at } | null }
//
// Until Plan 03 lands, a 404 falls through to `<ErrorPanel>` with retry;
// operator can still navigate back to /agents.

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, cx } from "@circos/ui";
import { AlertTriangle, ChevronRight, HomeLine, RefreshCw01 } from "@untitledui/icons";
import type { AgentRow } from "@/types/supabase";
import { AgentForm, type AgentFormValues } from "@/components/application/agent-form";
import { AGENT_DETAIL_COPY } from "@/app/(dashboard)/agents/[id]/copy";
import { getAgentSlug } from "@/lib/agent-display";

interface PendingApproval {
  approval_id: string;
  type: string;
  created_at: string;
}

interface AgentDetailResponse {
  agent: AgentRow;
  pending_approval: PendingApproval | null;
}

export default function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [data, setData] = useState<AgentDetailResponse | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadAgent = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(id)}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`Could not load agent: HTTP ${res.status}`);
      }
      const body = (await res.json()) as AgentDetailResponse;
      setData(body);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadAgent();
  }, [loadAgent]);

  const handleSubmit = async (values: AgentFormValues) => {
    if (!data) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const changes = diff(data.agent, values);
      if (Object.keys(changes).length === 0) {
        setSubmitError("No changes to submit.");
        return;
      }
      const res = await fetch(`/api/agents/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!res.ok) {
        const text = await safeReadError(res);
        throw new Error(text || `Request failed: HTTP ${res.status}`);
      }
      // Refresh so the next paint re-reads pending_approval from the server.
      await loadAgent();
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="flex w-full flex-col gap-6 px-12 py-6">
        <p className="text-sm text-tertiary">Loading agent…</p>
      </section>
    );
  }

  if (fetchError || !data) {
    return (
      <section className="flex w-full flex-col gap-6 px-12 py-6">
        <div
          role="alert"
          className="flex items-start gap-4 rounded-lg border border-error bg-error-primary/10 px-4 py-3"
        >
          <AlertTriangle className="mt-1 size-5 text-error-primary" aria-hidden />
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-sm font-semibold text-error-primary">Could not load agent</p>
            <p className="text-xs text-tertiary">{fetchError ?? "No data returned"}</p>
          </div>
          <Button color="secondary" size="sm" iconLeading={RefreshCw01} onClick={loadAgent}>
            Retry
          </Button>
        </div>
      </section>
    );
  }

  const { agent, pending_approval } = data;
  const isPending = pending_approval != null;
  const slug = getAgentSlug(agent);

  return (
    <section className="flex w-full flex-col">
      <header className="flex flex-col gap-5 border-b border-secondary px-12 pb-6 pt-2">
        <Breadcrumb agentName={agent.name} slug={slug} />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-primary [font-family:var(--font-display)]">
            {AGENT_DETAIL_COPY.editTitle}: {agent.name}
          </h1>
          <p className="text-sm text-tertiary">{AGENT_DETAIL_COPY.editSubtitle}</p>
        </div>
      </header>

      <div className="flex w-full flex-col gap-6 px-12 py-6">
        {isPending && pending_approval && (
          <div
            role="status"
            className={cx(
              "flex items-start gap-3 rounded-lg border px-4 py-3",
              "border-warning bg-warning-primary/10 text-warning-primary",
            )}
          >
            <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div className="flex flex-1 flex-col gap-1">
              <p className="text-sm font-semibold">Changes pending approval</p>
              <p className="text-xs text-secondary">
                {AGENT_DETAIL_COPY.pendingApprovalBanner}{" "}
                <Link
                  href={`/approvals/${pending_approval.approval_id}`}
                  className="font-semibold text-brand-secondary underline"
                >
                  View request
                </Link>
              </p>
            </div>
          </div>
        )}

        <AgentForm
          mode="edit"
          initial={agent}
          readOnly={isPending}
          submitting={submitting}
          errorMessage={submitError}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/agents/${slug}`)}
        />
      </div>
    </section>
  );
}

function diff(agent: AgentRow, values: AgentFormValues): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  if (values.name !== (agent.name ?? "")) changes.name = values.name;
  if (values.slug !== (agent.slug ?? "")) changes.slug = values.slug;
  if (values.soul_content !== (agent.soul_content ?? "")) {
    changes.soul_content = values.soul_content;
  }
  const currentAvatar = agent.avatar_url ?? "";
  if (values.avatar_url !== currentAvatar) {
    changes.avatar_url = values.avatar_url.length > 0 ? values.avatar_url : null;
  }
  return changes;
}

async function safeReadError(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return body.error ?? body.message ?? null;
  } catch {
    return null;
  }
}

const Breadcrumb = ({ agentName, slug }: { agentName: string; slug: string }) => (
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
    <Link
      href="/agents"
      className="rounded-md px-2 py-1 text-xs font-semibold text-tertiary transition-colors hover:bg-primary_hover"
    >
      Agents
    </Link>
    <ChevronRight className="size-4 text-quaternary" />
    <Link
      href={`/agents/${slug}`}
      className="rounded-md px-2 py-1 text-xs font-semibold text-tertiary transition-colors hover:bg-primary_hover"
    >
      {agentName}
    </Link>
    <ChevronRight className="size-4 text-quaternary" />
    <span
      aria-current="page"
      className="rounded-md bg-active px-2 py-1 text-xs font-semibold text-secondary"
    >
      Edit
    </span>
  </nav>
);
