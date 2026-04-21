// Phase 69 Plan 06 — delete_agent renderer unit tests.
//
// Guards:
//   - Mounts with data-testid="approval-payload-delete_agent".
//   - Snapshot-present branch + node binding present → exactly ONE
//     fetch (to /api/nodes/:id/active-runs). ZERO agent-snapshot fetch.
//   - Snapshot-absent branch → fallback to /api/agents/:id.
//   - Without node binding in the snapshot, pending-runs renders as
//     "Unknown" and no active-runs fetch is attempted.
//   - Soft-delete badge + warning banner render.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { ApprovalPayloadDeleteAgent } from "../approval-payload-delete_agent";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ApprovalPayloadDeleteAgent", () => {
  it("mounts with the dispatch testid", () => {
    render(
      <ApprovalPayloadDeleteAgent
        payload={{
          agent_id: "nova",
          target_snapshot: { slug: "nova", name: "Nova", bound_node_id: null },
        }}
      />,
    );
    expect(screen.getByTestId("approval-payload-delete_agent")).toBeTruthy();
  });

  it("snapshot-present + no node binding → zero agent fetches, 'Unknown' pending runs", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(
      <ApprovalPayloadDeleteAgent
        payload={{
          agent_id: "nova",
          target_snapshot: {
            slug: "nova",
            name: "Nova",
            bound_node_id: null,
            preferred_node_id: null,
          },
        }}
      />,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(
        screen.getByTestId("approval-payload-delete_agent-pending").textContent,
      ).toBe("Unknown");
    });
  });

  it("snapshot-present + node binding → exactly ONE fetch to /api/nodes/:id/active-runs", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ count: 3 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    render(
      <ApprovalPayloadDeleteAgent
        payload={{
          agent_id: "nova",
          target_snapshot: {
            slug: "nova",
            name: "Nova",
            bound_node_id: "node-1",
          },
        }}
      />,
    );
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/nodes/node-1/active-runs");
    await waitFor(() =>
      expect(
        screen.getByTestId("approval-payload-delete_agent-pending").textContent,
      ).toBe("3"),
    );
  });

  it("snapshot-absent branch fetches /api/agents/:id once", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url.startsWith("/api/agents/")) {
          return new Response(
            JSON.stringify({
              agent: {
                slug: "legacy",
                name: "Legacy",
                bound_node_id: null,
                preferred_node_id: null,
              },
            }),
            { status: 200 },
          );
        }
        return new Response("{}", { status: 200 });
      });
    render(
      <ApprovalPayloadDeleteAgent
        payload={{ agent_id: "legacy" }}
      />,
    );
    await waitFor(() =>
      expect(fetchSpy.mock.calls.some((c) => String(c[0]) === "/api/agents/legacy")).toBe(
        true,
      ),
    );
  });

  it("renders the warning banner text", () => {
    render(
      <ApprovalPayloadDeleteAgent
        payload={{
          agent_id: "nova",
          target_snapshot: { slug: "nova", name: "Nova", bound_node_id: null },
        }}
      />,
    );
    expect(screen.getByText(/soft-deleted/i)).toBeTruthy();
  });
});
