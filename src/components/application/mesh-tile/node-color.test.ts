// Phase 64.5.2-04 — UX-MESH-03 state machine unit tests.
// Pure function, no React. Codex Plan04-HIGH-#2 explicit rules:
//   1. status === "offline" → "error" (red) — dominates everything else
//   2. age > 300_000ms (>5min)  → "error" (red) — heartbeat_stale
//   3. age < 120_000ms (<2min) AND localOk → "success" (green)
//   4. else → "warning" (amber) — covers stale 120-300s OR fresh-but-!localOk

import { describe, it, expect } from "vitest";
import { nodeColor } from "./mesh-node-row";
import type { NodeRow } from "@/types/supabase";

const NOW = 1_700_000_000_000;
const isoAgo = (ms: number) => new Date(NOW - ms).toISOString();
const baseNode = (overrides: Partial<NodeRow> = {}): NodeRow =>
  ({
    node_id: "circus-01",
    tailscale_ip: null,
    gateway_port: null,
    status: "online",
    agent_count: 0,
    ram_usage_mb: 0,
    ram_total_mb: 0,
    last_heartbeat: null,
    created_at: null,
    updated_at: null,
    last_heartbeat_at: isoAgo(10_000),
    tailscale_hostname: null,
    hostname: null,
    deprovisioned_at: null,
    platform: null,
    available_adapters: null,
    ...overrides,
  }) as NodeRow;

describe("nodeColor — UX-MESH-03 state machine", () => {
  it("rule 1: status=offline dominates even with fresh heartbeat + localOk=true", () => {
    expect(nodeColor(baseNode({ status: "offline" }), true, NOW)).toBe("error");
  });

  it("rule 3: age > 300s → error even with localOk=true", () => {
    expect(nodeColor(baseNode({ last_heartbeat_at: isoAgo(360_000) }), true, NOW)).toBe(
      "error",
    );
  });

  it("rule 4: age < 120s + localOk + status=online → success", () => {
    expect(nodeColor(baseNode({ last_heartbeat_at: isoAgo(10_000) }), true, NOW)).toBe(
      "success",
    );
  });

  it("rule 5: age < 120s + localOk=false → warning (degradation)", () => {
    expect(nodeColor(baseNode({ last_heartbeat_at: isoAgo(10_000) }), false, NOW)).toBe(
      "warning",
    );
  });

  it("rule 5: age in 120-300s window + localOk=true → warning (stale-but-not-dead)", () => {
    expect(nodeColor(baseNode({ last_heartbeat_at: isoAgo(200_000) }), true, NOW)).toBe(
      "warning",
    );
  });

  it("rule 3 edge: last_heartbeat_at null → age = now - 0 → error", () => {
    expect(nodeColor(baseNode({ last_heartbeat_at: null }), true, NOW)).toBe("error");
  });
});
