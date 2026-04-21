"use client";

// Phase 68 Plan 08 Task 4 — approvals list fetcher (server-proxy + polling).
//
// Used by /approvals ApprovalsTable. Replaces the prior direct
// `createBrowserClient().from('approvals').select('*')` + Realtime
// channel, which was blocked by GAP-68-01 (RLS vs anon). See the
// module README and `useApprovalsCount` for the full rationale.
//
// Behaviour:
//   - Initial GET /api/approvals on mount.
//   - setInterval refetch every 3s while tab is visible.
//   - Refetch immediately when the tab becomes visible.
//   - Caller can request a refetch via the returned `refresh()` fn
//     (used after mutations for snappier UX than waiting for the
//     next poll tick).
//
// Filters (types, statuses) are reflected in the query string so the
// server does the filtering; changing them triggers an immediate
// refetch through the useEffect dependency.

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApprovalRow, ApprovalStatus, ApprovalType } from "@/types/approval";

const POLL_MS = 3_000;

export interface UseApprovalsListOptions {
  /** Override the list of statuses. Defaults to active (pending + revision_requested). */
  statuses?: ApprovalStatus[];
  /** Optional type filter. */
  types?: ApprovalType[];
  /** Upper bound on rows returned. Capped server-side at 200. */
  limit?: number;
}

export interface UseApprovalsListResult {
  rows: ApprovalRow[];
  loading: boolean;
  error: string | null;
  /** Synchronous setter for optimistic updates. Realtime would overwrite;
   *  with polling we replace on the next tick or via `refresh()`. */
  setRows: React.Dispatch<React.SetStateAction<ApprovalRow[]>>;
  /** Force an immediate refetch (used after a PATCH mutation). */
  refresh: () => void;
  /** Alias of `refresh` — Phase 68.1 Item 2 explicit refetch contract
   *  (Codex HIGH Option A). Returns a Promise so callers can await it
   *  when they need to chain UI work after the fetch completes. */
  refetch: () => Promise<void>;
}

interface ListResponse {
  ok: boolean;
  rows?: ApprovalRow[];
  total?: number;
  error?: string;
  message?: string;
}

export function useApprovalsList(
  options: UseApprovalsListOptions = {},
): UseApprovalsListResult {
  const { statuses, types, limit } = options;
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const fetcherRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Stable query string — statuses/types canonicalised via sort so a
  // caller re-rendering with a new array reference but same values
  // does not needlessly re-trigger the effect.
  const qs = (() => {
    const params = new URLSearchParams();
    if (statuses && statuses.length > 0) {
      params.set("statuses", [...statuses].sort().join(","));
    }
    if (types && types.length > 0) {
      params.set("types", [...types].sort().join(","));
    }
    if (limit !== undefined) {
      params.set("limit", String(limit));
    }
    return params.toString();
  })();

  useEffect(() => {
    cancelledRef.current = false;

    const fetchRows = async () => {
      try {
        const url = qs ? `/api/approvals?${qs}` : "/api/approvals";
        const res = await fetch(url, {
          cache: "no-store",
          credentials: "same-origin",
        });
        const body = (await res.json().catch(() => ({}))) as ListResponse;
        if (cancelledRef.current) return;

        if (!res.ok || !body.ok) {
          setError(body.message ?? body.error ?? `HTTP ${res.status}`);
        } else {
          setRows(body.rows ?? []);
          setError(null);
        }
      } catch (e) {
        if (!cancelledRef.current) setError((e as Error).message);
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    };

    fetcherRef.current = fetchRows;

    const schedule = () => {
      if (cancelledRef.current) return;
      if (typeof document !== "undefined" && document.hidden) {
        timerRef.current = setTimeout(schedule, POLL_MS);
        return;
      }
      void fetchRows();
      timerRef.current = setTimeout(schedule, POLL_MS);
    };

    const onVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        void fetchRows();
      }
    };

    void fetchRows();
    timerRef.current = setTimeout(schedule, POLL_MS);

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, [qs]);

  const refresh = useCallback(() => {
    void fetcherRef.current();
  }, []);

  const refetch = useCallback(async () => {
    await fetcherRef.current();
  }, []);

  return { rows, loading, error, setRows, refresh, refetch };
}
