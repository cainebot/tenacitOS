// Phase 69 Plan 09 — Instructions tab real-data wiring tests.
//
// Covers:
//   - soul_content = "# hello" → Soul.md body renders as "# hello"
//   - soul_content = ""        → Soul empty state shown
//   - Click Tools.md           → empty state shown (no fabricated body)
//   - Click Copy               → navigator.clipboard.writeText called with body
//   - Click Edit on Soul.md    → onEdit() callback fires (parent router.push)
//   - XSS regression           → "<script>…</script>" in soul_content renders
//                                as a text node, no <script> element created
//
// Mocks next/navigation since the component itself doesn't use the router —
// the parent page passes an onEdit callback. But importing the component
// transitively may touch the navigation module (defensive, per neighbouring
// test files).

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { AgentRow } from "@/types/supabase";
import { TabInstructions } from "../tab-instructions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeAgent(overrides: Partial<AgentRow> = {}): AgentRow {
  return {
    agent_id: "jax",
    node_id: "circus-01",
    name: "Jax",
    emoji: "🎯",
    status: "idle",
    current_task_id: null,
    avatar_model: "",
    last_activity: "2026-04-20T09:00:00Z",
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
    ...overrides,
  };
}

describe("TabInstructions — Plan 69-09 real-data wiring", () => {
  it("renders Soul.md body verbatim from agent.soul_content", () => {
    const agent = makeAgent({ soul_content: "# hello" });
    render(<TabInstructions agent={agent} />);

    const body = screen.getByTestId("instructions-body");
    expect(body.textContent).toBe("# hello");
  });

  it("shows the empty state for Soul.md when soul_content is empty string", () => {
    const agent = makeAgent({ soul_content: "" });
    render(<TabInstructions agent={agent} />);

    expect(screen.getByTestId("instructions-empty-state")).toBeTruthy();
    expect(screen.queryByTestId("instructions-body")).toBeNull();
    expect(screen.getByText("No content yet")).toBeTruthy();
  });

  it("shows the empty state for Tools.md (no fabricated body)", () => {
    const agent = makeAgent({ soul_content: "# hello" });
    render(<TabInstructions agent={agent} />);

    // Switch to Tools.md via the file-list button.
    const toolsBtn = screen.getByRole("button", { name: /Tools\.md/ });
    fireEvent.click(toolsBtn);

    expect(screen.getByTestId("instructions-empty-state")).toBeTruthy();
    expect(screen.queryByTestId("instructions-body")).toBeNull();
    // No fabricated body string leaked in.
    expect(screen.queryByText(/Placeholder — wired in Plan 69-09/)).toBeNull();
    expect(screen.queryByText(/# Tools — Jax/)).toBeNull();
  });

  it("calls navigator.clipboard.writeText with the active body when Copy is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { writeText } },
      configurable: true,
      writable: true,
    });

    const agent = makeAgent({ soul_content: "# hello" });
    render(<TabInstructions agent={agent} />);

    const copyBtn = screen.getByRole("button", { name: /Copy/ });
    fireEvent.click(copyBtn);

    // flush the clipboard microtask
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith("# hello");
  });

  it("invokes onEdit callback when Edit is clicked on Soul.md", () => {
    const onEdit = vi.fn();
    const agent = makeAgent({ soul_content: "# hello" });
    render(<TabInstructions agent={agent} onEdit={onEdit} />);

    const editBtn = screen.getByRole("button", { name: /Edit/ });
    fireEvent.click(editBtn);

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("does NOT invoke onEdit when Edit is clicked on a non-Soul file (Tools.md)", () => {
    const onEdit = vi.fn();
    // Silence the intentional console.warn the handler emits for read-only files.
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const agent = makeAgent({ soul_content: "# hello" });
    render(<TabInstructions agent={agent} onEdit={onEdit} />);

    // Switch to Tools.md.
    fireEvent.click(screen.getByRole("button", { name: /Tools\.md/ }));
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));

    expect(onEdit).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("renders <script> content from soul_content as text, not as a DOM script element (XSS regression)", () => {
    const evil = '<script>alert(1)</script>';
    const agent = makeAgent({ soul_content: evil });
    const { container } = render(<TabInstructions agent={agent} />);

    const body = screen.getByTestId("instructions-body");
    // Literal text child — React escapes it.
    expect(body.textContent).toBe(evil);
    // And absolutely no live <script> element was injected anywhere.
    expect(container.querySelector("script")).toBeNull();
  });
});
