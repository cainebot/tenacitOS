// Phase 69 Plan 02 — /agents list page integration test.
// BLOCKING-3 (REVIEW finding 1): asserts the authoritative data source
// is `fetch('/api/agents')`, not `PHASE_69_AGENTS` or `useRealtimeAgents().agents`.
// Also asserts that a Realtime emission triggers a (debounced) refetch.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import type { AgentRow } from "@/types/supabase";

// Mock the Realtime hook BEFORE importing the page.
let mockAgents: AgentRow[] = [];
vi.mock("@/hooks/useRealtimeAgents", () => ({
  useRealtimeAgents: () => ({
    agents: mockAgents,
    loading: false,
    error: null,
    resync: vi.fn(),
  }),
}));

// Mock next/navigation.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import AgentsPage from "./page";

const FAKE_AGENT: AgentRow = {
  agent_id: "jax",
  node_id: "circus-01",
  name: "Jax",
  emoji: "🎯",
  status: "working",
  current_task_id: null,
  avatar_model: "",
  last_activity: new Date().toISOString(),
  metadata: {},
  created_at: "2026-04-01T13:22:01Z",
  updated_at: "2026-04-19T09:14:33Z",
  slug: "jax",
  soul_content: "",
  adapter_type: "codex",
  adapter_config: {},
  permissions: {},
  preferred_node_id: "circus-01",
  bound_node_id: "circus-01",
  is_seed: true,
  deleted_at: null,
  avatar_url: null,
  role: "specialist",
};

const originalFetch = global.fetch;

beforeEach(() => {
  mockAgents = [];
});

afterEach(() => {
  cleanup();
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("/agents list page", () => {
  it("fetches /api/agents and renders rows from the API response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ agents: [FAKE_AGENT] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AgentsPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    // URL includes include_archived=0 on the initial call.
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toMatch(/\/api\/agents\?include_archived=0/);

    // Row from API is rendered (not mock fixtures).
    await waitFor(() => expect(screen.getByText("Jax")).toBeTruthy());
  });

  it("a Realtime delta triggers a silent refetch", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agents: [FAKE_AGENT] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          agents: [FAKE_AGENT, { ...FAKE_AGENT, agent_id: "kinger", slug: "kinger", name: "Kinger" }],
        }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    // First render — fingerprint is empty.
    const { rerender } = render(<AgentsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    // Simulate a Realtime emission by mutating the mocked hook's return.
    mockAgents = [FAKE_AGENT];
    rerender(<AgentsPage />);

    // Debounced refetch (250 ms) fires.
    await waitFor(
      () => expect(fetchMock).toHaveBeenCalledTimes(2),
      { timeout: 2000 },
    );
  });
});
