// Phase 69 Plan 07 — NodeStatusStrip unit tests (REMEDIATION-3).
//
// Guards:
//   - Renders one row per seeded node (SPEC-69-NODE-01).
//   - Active-run count is derived from useRealtimeRuns filtered by
//     isActiveRun — a queued run counts (SPEC-69-NODE-02 falsification,
//     REVIEW finding 3). A completed run does NOT count.
//   - Active-runs badge is hidden when count === 0.
//   - Stale heartbeat (> STALE_HEARTBEAT_MS) overrides the status
//     color to "error".
//   - Adapter pills render one <Badge> per adapter.
//   - EmptyState renders when nodes.length === 0.
//   - Error state renders the Retry button.
//   - computeActiveRunCounts pure-predicate behaviour.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { NodeRow, AgentRunRow, AgentRunStatus } from "@/types/supabase";
import { NodeStatusStrip } from "../node-status-strip";
import { computeActiveRunCounts } from "@/components/application/node-status-strip/compute-active-run-counts";

// ------------------------------------------------------------------
// useRealtimeRuns mock: a var the tests can reassign before render.
// ------------------------------------------------------------------
const { runsMockRef } = vi.hoisted(() => ({
  runsMockRef: { current: [] as AgentRunRow[] },
}));

vi.mock("@/hooks/useRealtimeRuns", () => ({
  useRealtimeRuns: () => ({
    runs: runsMockRef.current,
    loading: false,
    error: null,
    resync: async () => {},
  }),
}));

afterEach(() => {
  cleanup();
  runsMockRef.current = [];
});

// ------------------------------------------------------------------
// Fixture builders
// ------------------------------------------------------------------

const nowMs = () => Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

function makeNode(overrides: Partial<NodeRow> = {}): NodeRow {
  return {
    node_id: "circus-01",
    tailscale_ip: "100.64.0.1",
    gateway_port: 9000,
    status: "online",
    agent_count: 0,
    ram_usage_mb: 0,
    ram_total_mb: 2048,
    last_heartbeat: iso(nowMs() - 10_000),
    last_heartbeat_at: iso(nowMs() - 10_000),
    created_at: iso(nowMs() - 60_000),
    updated_at: iso(nowMs() - 10_000),
    tailscale_hostname: "circus-01",
    hostname: "circus-01.hetzner",
    deprovisioned_at: null,
    platform: "linux",
    available_adapters: ["codex", "qwen"],
    ...overrides,
  };
}

function makeRun(
  nodeId: string | null,
  status: AgentRunStatus,
  id = "r-" + Math.random().toString(36).slice(2),
): AgentRunRow {
  return {
    id,
    agent_id: "gangle",
    target_node_id: nodeId,
    node_id: nodeId,
    adapter_type: "codex",
    status,
    source: "manual",
    source_ref: null,
    wake_reason: null,
    context: null,
    attempt: 1,
    max_attempts: 3,
    session_id: null,
    session_params: null,
    exit_code: null,
    signal: null,
    timed_out: null,
    usage_json: null,
    cost_usd: null,
    summary: null,
    result_json: null,
    error_message: null,
    error_code: null,
    queued_at: iso(nowMs()),
    claimed_at: null,
    started_at: null,
    finished_at: null,
    created_at: iso(nowMs()),
  };
}

// ------------------------------------------------------------------
// computeActiveRunCounts (pure)
// ------------------------------------------------------------------

describe("computeActiveRunCounts", () => {
  it("counts queued and running runs per node_id", () => {
    const runs: AgentRunRow[] = [
      makeRun("circus-01", "queued"),
      makeRun("circus-01", "running"),
      makeRun("circus-02", "running"),
      makeRun("circus-02", "completed"),
    ];
    const map = computeActiveRunCounts(runs);
    expect(map.get("circus-01")).toBe(2);
    expect(map.get("circus-02")).toBe(1);
  });

  it("excludes completed / failed / cancelled (SPEC-69-NODE-02 falsification)", () => {
    const runs: AgentRunRow[] = [
      makeRun("circus-01", "completed"),
      makeRun("circus-01", "failed"),
      makeRun("circus-01", "cancelled"),
    ];
    expect(computeActiveRunCounts(runs).get("circus-01")).toBeUndefined();
  });

  it("includes a queued run (REVIEW finding 3)", () => {
    const runs: AgentRunRow[] = [makeRun("circus-01", "queued")];
    expect(computeActiveRunCounts(runs).get("circus-01")).toBe(1);
  });

  it("skips runs with null node_id (unclaimed)", () => {
    const runs: AgentRunRow[] = [makeRun(null, "queued"), makeRun(null, "running")];
    expect(computeActiveRunCounts(runs).size).toBe(0);
  });
});

// ------------------------------------------------------------------
// Render
// ------------------------------------------------------------------

describe("<NodeStatusStrip />", () => {
  it("renders one row per seeded node (SPEC-69-NODE-01)", () => {
    render(<NodeStatusStrip nodes={[makeNode({ node_id: "circus-01" }), makeNode({ node_id: "circus-02" })]} />);
    const rows = screen.getAllByTestId("node-status-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]!.getAttribute("data-node-id")).toBe("circus-01");
    expect(rows[1]!.getAttribute("data-node-id")).toBe("circus-02");
  });

  it("shows queued-run count from useRealtimeRuns (SPEC-69-NODE-02 falsification)", () => {
    runsMockRef.current = [
      makeRun("circus-01", "queued"),
      makeRun("circus-01", "running"),
    ];
    render(<NodeStatusStrip nodes={[makeNode({ node_id: "circus-01" })]} />);
    const badge = screen.getByTestId("active-runs-badge");
    expect(badge.textContent).toContain("2");
    expect(badge.textContent).toContain("runs");
  });

  it("pluralises 'run' singular when count === 1", () => {
    runsMockRef.current = [makeRun("circus-01", "running")];
    render(<NodeStatusStrip nodes={[makeNode({ node_id: "circus-01" })]} />);
    const badge = screen.getByTestId("active-runs-badge");
    expect(badge.textContent).toMatch(/\b1 run\b/);
  });

  it("hides the active-runs badge when count === 0", () => {
    runsMockRef.current = []; // no active runs
    render(<NodeStatusStrip nodes={[makeNode({ node_id: "circus-01" })]} />);
    expect(screen.queryByTestId("active-runs-badge")).toBeNull();
  });

  it("completed runs do not count toward the active badge", () => {
    runsMockRef.current = [
      makeRun("circus-01", "completed"),
      makeRun("circus-01", "cancelled"),
    ];
    render(<NodeStatusStrip nodes={[makeNode({ node_id: "circus-01" })]} />);
    expect(screen.queryByTestId("active-runs-badge")).toBeNull();
  });

  it("renders one pill per adapter", () => {
    render(
      <NodeStatusStrip
        nodes={[makeNode({ node_id: "circus-01", available_adapters: ["codex", "qwen", "glm"] })]}
      />,
    );
    const pillsContainer = screen.getByTestId("adapter-pills");
    expect(pillsContainer.children.length).toBe(3);
    expect(pillsContainer.textContent).toContain("codex");
    expect(pillsContainer.textContent).toContain("qwen");
    expect(pillsContainer.textContent).toContain("glm");
  });

  it("stale heartbeat overrides status to 'offline · stale hb'", () => {
    const staleNode = makeNode({
      node_id: "circus-01",
      status: "online",
      // 10 minutes old → beyond STALE_HEARTBEAT_MS (5 min)
      last_heartbeat_at: iso(nowMs() - 10 * 60_000),
      last_heartbeat: iso(nowMs() - 10 * 60_000),
    });
    render(<NodeStatusStrip nodes={[staleNode]} />);
    expect(screen.getByText(/offline · stale hb/i)).toBeTruthy();
  });

  it("renders EmptyState when nodes.length === 0", () => {
    render(<NodeStatusStrip nodes={[]} />);
    expect(screen.getByText(/No nodes registered yet/i)).toBeTruthy();
    expect(screen.queryByTestId("node-status-list")).toBeNull();
  });

  it("renders error state with a Retry button", () => {
    const onRetry = vi.fn();
    render(
      <NodeStatusStrip
        nodes={[]}
        error="connection refused"
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText(/Could not load nodes/i)).toBeTruthy();
    expect(screen.getByText(/connection refused/i)).toBeTruthy();
    const retry = screen.getByRole("button", { name: /retry/i });
    expect(retry).toBeTruthy();
  });

  it("does not mix active-run counts between nodes", () => {
    runsMockRef.current = [
      makeRun("circus-01", "queued"),
      makeRun("circus-02", "running"),
      makeRun("circus-02", "queued"),
    ];
    render(
      <NodeStatusStrip
        nodes={[
          makeNode({ node_id: "circus-01" }),
          makeNode({ node_id: "circus-02" }),
        ]}
      />,
    );
    const rows = screen.getAllByTestId("node-status-row");
    const badge1 = rows[0]!.querySelector('[data-testid="active-runs-badge"]');
    const badge2 = rows[1]!.querySelector('[data-testid="active-runs-badge"]');
    expect(badge1?.textContent).toContain("1");
    expect(badge2?.textContent).toContain("2");
  });
});
