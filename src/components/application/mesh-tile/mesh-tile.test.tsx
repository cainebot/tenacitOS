// Phase 64.5.2-04 — MeshTile integration test.
// Mocks the 3 hooks and asserts: rows render with correct semaphore color,
// header warning badge appears when localOk=false, and humanized copy is
// pulled via lookup.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const mockNodes = [
  {
    node_id: "circus-01",
    status: "online",
    last_heartbeat_at: new Date().toISOString(),
    tailscale_hostname: "circus-01.tail.ts.net",
    deprovisioned_at: null,
  },
  {
    node_id: "circus-02",
    status: "offline",
    last_heartbeat_at: new Date().toISOString(),
    tailscale_hostname: "circus-02.tail.ts.net",
    deprovisioned_at: null,
  },
];

vi.mock("@/hooks/useRealtimeNodes", () => ({
  useRealtimeNodes: () => ({
    nodes: mockNodes,
    activeNodes: mockNodes,
    loading: false,
    error: null,
    resync: () => Promise.resolve(),
  }),
}));

const localState = { tailscale_daemon_ok: true };
vi.mock("@/hooks/useLocalMeshStatus", () => ({
  useLocalMeshStatus: () => ({
    tailscale_daemon_ok: localState.tailscale_daemon_ok,
    tailscale_hostname: "circos-mac",
    loading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/useErrorMessages", () => ({
  useErrorMessages: () => ({
    loading: false,
    error: null,
    lookup: (code: string) => ({
      title: `humanized:${code}`,
      description: "desc",
      next_step: "step",
      doc_link: "https://example.com",
    }),
  }),
}));

import { MeshTile } from "./mesh-tile";

describe("MeshTile", () => {
  beforeEach(() => {
    cleanup();
    localState.tailscale_daemon_ok = true;
  });

  it("renders one row per active node with node_id label", () => {
    render(<MeshTile lang="es" />);
    expect(screen.getByText("circus-01")).toBeTruthy();
    expect(screen.getByText("circus-02")).toBeTruthy();
  });

  it("shows degraded/offline label for status=offline (rule 1)", () => {
    render(<MeshTile lang="es" />);
    // rule 1: offline → error → "Caído"
    expect(screen.getAllByText("Caído").length).toBeGreaterThan(0);
  });

  it("shows header warning badge with humanized copy when localOk=false", () => {
    localState.tailscale_daemon_ok = false;
    render(<MeshTile lang="es" />);
    expect(screen.getByText("humanized:tailscale_not_logged_in")).toBeTruthy();
  });
});
