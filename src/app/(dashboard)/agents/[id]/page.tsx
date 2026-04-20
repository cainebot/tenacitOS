"use client";

// Phase 69 — /agents/[id] (SPEC-69-CRUD-01..04 / Plan 69-02).
// Source: Figma node 17036:109606 (A · Overview).
// Layout: breadcrumb + back-link + agent header + 6 tabs.
//
// BLOCKING-2: consumes the real `AgentRow` from `GET /api/agents/[id]`.
// BLOCKING-1: no import from the fixtures module in app code.
// Wires the DeleteAgentModal via tab-danger's `onDelete` callback.

import { useCallback, useEffect, useState, use } from "react";
import type { FC } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Tab, TabList, TabPanel, Tabs, cx } from "@circos/ui";
import { ArrowLeft, ChevronRight, HomeLine, RefreshCw01 } from "@untitledui/icons";
import {
  AgentHeader,
  TabDanger,
  TabInstructions,
  TabOverview,
  TabRuns,
  TabSkills,
  TabSoul,
} from "@/components/application/agent-detail";
import { DeleteAgentModal } from "@/components/application/agent-form";
import { AssignTaskModal } from "@/components/application/agent-detail/assign-task-modal";
import { PauseAgentModal } from "@/components/application/agent-detail/pause-agent-modal";
import type { AgentRow } from "@/types/supabase";
import { getAgentSlug } from "@/lib/agent-display";
import { useAgentActions } from "@/hooks/useAgentActions";

type TabKey = "overview" | "identity" | "instructions" | "runs" | "skills" | "more";

const TAB_LABELS: Array<{ id: TabKey; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "identity", label: "Identity" },
  { id: "instructions", label: "Instructions" },
  { id: "runs", label: "Runs" },
  { id: "skills", label: "Skills" },
  { id: "more", label: "More" },
];

interface AgentDetailResponse {
  agent: AgentRow;
  pending_approval?: { approval_id: string; type: string; created_at: string } | null;
}

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Delete modal state
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Phase 69-11 — operator actions (pause / resume / invoke / assign-task).
  const actions = useAgentActions(id);
  const [pauseOpen, setPauseOpen] = useState<boolean>(false);
  const [assignTaskOpen, setAssignTaskOpen] = useState<boolean>(false);

  const loadAgent = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(id)}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as AgentDetailResponse | AgentRow;
      const row = "agent" in body ? body.agent : body;
      setAgent(row);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadAgent();
  }, [loadAgent]);

  const handleConfirmDelete = async (target: AgentRow) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(target.agent_id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const text = await safeReadError(res);
        throw new Error(text || `Request failed: HTTP ${res.status}`);
      }
      setDeleteOpen(false);
      router.push("/agents");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete request failed");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <section className="flex w-full flex-col gap-6 px-12 py-6">
        <p className="text-sm text-tertiary">Loading agent…</p>
      </section>
    );
  }

  if (fetchError || !agent) {
    return (
      <section className="flex w-full flex-col gap-6 px-12 py-6">
        <div
          role="alert"
          className="flex items-start gap-4 rounded-lg border border-error bg-error-primary/10 px-4 py-3"
        >
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

  const slug = getAgentSlug(agent);

  return (
    <section className="flex w-full flex-col">
      <header className="flex flex-col gap-5 border-b border-secondary px-12 pb-6 pt-2">
        <Breadcrumb agentName={agent.name} />
      </header>

      <div className="flex w-full flex-col gap-6 px-12 py-6">
        <Button
          href="/agents"
          color="link-color"
          size="md"
          iconLeading={ArrowLeft}
          className="w-fit"
        >
          Agents
        </Button>

        <AgentHeader
          agent={agent}
          actionPending={actions.pending !== null}
          onAssignTask={() => setAssignTaskOpen(true)}
          onRunHeartbeat={async () => {
            try {
              const out = await actions.invoke();
              if (out.run_id) {
                router.push(`/agents/${slug}/runs/${out.run_id}`);
              }
            } catch {
              // error surfaced via actions.error; parent intentionally
              // does not toast here — follow-up will add sonner.
            }
          }}
          onPause={() => setPauseOpen(true)}
          onResume={async () => {
            try {
              await actions.resume();
              void loadAgent();
            } catch {
              // handled
            }
          }}
          onEdit={() => router.push(`/agents/${slug}/edit`)}
        />
        {actions.error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-error bg-error-primary/10 px-4 py-2 text-sm text-error-primary"
          >
            {actions.error}
          </div>
        )}

        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as TabKey)}
        >
          <TabList type="underline" size="md" aria-label="Agent detail sections">
            {TAB_LABELS.map((t) => (
              <Tab key={t.id} id={t.id}>
                {t.label}
              </Tab>
            ))}
          </TabList>

          <TabPanel id="overview" className="pt-6">
            <TabOverview agent={agent} />
          </TabPanel>
          <TabPanel id="identity" className="pt-6">
            <TabSoul agent={agent} onEdit={() => router.push(`/agents/${slug}/edit`)} />
          </TabPanel>
          <TabPanel id="instructions" className="pt-6">
            <TabInstructions agent={agent} onEdit={() => router.push(`/agents/${slug}/edit`)} />
          </TabPanel>
          <TabPanel id="runs" className="pt-6">
            <TabRuns agent={agent} />
          </TabPanel>
          <TabPanel id="skills" className="pt-6">
            <TabSkills agent={agent} />
          </TabPanel>
          <TabPanel id="more" className="pt-6">
            <TabDanger
              agent={agent}
              onEdit={() => router.push(`/agents/${slug}/edit`)}
              onDelete={() => setDeleteOpen(true)}
            />
          </TabPanel>
        </Tabs>
      </div>

      <DeleteAgentModal
        agent={agent}
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleConfirmDelete}
        submitting={deleting}
        errorMessage={deleteError}
      />

      <PauseAgentModal
        agent={agent}
        isOpen={pauseOpen}
        onOpenChange={setPauseOpen}
        onConfirm={async (reason) => {
          try {
            await actions.pause(reason);
            setPauseOpen(false);
            void loadAgent();
          } catch {
            // error surfaced via actions.error
          }
        }}
        submitting={actions.pending === "pause"}
      />

      <AssignTaskModal
        agent={agent}
        isOpen={assignTaskOpen}
        onOpenChange={setAssignTaskOpen}
        onConfirm={async (input) => {
          try {
            await actions.assignTask(input);
            setAssignTaskOpen(false);
          } catch {
            // error surfaced via actions.error
          }
        }}
        submitting={actions.pending === "assign-task"}
      />
    </section>
  );
}

async function safeReadError(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return body.error ?? body.message ?? null;
  } catch {
    return null;
  }
}

const Breadcrumb: FC<{ agentName: string }> = ({ agentName }) => (
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
    <span
      aria-current="page"
      className="rounded-md bg-active px-2 py-1 text-xs font-semibold text-secondary"
    >
      {agentName}
    </span>
  </nav>
);
