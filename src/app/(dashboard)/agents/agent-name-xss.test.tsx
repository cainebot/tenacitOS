// Phase 69 Plan 02 — SECURITY T3 falsification test.
// Seeds an agent row with `name='<script>alert(1)</script>'` into the
// mocked API response, then renders `/agents` and asserts:
//  1. The DOM contains the literal string as a text node.
//  2. NO <script> element was created as a side effect of the render.
//
// Guards against a future refactor that uses dangerouslySetInnerHTML
// or a markdown renderer on `name`. React's default text-escaping is
// the mitigation; this test keeps it honest.

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import type { AgentRow } from "@/types/supabase";

vi.mock("@/hooks/useRealtimeAgents", () => ({
  useRealtimeAgents: () => ({ agents: [], loading: false, error: null, resync: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import AgentsPage from "./page";

const XSS: AgentRow = {
  agent_id: "xss",
  node_id: "circus-01",
  name: "<script>alert(1)</script>",
  emoji: "⚠️",
  status: "idle",
  current_task_id: null,
  avatar_model: "",
  last_activity: new Date().toISOString(),
  metadata: {},
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-19T00:00:00Z",
  slug: "xss-test",
  soul_content: "",
  adapter_type: "codex",
  adapter_config: {},
  permissions: {},
  preferred_node_id: null,
  bound_node_id: null,
  is_seed: false,
  deleted_at: null,
  avatar_url: null,
  role: "intern",
};

const originalFetch = global.fetch;
afterEach(() => {
  cleanup();
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("SECURITY T3 — agent name XSS falsification", () => {
  it("renders <script>…</script> literal as text; no <script> element injected", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ agents: [XSS] }) }) as unknown as typeof fetch;

    const { container } = render(<AgentsPage />);
    await waitFor(() => {
      expect(container.textContent).toContain("<script>alert(1)</script>");
    });

    // No <script> tag exists in the list view as a side-effect.
    const scripts = container.querySelectorAll("script");
    expect(scripts.length).toBe(0);
  });
});
