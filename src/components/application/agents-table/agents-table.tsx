"use client";

// Phase 69 — AgentsTable (SPEC-69-CRUD-01 / Plan 69-02).
// /agents list view: avatar + name/slug + status + adapter + node binding +
// last-run + per-row actions. Source: Figma node 17036:100107 (corrected).
//
// BLOCKING-2 convergence (2026-04-20): consumes the real `AgentRow` shape
// from `@/types/supabase` (not a separate view-model). Display-only
// derivatives (initials, status color, status label) come from
// `@/lib/agent-display` and `@/lib/relative-time`.
//
// BLOCKING-1: no fixture import in app code — fixtures live under
// `src/__fixtures__/` and are only imported by `*.test.tsx` / `*.stories.tsx`.

import type { FC } from "react";
import { Avatar, Badge, BadgeWithDot, Button, Checkbox, FeaturedIcon, cx } from "@circos/ui";
import {
  ArrowLeft,
  ArrowRight,
  DotsHorizontal,
  Grid01,
  List,
  Plus,
  RefreshCw01,
  SearchMd,
  Users01,
} from "@untitledui/icons";
import type { AgentRow } from "@/types/supabase";
import {
  getAdapterLabel,
  getAgentInitials,
  getAgentSlug,
  getStatusColor,
  getStatusLabel,
  isArchived,
} from "@/lib/agent-display";
import { relativeTime } from "@/lib/relative-time";
import { AgentCard } from "./agent-card";

export interface AgentsTableProps {
  agents: AgentRow[];
  loading?: boolean;
  error?: string | null;
  view?: "list" | "grid";
  includeArchived?: boolean;
  onChangeView?: (next: "list" | "grid") => void;
  onToggleArchived?: (next: boolean) => void;
  onRefresh?: () => void;
  onCreate?: () => void;
  onRowClick?: (agent: AgentRow) => void;
  className?: string;
}

export const AgentsTable: FC<AgentsTableProps> = ({
  agents,
  loading = false,
  error = null,
  view = "list",
  includeArchived = false,
  onChangeView,
  onToggleArchived,
  onRefresh,
  onCreate,
  onRowClick,
  className,
}) => {
  const visible = includeArchived ? agents : agents.filter((a) => !isArchived(a));
  const total = visible.length;

  const showEmpty = !loading && !error && visible.length === 0;
  const showError = !loading && error;
  const showRows = !loading && !error && visible.length > 0;

  return (
    <article
      className={cx(
        "flex flex-col overflow-hidden rounded-xl border border-secondary bg-secondary",
        className,
      )}
    >
      <FilterBar
        countLabel={loading || error ? "—" : `${total} of ${total}`}
        view={view}
        includeArchived={includeArchived}
        onChangeView={onChangeView}
        onToggleArchived={onToggleArchived}
        onRefresh={onRefresh}
      />

      {showError && <ErrorBanner message={error!} onRetry={onRefresh} />}

      {view === "list" ? (
        <table className="w-full border-collapse" aria-busy={loading}>
          <thead>
            <tr className="border-b border-secondary bg-primary">
              <Th className="w-10 pl-5">
                <Checkbox isDisabled={loading} aria-label="Select all" />
              </Th>
              <Th>Agent</Th>
              <Th className="w-40">Status</Th>
              <Th className="w-28">Adapter</Th>
              <Th className="w-32">Node</Th>
              <Th className="w-28">Last run</Th>
              <Th className="w-12 pr-5" />
            </tr>
          </thead>
          <tbody>
            {loading && <SkeletonRows />}
            {showRows &&
              visible.map((a) => (
                <AgentTableRow key={a.agent_id} agent={a} onClick={onRowClick} />
              ))}
          </tbody>
        </table>
      ) : (
        showRows && (
          <div className="grid grid-cols-3 gap-2 bg-primary p-4">
            {visible.map((a) => (
              <AgentCard key={a.agent_id} agent={a} onClick={onRowClick} />
            ))}
          </div>
        )
      )}

      {showEmpty && <EmptyState onCreate={onCreate} />}

      {showRows && <Pagination />}
    </article>
  );
};

// ---------------------------------------------------------------------------
// Internal pieces
// ---------------------------------------------------------------------------

const Th: FC<{ children?: React.ReactNode; className?: string }> = ({ children, className }) => (
  <th
    className={cx(
      "px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-tertiary",
      className,
    )}
  >
    {children}
  </th>
);

const Td: FC<{ children?: React.ReactNode; className?: string }> = ({ children, className }) => (
  <td className={cx("px-4 py-5 align-middle", className)}>{children}</td>
);

const FilterBar: FC<{
  countLabel: string;
  view: "list" | "grid";
  includeArchived: boolean;
  onChangeView?: (next: "list" | "grid") => void;
  onToggleArchived?: (next: boolean) => void;
  onRefresh?: () => void;
}> = ({ countLabel, view, includeArchived, onChangeView, onToggleArchived, onRefresh }) => (
  <div className="flex items-center gap-4 border-b border-secondary px-6 py-4">
    <div className="relative w-[280px]">
      <SearchMd
        className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-quaternary"
        aria-hidden
      />
      <input
        type="search"
        placeholder="Search agents..."
        className={cx(
          "h-10 w-full rounded-lg border border-primary bg-primary pl-10 pr-3 text-sm text-primary",
          "placeholder:text-placeholder",
          "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20",
        )}
        aria-label="Search agents"
      />
    </div>
    <div className="ml-auto flex items-center gap-3">
      <Badge type="modern" color="gray" size="md">
        {countLabel}
      </Badge>
      <Checkbox
        isSelected={includeArchived}
        onChange={onToggleArchived}
        label="Include archived"
      />
      <ViewToggle view={view} onChange={onChangeView} />
      <Button
        color="secondary"
        size="md"
        iconLeading={RefreshCw01}
        onClick={onRefresh}
        aria-label="Refresh"
      >
        Refresh
      </Button>
    </div>
  </div>
);

const ViewToggle: FC<{
  view: "list" | "grid";
  onChange?: (next: "list" | "grid") => void;
}> = ({ view, onChange }) => (
  <div
    className="flex items-center overflow-hidden rounded-lg border border-primary bg-primary"
    role="group"
    aria-label="Toggle view"
  >
    <button
      type="button"
      onClick={() => onChange?.("list")}
      aria-pressed={view === "list"}
      aria-label="List view"
      className={cx(
        "flex h-10 items-center justify-center px-3 text-sm transition-colors",
        view === "list"
          ? "bg-active text-primary"
          : "text-quaternary hover:bg-primary_hover hover:text-tertiary",
      )}
    >
      <List className="size-5" />
    </button>
    <span className="h-6 w-px bg-secondary" aria-hidden />
    <button
      type="button"
      onClick={() => onChange?.("grid")}
      aria-pressed={view === "grid"}
      aria-label="Grid view"
      className={cx(
        "flex h-10 items-center justify-center px-3 text-sm transition-colors",
        view === "grid"
          ? "bg-active text-primary"
          : "text-quaternary hover:bg-primary_hover hover:text-tertiary",
      )}
    >
      <Grid01 className="size-5" />
    </button>
  </div>
);

const AgentTableRow: FC<{ agent: AgentRow; onClick?: (a: AgentRow) => void }> = ({
  agent,
  onClick,
}) => {
  const statusColor = getStatusColor(agent.status);
  const statusLabel = getStatusLabel(agent.status);
  const initials = getAgentInitials(agent);
  const slug = getAgentSlug(agent);
  const adapter = getAdapterLabel(agent);

  return (
    <tr
      className={cx(
        "border-b border-secondary last:border-b-0",
        "transition-colors hover:bg-primary_hover",
        onClick && "cursor-pointer",
      )}
      onClick={onClick ? () => onClick(agent) : undefined}
    >
      <Td className="pl-6">
        <Checkbox aria-label={`Select ${agent.name}`} />
      </Td>
      <Td>
        <div className="flex items-center gap-3">
          <Avatar size="md" initials={initials} />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-primary">{agent.name}</span>
            <span className="text-xs text-tertiary [font-family:var(--font-code)]">
              /agents/{slug}
            </span>
          </div>
        </div>
      </Td>
      <Td>
        <BadgeWithDot type="color" color={statusColor} size="md">
          {statusLabel}
        </BadgeWithDot>
      </Td>
      <Td>
        <Badge type="modern" size="md">
          {adapter}
        </Badge>
      </Td>
      <Td>
        {agent.bound_node_id ? (
          <span className="text-sm text-secondary [font-family:var(--font-code)]">
            {agent.bound_node_id}
          </span>
        ) : (
          <span className="text-sm text-quaternary">—</span>
        )}
      </Td>
      <Td>
        <span className="text-sm text-tertiary">{relativeTime(agent.last_activity)}</span>
      </Td>
      <Td className="pr-6">
        <Button
          color="tertiary"
          size="md"
          iconLeading={DotsHorizontal}
          aria-label={`More actions for ${agent.name}`}
        >
          {""}
        </Button>
      </Td>
    </tr>
  );
};

const SkeletonRows: FC = () => (
  <>
    {[0, 1, 2, 3, 4].map((i) => (
      <tr key={i} className="border-b border-secondary last:border-b-0">
        <Td className="pl-5">
          <div className="size-4 rounded bg-tertiary" />
        </Td>
        <Td>
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-tertiary" />
            <div className="flex flex-col gap-1.5">
              <div className="h-3 w-24 rounded bg-tertiary" />
              <div className="h-2.5 w-32 rounded bg-tertiary opacity-60" />
            </div>
          </div>
        </Td>
        <Td>
          <div className="h-5 w-16 rounded-full bg-tertiary" />
        </Td>
        <Td>
          <div className="h-5 w-12 rounded-full bg-tertiary" />
        </Td>
        <Td>
          <div className="h-3 w-16 rounded bg-tertiary" />
        </Td>
        <Td>
          <div className="h-3 w-12 rounded bg-tertiary opacity-60" />
        </Td>
        <Td className="pr-5" />
      </tr>
    ))}
  </>
);

const EmptyState: FC<{ onCreate?: () => void }> = ({ onCreate }) => (
  <div className="flex flex-col items-center justify-center gap-4 px-6 py-16">
    <FeaturedIcon icon={<Users01 className="size-6" />} size="lg" color="gray" variant="outline" />
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="text-sm font-medium text-primary">No agents yet</p>
      <p className="text-xs text-tertiary">
        Spin up your first OpenClaw agent to start getting work done across the mesh.
      </p>
    </div>
    {onCreate && (
      <Button color="primary" size="md" iconLeading={Plus} onClick={onCreate}>
        Create first agent
      </Button>
    )}
  </div>
);

const ErrorBanner: FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="flex items-start justify-between gap-4 border-b border-secondary bg-error-primary/5 px-5 py-3">
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-error-primary">Could not load agents</p>
      <code className="[font-family:var(--font-code)] text-xs text-tertiary">{message}</code>
    </div>
    {onRetry && (
      <Button color="secondary" size="md" onClick={onRetry}>
        Retry
      </Button>
    )}
  </div>
);

const Pagination: FC = () => (
  <div className="flex items-center justify-between border-t border-secondary px-6 py-4">
    <span className="text-sm text-tertiary">Page 1 of 1</span>
    <div className="flex items-center gap-2">
      <Button color="secondary" size="md" iconLeading={ArrowLeft} isDisabled>
        Prev
      </Button>
      <Button color="secondary" size="md" iconTrailing={ArrowRight} isDisabled>
        Next
      </Button>
    </div>
  </div>
);
