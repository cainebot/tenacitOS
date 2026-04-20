// Quick 260420-nxb — Instructions tab Paperclip parity tests.
//
// Covers the refactored surface:
//   - Textarea is always active when a file is selected (no Edit button).
//   - Save + Cancel only render when draftContent !== savedContent (dirty).
//   - Save on SOUL.md → PATCH /api/agents/[id] with { changes: { soul_content } }.
//   - Save on non-SOUL → PATCH /api/agents/[id]/instructions/[file_name] with { content }.
//   - Cancel reverts draft to saved (silently for small diffs).
//   - Delete button hidden for canonical files; visible for user files.
//   - Advanced section collapsed by default, toggles on click, renders
//     Mode segmented (Managed active, External disabled), Root path, Entry file.
//   - XSS regression: <script> in soul_content renders as text inside textarea,
//     not as a live DOM element.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { AgentRow } from "@/types/supabase";
import { TabInstructions } from "../tab-instructions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Phase 69 Plan 10 — `tab-instructions.tsx` consumes `useInstructionFiles(agent)`
// (fetches /api/agents/[id]/instructions + subscribes to Realtime). For unit
// tests we stub the hook with a pure function derived from agent fields so the
// assertions stay valid without mocking fetch/Supabase at the hook level. The
// shape must match `UseInstructionFilesResult` exported from the hook module.
vi.mock("@/hooks/useInstructionFiles", () => ({
  useInstructionFiles: (agent: { soul_content: string | null; icon?: string | null }) => ({
    files: [
      {
        file_name: "SOUL.md",
        icon: agent.icon ?? "FileHeart02",
        content: agent.soul_content ?? "",
        is_canonical: true,
        file_type: "soul",
        updated_at: "2026-04-20T00:00:00Z",
      },
      {
        file_name: "Tools.md",
        icon: "Tool01",
        content: "",
        is_canonical: true,
        file_type: "tools",
        updated_at: "2026-04-20T00:00:00Z",
      },
      {
        file_name: "Agents.md",
        icon: "Users01",
        content: "",
        is_canonical: true,
        file_type: "agents",
        updated_at: "2026-04-20T00:00:00Z",
      },
      {
        file_name: "Memoy.md",
        icon: "BookOpen01",
        content: "",
        is_canonical: true,
        file_type: "memory",
        updated_at: "2026-04-20T00:00:00Z",
      },
      {
        file_name: "Heartbeat.md",
        icon: "Activity",
        content: "",
        is_canonical: true,
        file_type: "heartbeat",
        updated_at: "2026-04-20T00:00:00Z",
      },
      {
        file_name: "Custom.md",
        icon: "File06",
        content: "user stuff",
        is_canonical: false,
        file_type: "user",
        updated_at: "2026-04-20T00:00:00Z",
      },
    ],
    loading: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
  }),
}));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ approval_id: "a1" }),
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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

function getTextarea(): HTMLTextAreaElement {
  // The UUI TextArea renders a single <textarea> inside the "Content" label.
  const el = screen.getByRole("textbox", { name: /Content/ });
  return el as HTMLTextAreaElement;
}

describe("TabInstructions — Paperclip parity (quick 260420-nxb)", () => {
  it("renders Soul.md body verbatim inside the textarea", () => {
    const agent = makeAgent({ soul_content: "# hello" });
    render(<TabInstructions agent={agent} />);

    expect(getTextarea().value).toBe("# hello");
  });

  it("shows an empty textarea for Soul.md when soul_content is empty", () => {
    const agent = makeAgent({ soul_content: "" });
    render(<TabInstructions agent={agent} />);

    expect(getTextarea().value).toBe("");
  });

  it("shows an empty textarea for Tools.md (no fabricated body)", () => {
    const agent = makeAgent({ soul_content: "# hello" });
    render(<TabInstructions agent={agent} />);

    fireEvent.click(screen.getByRole("button", { name: /Tools\.md/ }));
    expect(getTextarea().value).toBe("");
  });

  it("copies active body (not draft) when Copy is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { writeText } },
      configurable: true,
      writable: true,
    });

    const agent = makeAgent({ soul_content: "# hello" });
    render(<TabInstructions agent={agent} />);

    // Type into textarea (mutates draft) — Copy must still copy savedContent == "# hello".
    fireEvent.change(getTextarea(), { target: { value: "# drafted" } });

    const copyBtn = screen.getByRole("button", { name: /Copy/ });
    fireEvent.click(copyBtn);

    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith("# hello");
  });

  it("does NOT show Save or Cancel when draft equals saved content", () => {
    const agent = makeAgent({ soul_content: "# hello" });
    render(<TabInstructions agent={agent} />);

    expect(screen.queryByRole("button", { name: /^Save$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Cancel$/ })).toBeNull();
  });

  it("shows Save + Cancel once the draft diverges from saved content", () => {
    const agent = makeAgent({ soul_content: "# hello" });
    render(<TabInstructions agent={agent} />);

    fireEvent.change(getTextarea(), { target: { value: "# helloX" } });

    expect(screen.getByRole("button", { name: /^Save$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Cancel$/ })).toBeTruthy();
  });

  it("PATCHes /api/agents/[id] with changes.soul_content when saving SOUL.md", async () => {
    const agent = makeAgent({ soul_content: "# hello" });
    render(<TabInstructions agent={agent} />);

    fireEvent.change(getTextarea(), { target: { value: "# updated" } });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));

    // Flush the promise microtasks the click handler kicks off.
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/agents/jax");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({
      changes: { soul_content: "# updated" },
    });
  });

  it("PATCHes /api/agents/[id]/instructions/[file_name] with content when saving a non-SOUL file", async () => {
    const agent = makeAgent({ soul_content: "# hello" });
    render(<TabInstructions agent={agent} />);

    // Switch to Tools.md (no confirm because SOUL draft is clean)
    fireEvent.click(screen.getByRole("button", { name: /Tools\.md/ }));
    fireEvent.change(getTextarea(), { target: { value: "new" } });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));

    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/agents/jax/instructions/Tools.md");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ content: "new" });
  });

  it("Cancel reverts draft to saved and hides Save/Cancel (small diff, no confirm)", () => {
    const agent = makeAgent({ soul_content: "# hello" });
    render(<TabInstructions agent={agent} />);

    // Append one char so it's a small diff (no confirm prompt).
    fireEvent.change(getTextarea(), { target: { value: "# helloX" } });
    expect(getTextarea().value).toBe("# helloX");

    fireEvent.click(screen.getByRole("button", { name: /^Cancel$/ }));
    expect(getTextarea().value).toBe("# hello");
    expect(screen.queryByRole("button", { name: /^Save$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Cancel$/ })).toBeNull();
  });

  it("hides the Delete button for every canonical file", () => {
    const agent = makeAgent({ soul_content: "# hello" });
    render(<TabInstructions agent={agent} />);

    const canonicals = ["SOUL.md", "Tools.md", "Agents.md", "Memoy.md", "Heartbeat.md"];
    for (const name of canonicals) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(name.replace(".", "\\.")) }));
      expect(screen.queryByRole("button", { name: /Delete /i })).toBeNull();
    }
  });

  it("shows the Delete button when the active file is user-created (is_canonical=false)", () => {
    const agent = makeAgent({ soul_content: "# hello" });
    render(<TabInstructions agent={agent} />);

    fireEvent.click(screen.getByRole("button", { name: /Custom\.md/ }));
    expect(screen.getByRole("button", { name: /Delete Custom\.md/i })).toBeTruthy();
  });

  it("Advanced section is collapsed by default and toggles on click", () => {
    const agent = makeAgent({ soul_content: "# hello" });
    render(<TabInstructions agent={agent} />);

    expect(screen.queryByTestId("instructions-advanced-panel")).toBeNull();

    fireEvent.click(screen.getByTestId("instructions-advanced-toggle"));

    const panel = screen.getByTestId("instructions-advanced-panel");
    expect(panel).toBeTruthy();
    expect(screen.getByTestId("advanced-root-path").textContent).toBe("/agents/jax/");
    expect(screen.getByTestId("advanced-entry-file").textContent).toBe("AGENTS.md");
  });

  it("Advanced Mode segmented: Managed is pressed, External is disabled", () => {
    const agent = makeAgent({ soul_content: "# hello" });
    render(<TabInstructions agent={agent} />);

    fireEvent.click(screen.getByTestId("instructions-advanced-toggle"));

    const managed = screen.getByRole("button", { name: /Managed/ });
    const external = screen.getByRole("button", { name: /External/ });
    expect(managed.getAttribute("aria-pressed")).toBe("true");
    expect(external.hasAttribute("disabled") || external.getAttribute("aria-disabled") === "true").toBe(
      true,
    );
  });

  it("Advanced root-path Copy button writes /agents/{slug}/ to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { writeText } },
      configurable: true,
      writable: true,
    });

    const agent = makeAgent({ soul_content: "# hello" });
    render(<TabInstructions agent={agent} />);
    fireEvent.click(screen.getByTestId("instructions-advanced-toggle"));

    // Two "Copy" buttons exist (header + advanced) — pick the one inside the advanced panel.
    const panel = screen.getByTestId("instructions-advanced-panel");
    const copyBtn = Array.from(panel.querySelectorAll("button")).find((b) =>
      /Copy/i.test(b.textContent ?? ""),
    );
    expect(copyBtn).toBeTruthy();
    fireEvent.click(copyBtn!);

    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith("/agents/jax/");
  });

  it("XSS regression: <script> in soul_content renders as textarea value, not as a DOM element", () => {
    const evil = "<script>alert(1)</script>";
    const agent = makeAgent({ soul_content: evil });
    const { container } = render(<TabInstructions agent={agent} />);

    expect(getTextarea().value).toBe(evil);
    expect(container.querySelector("script")).toBeNull();
  });
});
