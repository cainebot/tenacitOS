// @vitest-environment jsdom
// Phase 69 Plan 11 — useAgentActions hook coverage.
// Asserts URL + method + body for each of the 4 mutation calls.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAgentActions } from "../useAgentActions";

function mockFetchJson(status: number, body: unknown): void {
  global.fetch = vi.fn(async () => {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("useAgentActions", () => {
  it("pause(): POSTs { reason } to /api/agents/<id>/pause", async () => {
    mockFetchJson(200, { status: "paused", agent_id: "pomni" });
    const { result } = renderHook(() => useAgentActions("pomni"));
    await act(async () => {
      const out = await result.current.pause("maintenance");
      expect(out.status).toBe("paused");
    });
    const call = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("/api/agents/pomni/pause");
    expect(call[1].method).toBe("POST");
    expect(call[1].headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(call[1].body as string)).toEqual({ reason: "maintenance" });
  });

  it("resume(): POSTs {} to /api/agents/<id>/resume", async () => {
    mockFetchJson(200, { status: "resumed", agent_id: "pomni", current_status: "idle" });
    const { result } = renderHook(() => useAgentActions("pomni"));
    await act(async () => {
      const out = await result.current.resume();
      expect(out.status).toBe("resumed");
    });
    const call = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("/api/agents/pomni/resume");
    expect(JSON.parse(call[1].body as string)).toEqual({});
  });

  it("invoke(): POSTs { prompt } and returns run_id", async () => {
    mockFetchJson(200, {
      run_id: "r-1",
      target_node_id: "circus-01",
      adapter_type: "claude_local",
    });
    const { result } = renderHook(() => useAgentActions("pomni"));
    await act(async () => {
      const out = await result.current.invoke("ping");
      expect(out.run_id).toBe("r-1");
    });
    const call = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("/api/agents/pomni/invoke");
    expect(JSON.parse(call[1].body as string)).toEqual({ prompt: "ping" });
  });

  it("assignTask(): POSTs payload to /api/agents/<id>/assign-task", async () => {
    mockFetchJson(201, {
      card_id: "c-1",
      assigned_agent_id: "pomni",
      workflow_id: "w-1",
      state_id: "s-1",
    });
    const { result } = renderHook(() => useAgentActions("pomni"));
    const input = {
      title: "Task",
      workflow_id: "w-1",
      state_id: "s-1",
      description: "desc",
    };
    await act(async () => {
      const out = await result.current.assignTask(input);
      expect(out.card_id).toBe("c-1");
    });
    const call = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("/api/agents/pomni/assign-task");
    expect(JSON.parse(call[1].body as string)).toEqual(input);
  });

  it("sets error on non-ok response and rejects", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchJson(409, { error: "ERR_AGENT_PAUSED", message: "paused" });
    const { result } = renderHook(() => useAgentActions("pomni"));
    await act(async () => {
      await expect(result.current.invoke()).rejects.toThrow("paused");
    });
    expect(result.current.error).toContain("paused");
    expect(errSpy).toHaveBeenCalled();
  });

  it("URL-encodes agent_id with special chars", async () => {
    mockFetchJson(200, { status: "resumed", agent_id: "a/b", current_status: "idle" });
    const { result } = renderHook(() => useAgentActions("a/b"));
    await act(async () => {
      await result.current.resume();
    });
    const call = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("/api/agents/a%2Fb/resume");
  });
});
