// Phase 69 Plan 02 — /agents/[id]/edit integration test (SPEC-69-CRUD-03).
// REVIEW finding 2: mount-time read of `pending_approval` is the canonical
// lock. On first paint with `pending_approval !== null` the form is
// read-only with a banner + link to /approvals/{id}.
//
// The test mocks `fetch('/api/agents/${id}')` with both shapes:
//   - with `pending_approval` → form read-only + banner
//   - with `pending_approval: null` → form editable

import { Suspense } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import type { AgentRow } from "@/types/supabase";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import EditAgentPage from "./page";

const AGENT: AgentRow = {
  agent_id: "jax",
  node_id: "circus-01",
  name: "Jax",
  emoji: "🎯",
  status: "idle",
  current_task_id: null,
  avatar_model: "",
  last_activity: new Date().toISOString(),
  metadata: {},
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-19T00:00:00Z",
  slug: "jax",
  soul_content: "# Jax",
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

const originalFetch = global.fetch;

afterEach(() => {
  cleanup();
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("/agents/[id]/edit page", () => {
  it("pending_approval set → form read-only + banner rendered", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          agent: AGENT,
          pending_approval: {
            approval_id: "appr-123",
            type: "update_agent",
            created_at: "2026-04-20T00:00:00Z",
          },
        }),
      }) as unknown as typeof fetch;

    await act(async () => {
      render(
        <Suspense fallback={<div data-testid="suspended" />}>
          <EditAgentPage params={Promise.resolve({ id: "jax" })} />
        </Suspense>,
      );
    });

    // Banner text from AGENT_DETAIL_COPY.pendingApprovalBanner.
    await waitFor(
      () => {
        expect(screen.getByRole("status")).toBeTruthy();
      },
      { timeout: 4000 },
    );
    const banner = screen.getByRole("status");
    expect(banner.textContent).toContain("Changes pending approval");

    const name = screen.getByLabelText(/^Name/) as HTMLInputElement;
    expect(name.disabled).toBe(true);
    expect(name.value).toBe("Jax");

    // No Request update button rendered in readOnly mode.
    expect(
      screen.queryByRole("button", { name: /Request update/i }),
    ).toBeNull();
  });

  it("pending_approval null → form editable", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ agent: AGENT, pending_approval: null }),
      }) as unknown as typeof fetch;

    await act(async () => {
      render(
        <Suspense fallback={<div data-testid="suspended" />}>
          <EditAgentPage params={Promise.resolve({ id: "jax" })} />
        </Suspense>,
      );
    });

    await waitFor(() => {
      const name = screen.getByLabelText(/^Name/) as HTMLInputElement;
      expect(name.disabled).toBe(false);
    });
    expect(
      screen.getByRole("button", { name: /Request update/i }),
    ).toBeTruthy();
    expect(
      screen.queryByText(/Changes pending approval/i),
    ).toBeNull();
  });
});
