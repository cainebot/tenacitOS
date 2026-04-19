"use client";

// Phase 68 Plan 08 Task 4 — Approvals table (client component, server-proxy).
//
// Plan 06 landed this component against the browser Supabase client
// with a Realtime subscription. GAP-68-01 (VERIFICATION.md) blocked
// that path: anon role cannot satisfy the `auth.role()='authenticated'`
// RLS gate on `approvals`. Plan 08 replaces the data path with the
// server-proxied `GET /api/approvals` endpoint (gated by `mc_auth`,
// service-role behind) and polls every 3s via `useApprovalsList`
// (pause-on-hidden). No `createBrowserClient` import. No Realtime
// subscription. When we later mint signed JWTs for Realtime we can
// layer that inside the hook without touching this file.
//
// Everything else (type/status filters, action buttons, detail modal)
// is unchanged from Plan 06.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Select,
  Table,
  TableCard,
  EmptyState,
  LoadingIndicator,
  AvatarLabelGroup,
  cx,
} from "@circos/ui";
import { ShieldTick, Eye, AlertTriangle, Clock } from "@untitledui/icons";
import { useApprovalsList } from "@/hooks/useApprovalsList";
import { useRealtimeToken } from "@/hooks/useRealtimeToken";
import { createBrowserClient } from "@/lib/supabase";
import {
  ACTIVE_APPROVAL_STATUSES,
  type ApprovalAction,
  type ApprovalRow,
  type ApprovalStatus,
  type ApprovalType,
} from "@/types/approval";
import { ApprovalDetailModal } from "./approval-detail-modal";

// The table supports filtering by any status (active + resolved), so
// we ask the server for every status and filter client-side. Keeps the
// server contract simple and the filter UX snappy.
const ALL_STATUSES: ApprovalStatus[] = [
  "pending",
  "revision_requested",
  "approved",
  "rejected",
  "expired",
  "cancelled",
];

const TYPE_BADGE: Record<ApprovalType, { color: Parameters<typeof Badge>[0]["color"]; label: string }> = {
  create_agent: { color: "brand", label: "Create" },
  delete_agent: { color: "error", label: "Delete" },
  delete_agents_bulk: { color: "error", label: "Bulk delete" },
  update_agent: { color: "warning", label: "Update" },
  send_external_message: { color: "indigo", label: "External msg" },
};

const STATUS_BADGE: Record<ApprovalStatus, { color: Parameters<typeof Badge>[0]["color"]; label: string }> = {
  pending: { color: "warning", label: "Pending" },
  revision_requested: { color: "orange", label: "Revision" },
  approved: { color: "success", label: "Approved" },
  rejected: { color: "error", label: "Rejected" },
  expired: { color: "gray", label: "Expired" },
  cancelled: { color: "gray", label: "Cancelled" },
};

const TYPE_FILTERS: Array<{ id: ApprovalType | "all"; label: string }> = [
  { id: "all", label: "All types" },
  { id: "create_agent", label: "Create agent" },
  { id: "delete_agent", label: "Delete agent" },
  { id: "delete_agents_bulk", label: "Bulk delete" },
  { id: "update_agent", label: "Update agent" },
  { id: "send_external_message", label: "External message" },
];

const STATUS_FILTERS: Array<{ id: "active" | ApprovalStatus; label: string }> = [
  { id: "active", label: "Active (pending + revision)" },
  { id: "pending", label: "Pending" },
  { id: "revision_requested", label: "Revision requested" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "expired", label: "Expired" },
  { id: "cancelled", label: "Cancelled" },
];

function relativeTime(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const sec = Math.round(delta / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

function expiryInfo(iso: string): { label: string; tone: "neutral" | "warning" | "error" } {
  const delta = new Date(iso).getTime() - Date.now();
  if (delta <= 0) return { label: "Expired", tone: "error" };
  const min = Math.floor(delta / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  let label: string;
  if (day > 0) label = `${day}d ${hr % 24}h`;
  else if (hr > 0) label = `${hr}h ${min % 60}m`;
  else label = `${min}m`;
  if (delta < 60 * 60 * 1000) return { label, tone: "error" };
  if (delta < 12 * 60 * 60 * 1000) return { label, tone: "warning" };
  return { label, tone: "neutral" };
}

function payloadPreview(row: ApprovalRow): string {
  const keys = Object.keys(row.payload ?? {});
  if (keys.length === 0) return "—";
  const head = keys.slice(0, 3).join(", ");
  return keys.length > 3 ? `${head}, +${keys.length - 3}` : head;
}

export function ApprovalsTable() {
  const { rows, loading, error: loadError, setRows, refresh, refetch } = useApprovalsList({
    statuses: ALL_STATUSES,
    limit: 200,
  });
  const { token, realtimeEnabled } = useRealtimeToken();
  const [typeFilter, setTypeFilter] = useState<ApprovalType | "all">("all");
  const [statusFilter, setStatusFilter] =
    useState<"active" | ApprovalStatus>("active");
  const [, setTick] = useState(0);
  const [selected, setSelected] = useState<ApprovalRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Refresh relative times every 30s so expiry countdowns update
  // between poll ticks.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // Phase 68.1 Item 2 — Realtime subscription with stable channel (Codex
  // MEDIUM Option B). The channel setup lives in a `[]` effect so it is
  // NOT recreated on token rotation; a second `[token]` effect calls
  // `setAuth()` imperatively. Polling (useApprovalsList) stays as
  // defence-in-depth: if Realtime silently fails, polling covers the
  // gap within 3s.
  useEffect(() => {
    const sb = createBrowserClient();
    const ch = sb
      .channel("approvals:queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "approvals" },
        (payload) => {
          // Codex MEDIUM — latency instrumentation. Compare the DB
          // timestamp on the payload against the browser clock; the
          // console log lets an operator compare Realtime (<500ms) vs
          // polling (~1500ms) without rebuilding the app.
          const createdAt =
            (payload as { new?: { created_at?: string; updated_at?: string } })
              ?.new?.created_at ??
            (payload as { new?: { created_at?: string; updated_at?: string } })
              ?.new?.updated_at;
          if (createdAt) {
            const latency = Date.now() - new Date(createdAt).getTime();
            // eslint-disable-next-line no-console
            console.log("[realtime-latency-ms]", latency);
          }
          // Codex HIGH — explicit refetch contract (Option A). The hook
          // exposes `refetch()`; we let it re-fetch the authoritative
          // server-proxied list instead of reconstructing state from the
          // payload (RLS + server filters stay the single source of truth).
          void refetch();
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "CLOSED") {
          // Polling (3s, pause-on-hidden) keeps covering.
          // eslint-disable-next-line no-console
          console.warn("[ApprovalsTable] Realtime fallback to polling", status);
        }
      });
    return () => {
      sb.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase 68.1 Item 2 — imperative setAuth only. Renewing the JWT every
  // 4min must NOT tear down the subscription above. Two effects =
  // stable channel pattern.
  useEffect(() => {
    if (!realtimeEnabled) return;
    if (!token) return;
    const sb = createBrowserClient();
    sb.realtime.setAuth(token);
  }, [token, realtimeEnabled]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (statusFilter === "active") {
        return ACTIVE_APPROVAL_STATUSES.includes(r.status);
      }
      return r.status === statusFilter;
    });
  }, [rows, typeFilter, statusFilter]);

  const openDetail = useCallback((row: ApprovalRow) => {
    setSelected(row);
    setModalOpen(true);
    setSubmitError(null);
  }, []);

  const handleAction = useCallback(
    async (row: ApprovalRow, action: ApprovalAction, decisionNote: string) => {
      setSubmittingId(row.id);
      setSubmitError(null);
      try {
        const res = await fetch(`/api/approvals/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            decision_note: decisionNote || undefined,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        if (!res.ok) {
          throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
        }
        // Optimistic update: reflect the new status immediately while
        // the next poll tick fetches the authoritative row (and the
        // downstream dispatcher side effect, if any).
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  status:
                    action === "approve"
                      ? "approved"
                      : action === "reject"
                        ? "rejected"
                        : "revision_requested",
                  decision_note: decisionNote || r.decision_note,
                }
              : r,
          ),
        );
        setModalOpen(false);
        // Force an immediate refresh so the user sees the trigger-side
        // effect (e.g. dispatcher outcome) without waiting up to 3s.
        refresh();
      } catch (e) {
        setSubmitError((e as Error).message);
      } finally {
        setSubmittingId(null);
      }
    },
    [refresh, setRows],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingIndicator size="lg" />
      </div>
    );
  }

  if (loadError) {
    return (
      <EmptyState
        icon={<AlertTriangle />}
        title="No se pudieron cargar las aprobaciones"
        description={loadError}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <Select
            size="sm"
            label="Type"
            selectedKey={typeFilter}
            onSelectionChange={(k) => setTypeFilter(k as ApprovalType | "all")}
            items={TYPE_FILTERS}
          >
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
        </div>
        <div className="w-64">
          <Select
            size="sm"
            label="Status"
            selectedKey={statusFilter}
            onSelectionChange={(k) =>
              setStatusFilter(k as "active" | ApprovalStatus)
            }
            items={STATUS_FILTERS}
          >
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
        </div>
        <div className="ml-auto text-xs text-tertiary">
          {filtered.length} shown · {rows.length} total
        </div>
      </div>

      {submitError && (
        <div className="rounded-md border border-error_subtle bg-tertiary p-3 text-sm text-error-primary">
          {submitError}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ShieldTick />}
          title="Sin aprobaciones"
          description="No hay acciones en la cola con los filtros actuales."
        />
      ) : (
        <TableCard.Root size="md" className="w-full">
          <Table aria-label="Approvals queue" className="w-full">
            <Table.Header>
              <Table.Head id="type">
                <span className="text-xs font-medium text-quaternary">Type</span>
              </Table.Head>
              <Table.Head id="status">
                <span className="text-xs font-medium text-quaternary">Status</span>
              </Table.Head>
              <Table.Head id="requester">
                <span className="text-xs font-medium text-quaternary">
                  Requester
                </span>
              </Table.Head>
              <Table.Head id="created">
                <span className="text-xs font-medium text-quaternary">Created</span>
              </Table.Head>
              <Table.Head id="expires">
                <span className="text-xs font-medium text-quaternary">Expires</span>
              </Table.Head>
              <Table.Head id="payload">
                <span className="text-xs font-medium text-quaternary">Payload</span>
              </Table.Head>
              <Table.Head id="actions">
                <span className="sr-only">Actions</span>
              </Table.Head>
            </Table.Header>
            <Table.Body>
              {filtered.map((row) => {
                const t = TYPE_BADGE[row.type];
                const s = STATUS_BADGE[row.status];
                const exp = expiryInfo(row.expires_at);
                const isActive = ACTIVE_APPROVAL_STATUSES.includes(row.status);
                const busy = submittingId === row.id;
                return (
                  <Table.Row key={row.id}>
                    <Table.Cell>
                      <Badge color={t.color} type="pill-color" size="sm">
                        {t.label}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={s.color} type="pill-color" size="sm">
                        {s.label}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      {row.requested_by_agent_id ? (
                        <AvatarLabelGroup
                          size="sm"
                          initials={row.requested_by_agent_id
                            .slice(0, 2)
                            .toUpperCase()}
                          title={row.requested_by_agent_id}
                          subtitle="Agent"
                        />
                      ) : (
                        <span className="text-sm text-tertiary">Human</span>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm text-tertiary">
                        {relativeTime(row.created_at)}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span
                        className={cx(
                          "inline-flex items-center gap-1 text-sm",
                          exp.tone === "error" && "text-error-primary",
                          exp.tone === "warning" && "text-warning-primary",
                          exp.tone === "neutral" && "text-tertiary",
                        )}
                      >
                        <Clock className="size-3" />
                        {exp.label}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="font-mono text-xs text-tertiary">
                        {payloadPreview(row)}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          color="tertiary"
                          iconLeading={Eye}
                          onClick={() => openDetail(row)}
                          aria-label="View details"
                        >
                          Details
                        </Button>
                        {isActive && (
                          <>
                            <Button
                              size="sm"
                              color="secondary"
                              onClick={() =>
                                handleAction(row, "request_revision", "")
                              }
                              isDisabled={busy}
                            >
                              Revision
                            </Button>
                            <Button
                              size="sm"
                              color="primary-destructive"
                              onClick={() => handleAction(row, "reject", "")}
                              isDisabled={busy}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              color="primary"
                              onClick={() => openDetail(row)}
                              isDisabled={busy}
                            >
                              Approve
                            </Button>
                          </>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        </TableCard.Root>
      )}

      <ApprovalDetailModal
        approval={selected}
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleAction}
        submitting={submittingId !== null}
      />
    </div>
  );
}
