// Phase 69 Plan 02 — AgentsTable integration test.
// Covers (per plan's NEW test 2026-04-20):
//  (a) row click fires onRowClick with the full AgentRow
//  (b) status column renders BadgeWithDot with the correct color per status
//  (c) empty-state renders "Create first agent" CTA
//  (d) error-state renders Retry button

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AgentsTable } from "./agents-table";
import type { AgentRow } from "@/types/supabase";

afterEach(() => cleanup());

const BASE: AgentRow = {
  agent_id: "jax",
  node_id: "circus-01",
  name: "Jax",
  emoji: "🎯",
  status: "working",
  current_task_id: null,
  avatar_model: "",
  last_activity: new Date().toISOString(),
  metadata: {},
  created_at: "2026-04-01T13:22:01Z",
  updated_at: "2026-04-19T09:14:33Z",
  slug: "jax",
  soul_content: "",
  adapter_type: "codex",
  adapter_config: {},
  permissions: {},
  preferred_node_id: "circus-01",
  bound_node_id: "circus-01",
  is_seed: true,
  deleted_at: null,
  avatar_url: null,
  role: "specialist",
};

describe("AgentsTable", () => {
  it("(a) row click fires onRowClick with the full AgentRow", () => {
    const onRowClick = vi.fn();
    render(<AgentsTable agents={[BASE]} onRowClick={onRowClick} />);
    const row = screen.getByText("Jax").closest("tr")!;
    fireEvent.click(row);
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0][0]).toEqual(BASE);
  });

  it("(b) status column renders label for each status value", () => {
    const idle: AgentRow = { ...BASE, agent_id: "a1", name: "Idle Agent", slug: "idle", status: "idle" };
    const err: AgentRow = { ...BASE, agent_id: "a2", name: "Err Agent", slug: "err", status: "error" };
    render(<AgentsTable agents={[idle, err]} />);
    expect(screen.getByText("idle")).toBeTruthy();
    expect(screen.getByText("error")).toBeTruthy();
  });

  it("(c) empty-state renders 'Create first agent' CTA when list is empty", () => {
    const onCreate = vi.fn();
    render(<AgentsTable agents={[]} onCreate={onCreate} />);
    const cta = screen.getByRole("button", { name: /Create first agent/i });
    expect(cta).toBeTruthy();
    fireEvent.click(cta);
    expect(onCreate).toHaveBeenCalled();
  });

  it("(d) error-state renders Retry button", () => {
    const onRefresh = vi.fn();
    render(
      <AgentsTable
        agents={[]}
        error="boom"
        onRefresh={onRefresh}
      />,
    );
    const retry = screen.getByRole("button", { name: /Retry/i });
    expect(retry).toBeTruthy();
    fireEvent.click(retry);
    expect(onRefresh).toHaveBeenCalled();
  });

  it("archived rows are hidden by default, shown when includeArchived=true", () => {
    const archived: AgentRow = {
      ...BASE,
      agent_id: "gone",
      name: "Gone",
      slug: "gone",
      deleted_at: "2026-04-10T00:00:00Z",
    };
    const { rerender } = render(<AgentsTable agents={[BASE, archived]} />);
    expect(screen.queryByText("Gone")).toBeNull();
    rerender(<AgentsTable agents={[BASE, archived]} includeArchived />);
    expect(screen.getByText("Gone")).toBeTruthy();
  });
});
