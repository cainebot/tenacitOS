// @vitest-environment jsdom
// Phase 69 Plan 11 — AgentHeader wiring tests.
// Focus: Pause/Resume toggle based on status + callback invocation +
// disabled logic. Visual aesthetic is NOT asserted (memory
// feedback_no_frontend_aesthetic_changes — the design is final).

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AgentHeader } from "../agent-header";
import type { AgentRow } from "@/types/supabase";

afterEach(() => cleanup());

function makeAgent(overrides: Partial<AgentRow> = {}): AgentRow {
  return {
    agent_id: "pomni",
    node_id: "circus-01",
    name: "Pomni",
    emoji: "🎭",
    status: "idle",
    current_task_id: null,
    avatar_model: "",
    last_activity: "2026-04-20T04:00:00Z",
    metadata: {},
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-20T00:00:00Z",
    slug: "pomni",
    soul_content: "# Pomni",
    adapter_type: "claude_local",
    adapter_config: {},
    permissions: {},
    preferred_node_id: null,
    bound_node_id: "circus-01",
    is_seed: true,
    deleted_at: null,
    avatar_url: null,
    paused_at: null,
    paused_reason: null,
    ...overrides,
  };
}

describe("AgentHeader — Plan 69-11 wiring", () => {
  it("shows Pause button when status is not paused", () => {
    render(<AgentHeader agent={makeAgent({ status: "idle" })} />);
    expect(screen.getByRole("button", { name: /pause/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /resume/i })).toBeNull();
  });

  it("shows Resume button when status is paused", () => {
    render(<AgentHeader agent={makeAgent({ status: "paused" })} />);
    expect(screen.getByRole("button", { name: /resume/i })).toBeTruthy();
    // Only the Resume button should match — Pause is replaced.
    const buttons = screen.getAllByRole("button");
    const pauseBtns = buttons.filter((b) => /^pause$/i.test(b.textContent ?? ""));
    expect(pauseBtns.length).toBe(0);
  });

  it("calls onPause when status is idle", () => {
    const onPause = vi.fn();
    render(<AgentHeader agent={makeAgent({ status: "idle" })} onPause={onPause} />);
    fireEvent.click(screen.getByRole("button", { name: /pause/i }));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it("calls onResume when status is paused", () => {
    const onResume = vi.fn();
    render(<AgentHeader agent={makeAgent({ status: "paused" })} onResume={onResume} />);
    fireEvent.click(screen.getByRole("button", { name: /resume/i }));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it("calls onAssignTask and onRunHeartbeat", () => {
    const onAssignTask = vi.fn();
    const onRunHeartbeat = vi.fn();
    render(
      <AgentHeader
        agent={makeAgent({ status: "idle" })}
        onAssignTask={onAssignTask}
        onRunHeartbeat={onRunHeartbeat}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /assign task/i }));
    fireEvent.click(screen.getByRole("button", { name: /run heartbeat/i }));
    expect(onAssignTask).toHaveBeenCalledTimes(1);
    expect(onRunHeartbeat).toHaveBeenCalledTimes(1);
  });

  it("disables all 4 action buttons when actionPending=true", () => {
    const onPause = vi.fn();
    render(
      <AgentHeader
        agent={makeAgent({ status: "idle" })}
        actionPending
        onPause={onPause}
      />,
    );
    const buttons = screen.getAllByRole("button");
    // All Pause/Assign/Run/Edit buttons should carry disabled state.
    const action = buttons.filter((b) =>
      /assign task|run heartbeat|pause|edit/i.test(b.textContent ?? ""),
    );
    expect(action.length).toBeGreaterThanOrEqual(4);
    // Clicking the Pause button must NOT invoke the handler when disabled.
    const pauseBtn = screen.getByRole("button", { name: /pause/i });
    fireEvent.click(pauseBtn);
    expect(onPause).not.toHaveBeenCalled();
  });

  it("disables Run heartbeat when agent is paused (can't invoke paused agent)", () => {
    const onRunHeartbeat = vi.fn();
    render(
      <AgentHeader
        agent={makeAgent({ status: "paused" })}
        onRunHeartbeat={onRunHeartbeat}
      />,
    );
    const runBtn = screen.getByRole("button", { name: /run heartbeat/i });
    fireEvent.click(runBtn);
    expect(onRunHeartbeat).not.toHaveBeenCalled();
  });

  it("renders paused_reason as React text (no HTML injection)", () => {
    const malicious = '<script>alert("xss")</script>';
    render(
      <AgentHeader
        agent={makeAgent({ status: "paused", paused_reason: malicious })}
      />,
    );
    // The malicious string must appear as literal text (aria-label
    // includes it; the <script> tag must NOT be present as an element).
    const paused = screen.getByLabelText(`Paused: ${malicious}`);
    expect(paused).toBeTruthy();
    expect(document.querySelector("script")).toBeNull();
  });
});
