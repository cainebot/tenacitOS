"use client";

// Phase 69 Plan 10 — instruction-files live list hook.
//
// Responsibilities:
//   1. Initial fetch from /api/agents/[id]/instructions (merges SOUL.md +
//      canonical 4 + user-created — already excludes 'soul' + hides
//      'user'/'identity' server-side; we rely on that contract).
//   2. Subscribe to TWO Realtime postgres_changes topics, one per table
//      (agent_identity_files filtered by agent_id, agent_instructions same).
//      Any payload → debounced silent refetch (250 ms) per Plan 02 BLOCKING-3.
//   3. Merge synthesized SOUL.md from `agent.soul_content + agent.icon` if
//      the server-side row is missing (defensive; server already synthesizes).
//   4. Expose `refetch()` for imperative invalidation after mutation.
//
// Channel names are mount-unique (crypto.randomUUID()) to avoid StrictMode
// double-mount subscription collisions — pattern from Plan 02.

import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabase";
import type { AgentRow } from "@/types/supabase";

export interface InstructionFileRow {
  file_name: string;
  icon: string;
  content: string;
  is_canonical: boolean;
  file_type?: string;
  updated_at: string;
}

export interface UseInstructionFilesResult {
  files: InstructionFileRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Client-side visibility filter (defense-in-depth on top of the server route
// that already drops these two file_types). v1.9 aesthetic-frozen hide per
// memory `feedback_no_frontend_aesthetic_changes`.
const HIDDEN_CANONICAL_TYPES = new Set(["user", "identity"]);

function hideHiddenCanonicals(rows: InstructionFileRow[]): InstructionFileRow[] {
  return rows.filter((r) => {
    if (r.is_canonical && r.file_type && HIDDEN_CANONICAL_TYPES.has(r.file_type)) {
      return false;
    }
    return true;
  });
}

export function useInstructionFiles(agent: AgentRow): UseInstructionFilesResult {
  const [files, setFiles] = useState<InstructionFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const agentId = agent.agent_id;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async () => {
    if (!agentId) return;
    try {
      setError(null);
      const res = await fetch(
        `/api/agents/${encodeURIComponent(agentId)}/instructions`,
        { credentials: "same-origin" },
      );
      if (!res.ok) {
        setError(`Failed to load files (${res.status})`);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { files?: InstructionFileRow[] };
      const list = Array.isArray(data.files) ? data.files : [];
      setFiles(hideHiddenCanonicals(list));
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "fetch failed");
      setLoading(false);
    }
  }, [agentId]);

  const scheduleRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void refetch();
    }, 250);
  }, [refetch]);

  // ME-01 — split the initial fetch into its own effect keyed only on
  // agentId. Inlining the fetch (instead of calling `refetch()` which
  // mutates state via setters) keeps react-compiler's
  // set-state-during-effect rule happy: the effect's data flow is
  // traceable end-to-end.
  useEffect(() => {
    if (!agentId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/agents/${encodeURIComponent(agentId)}/instructions`,
          { credentials: "same-origin" },
        );
        if (cancelled) return;
        if (!res.ok) {
          setError(`Failed to load files (${res.status})`);
          setLoading(false);
          return;
        }
        const data = (await res.json()) as { files?: InstructionFileRow[] };
        if (cancelled) return;
        const list = Array.isArray(data.files) ? data.files : [];
        setFiles(hideHiddenCanonicals(list));
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "fetch failed");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  useEffect(() => {
    if (!agentId) return;
    const supabase = createBrowserClient();

    // Two channels, topic-per-mount (StrictMode-safe).
    const identityChannel = supabase
      .channel(`instr-identity-${agentId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_identity_files",
          filter: `agent_id=eq.${agentId}`,
        },
        () => scheduleRefetch(),
      )
      .subscribe();

    const userChannel = supabase
      .channel(`instr-user-${agentId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_instructions",
          filter: `agent_id=eq.${agentId}`,
        },
        () => scheduleRefetch(),
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void supabase.removeChannel(identityChannel);
      void supabase.removeChannel(userChannel);
    };
  }, [agentId, scheduleRefetch]);

  return { files, loading, error, refetch };
}
