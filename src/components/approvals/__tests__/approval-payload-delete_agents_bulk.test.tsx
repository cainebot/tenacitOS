// Phase 69 Plan 06 — delete_agents_bulk renderer unit tests.
//
// Guards:
//   - Mounts with data-testid="approval-payload-delete_agents_bulk".
//   - Snapshot-present branch (target_snapshots populated) makes
//     ZERO fetches (REVIEW #6).
//   - Snapshot-absent branch fires exactly ONE batched fetch
//     GET /api/agents?ids=a,b,c — NOT N parallel fetches.
//   - Every agent_id in the payload gets a row (with or without
//     snapshot metadata).

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { ApprovalPayloadDeleteAgentsBulk } from "../approval-payload-delete_agents_bulk";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ApprovalPayloadDeleteAgentsBulk", () => {
  it("mounts with the dispatch testid", () => {
    render(
      <ApprovalPayloadDeleteAgentsBulk
        payload={{
          agent_ids: ["a", "b"],
          target_snapshots: [
            { agent_id: "a", slug: "a", name: "Alpha" },
            { agent_id: "b", slug: "b", name: "Beta" },
          ],
        }}
      />,
    );
    expect(
      screen.getByTestId("approval-payload-delete_agents_bulk"),
    ).toBeTruthy();
  });

  it("snapshot-present branch makes ZERO fetches (REVIEW #6)", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(
      <ApprovalPayloadDeleteAgentsBulk
        payload={{
          agent_ids: ["a", "b", "c"],
          target_snapshots: [
            { agent_id: "a", slug: "a", name: "Alpha" },
            { agent_id: "b", slug: "b", name: "Beta" },
            { agent_id: "c", slug: "c", name: "Gamma" },
          ],
        }}
      />,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("snapshot-absent branch fires exactly ONE batched fetch (not N parallel)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          agents: [
            { agent_id: "a", slug: "a", name: "Alpha" },
            { agent_id: "b", slug: "b", name: "Beta" },
            { agent_id: "c", slug: "c", name: "Gamma" },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    render(
      <ApprovalPayloadDeleteAgentsBulk
        payload={{
          agent_ids: ["a", "b", "c"],
          // target_snapshots ABSENT.
        }}
      />,
    );
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(String(fetchSpy.mock.calls[0][0])).toBe("/api/agents?ids=a,b,c");
  });

  it("renders one row per agent_id even without snapshot", async () => {
    // Snapshot absent → fallback fetch resolves and drives setState.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ agents: [] }), { status: 200 }),
    );
    render(
      <ApprovalPayloadDeleteAgentsBulk
        payload={{ agent_ids: ["a", "b"] }}
      />,
    );
    await waitFor(() =>
      expect(
        screen.getByTestId("approval-payload-delete_agents_bulk-row-a"),
      ).toBeTruthy(),
    );
    expect(
      screen.getByTestId("approval-payload-delete_agents_bulk-row-b"),
    ).toBeTruthy();
  });

  it("count label reflects number of agents", () => {
    render(
      <ApprovalPayloadDeleteAgentsBulk
        payload={{
          agent_ids: ["a", "b", "c"],
          target_snapshots: [],
        }}
      />,
    );
    expect(screen.getByText("3 agents to archive")).toBeTruthy();
  });
});
