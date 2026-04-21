// Phase 69 Plan 06 — update_agent renderer unit tests.
//
// Guards:
//   - Mounts with data-testid="approval-payload-update_agent".
//   - Snapshot-present branch makes ZERO fetches (REVIEW #6).
//   - Snapshot-absent branch makes exactly ONE fallback fetch to
//     /api/agents/:id.
//   - SECURITY T2 consistency: <script> inside changes.soul_content
//     renders as text (no <script> element injected).
//   - SECURITY T18 consistency: Show full SOUL toggle for after column
//     reveals char beyond the 2000-char window.
//   - Non-whitelisted keys render as a visible warning row.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { ApprovalPayloadUpdateAgent } from "../approval-payload-update_agent";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ApprovalPayloadUpdateAgent", () => {
  it("mounts with the dispatch testid and whitelist note", () => {
    render(
      <ApprovalPayloadUpdateAgent
        payload={{
          agent_id: "nova",
          changes: { name: "Nova v2" },
          target_snapshot: { slug: "nova", name: "Nova", avatar_url: null },
        }}
      />,
    );
    expect(screen.getByTestId("approval-payload-update_agent")).toBeTruthy();
  });

  it("snapshot-present branch makes ZERO fetch calls (REVIEW #6)", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    render(
      <ApprovalPayloadUpdateAgent
        payload={{
          agent_id: "nova",
          changes: { name: "Nova v2" },
          target_snapshot: { slug: "nova", name: "Nova", avatar_url: null },
        }}
      />,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("snapshot-absent branch makes exactly ONE fallback fetch to /api/agents/:id", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          agent: {
            slug: "legacy",
            name: "Legacy",
            avatar_url: null,
            bound_node_id: null,
            preferred_node_id: null,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    render(
      <ApprovalPayloadUpdateAgent
        payload={{
          agent_id: "legacy",
          changes: { name: "Legacy v2" },
          // target_snapshot ABSENT → forces fallback.
        }}
      />,
    );
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const call = fetchSpy.mock.calls[0];
    expect(call[0]).toBe("/api/agents/legacy");
  });

  it("SECURITY T2: <script> in changes.soul_content renders as text", () => {
    const { container } = render(
      <ApprovalPayloadUpdateAgent
        payload={{
          agent_id: "evil",
          changes: { soul_content: "<script>alert(1)</script>" },
          target_snapshot: { slug: "evil", name: "Evil" },
        }}
      />,
    );
    expect(container.querySelectorAll("script").length).toBe(0);
    expect(
      screen.getByTestId("approval-payload-update_agent-soul-after").textContent,
    ).toContain("<script>");
  });

  it("SECURITY T18: Show full SOUL toggle reveals marker at 40K", () => {
    const marker = "MARKER_AT_40K";
    const soul = "x".repeat(40000) + marker + "x".repeat(9000);
    render(
      <ApprovalPayloadUpdateAgent
        payload={{
          agent_id: "verbose",
          changes: { soul_content: soul },
          target_snapshot: { slug: "verbose", name: "Verbose" },
        }}
      />,
    );
    expect(screen.queryByText(/MARKER_AT_40K/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Show full SOUL/i }));
    const afterPre = screen.getByTestId("approval-payload-update_agent-soul-after");
    expect(afterPre.textContent ?? "").toContain(marker);
  });

  it("non-whitelisted key renders a visible warning row", () => {
    render(
      <ApprovalPayloadUpdateAgent
        payload={{
          agent_id: "evil",
          changes: { role: "admin" },
          target_snapshot: { slug: "evil", name: "Evil" },
        }}
      />,
    );
    expect(
      screen.getByTestId("approval-payload-update_agent-warning-role"),
    ).toBeTruthy();
  });

  it("handles empty changes gracefully", () => {
    render(
      <ApprovalPayloadUpdateAgent
        payload={{
          agent_id: "nova",
          changes: {},
          target_snapshot: { slug: "nova", name: "Nova" },
        }}
      />,
    );
    expect(screen.getByText(/no field changes/i)).toBeTruthy();
  });
});
