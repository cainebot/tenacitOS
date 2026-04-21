import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useLocalMeshStatus } from "./useLocalMeshStatus";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useLocalMeshStatus", () => {
  it("propagates tailscale_daemon_ok=true on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tailscale_daemon_ok: true,
        tailscale_hostname: "circos-mac",
      }),
    });
    const { result } = renderHook(() => useLocalMeshStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tailscale_daemon_ok).toBe(true);
    expect(result.current.tailscale_hostname).toBe("circos-mac");
  });

  it("propagates error_code from envelope-on-nonzero-exit", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tailscale_daemon_ok: false,
        error: "daemon down",
        error_code: "tailscale_daemon_not_running",
      }),
    });
    const { result } = renderHook(() => useLocalMeshStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tailscale_daemon_ok).toBe(false);
    expect(result.current.error_code).toBe("tailscale_daemon_not_running");
  });
});
