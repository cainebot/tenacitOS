import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/lib/supabase", () => ({
  createBrowserClient: () => ({
    from: () => ({
      select: () => Promise.resolve({
        data: [
          { node_id: "circus-01", deprovisioned_at: null, status: "online" },
          { node_id: "circus-02", deprovisioned_at: "2026-04-18T00:00:00Z", status: "offline" },
        ],
        error: null,
      }),
    }),
    channel: () => ({
      on: function () { return this; },
      subscribe: function () { return this; },
    }),
    removeChannel: () => {},
  }),
}));

import { useRealtimeNodes } from "./useRealtimeNodes";

describe("useRealtimeNodes activeNodes filter", () => {
  it("excludes nodes with deprovisioned_at != null", async () => {
    const { result } = renderHook(() => useRealtimeNodes());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.nodes).toHaveLength(2);
    expect(result.current.activeNodes).toHaveLength(1);
    expect(result.current.activeNodes[0].node_id).toBe("circus-01");
  });
});
