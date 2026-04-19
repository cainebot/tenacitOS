"use client";

// Phase 68 Plan 06 Task 6 — Realtime pending approvals counter.
//
// Subscribes to the `approvals` table (Realtime publication added by
// migration 031) and keeps a live count of rows whose status is in
// ('pending', 'revision_requested').
//
// Used by the sidebar badge so the human operator sees the approval
// queue depth without needing to visit /approvals.

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase";
import {
  ACTIVE_APPROVAL_STATUSES,
  isActiveStatus,
  type ApprovalRow,
  type ApprovalStatus,
} from "@/types/approval";

export interface UseApprovalsCountResult {
  count: number;
  loading: boolean;
  error: string | null;
}

export function useApprovalsCount(): UseApprovalsCountResult {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    let cancelled = false;

    const fetchCount = async () => {
      const { count: c, error: fetchError } = await supabase
        .from("approvals")
        .select("id", { count: "exact", head: true })
        .in("status", ACTIVE_APPROVAL_STATUSES);

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setCount(c ?? 0);
      }
      setLoading(false);
    };

    fetchCount();

    // Unique topic per mount to avoid StrictMode double-subscribe
    // conflicts (same convention as useRealtimeNodes).
    const topic = `approvals-count-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "approvals" },
        (payload) => {
          const eventType = payload.eventType;
          if (eventType === "INSERT") {
            const row = payload.new as ApprovalRow;
            if (isActiveStatus(row.status)) {
              setCount((prev) => prev + 1);
            }
          } else if (eventType === "UPDATE") {
            // ME-03 (POST-EXEC): Supabase Realtime only ships `payload.old.status`
            // when the table has `REPLICA IDENTITY FULL`. `approvals` does not,
            // so `before.status` can be undefined — the `!wasActive && isActive`
            // branch would then fire on every UPDATE and inflate the counter.
            // Safer: authoritative re-count against the server on any UPDATE.
            fetchCount();
          } else if (eventType === "DELETE") {
            const before = payload.old as Partial<ApprovalRow>;
            if (isActiveStatus((before.status as ApprovalStatus) ?? "pending")) {
              setCount((prev) => Math.max(0, prev - 1));
            }
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { count, loading, error };
}
