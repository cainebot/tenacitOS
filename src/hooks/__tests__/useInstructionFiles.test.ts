// Phase 69 Plan 10 — useInstructionFiles unit tests.
//
// Covers:
//   - Initial fetch populates files[] with server response.
//   - `user` and `identity` canonical file_types filtered out client-side
//     (v1.9 aesthetic-frozen hide, defense-in-depth on top of server).
//   - refetch() invalidates the list.
//
// The Realtime subscription is stubbed; we don't simulate the postgres_changes
// payloads here (integration-territory). The hook's contract under Realtime
// is covered by the server route test + Plan 02 Realtime-pattern parity.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const channelStub = () => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
});

const supabaseStub = {
  channel: vi.fn(channelStub),
  removeChannel: vi.fn(),
};

vi.mock("@/lib/supabase", () => ({
  createBrowserClient: () => supabaseStub,
}));

import { useInstructionFiles } from "../useInstructionFiles";
import type { AgentRow } from "@/types/supabase";

const fetchMock = vi.fn();

function makeAgent(): AgentRow {
  return {
    agent_id: "pomni",
    node_id: "circus-01",
    name: "Pomni",
    emoji: "🤖",
    status: "idle",
    avatar_model: "",
    last_activity: "2026-04-20T00:00:00Z",
    metadata: {},
    created_at: "2026-04-20",
    updated_at: "2026-04-20",
    department_id: null,
    role: "specialist",
    skills: [],
    about: "",
    soul_config: null,
    badge: "SPC",
    soul_dirty: false,
    api_key_hash: "",
    execution_role: "agent",
    command_mode: "restricted",
    web_access: false,
    file_tools: false,
    sandbox_mode: false,
    tool_policy: null,
    identity_hash: null,
    desk_assignment: null,
    model: null,
    avatar_url: null,
    avatar_seed: null,
    personality_doc: null,
    heartbeat_checklists: null,
    vibe: null,
    reports_to_agent_id: null,
    slug: "pomni",
    soul_content: "# Soul",
    adapter_type: "claude_local",
    adapter_config: {},
    permissions: {},
    preferred_node_id: null,
    bound_node_id: null,
    created_by_agent_id: null,
    is_seed: true,
    deleted_at: null,
  } as unknown as AgentRow;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  supabaseStub.channel.mockReset().mockImplementation(channelStub);
  supabaseStub.removeChannel.mockReset();
  vi.stubGlobal("crypto", {
    ...(globalThis.crypto as object),
    randomUUID: () => "11111111-1111-1111-1111-111111111111",
  });
});

describe("useInstructionFiles", () => {
  it("populates files from /api/agents/[id]/instructions on mount", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        files: [
          { file_name: "SOUL.md", icon: "FileHeart02", content: "s", is_canonical: true, file_type: "soul", updated_at: "t" },
          { file_name: "Tools.md", icon: "File06", content: "t", is_canonical: true, file_type: "tools", updated_at: "t" },
        ],
      }),
    });

    const { result } = renderHook(() => useInstructionFiles(makeAgent()));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.files).toHaveLength(2);
    expect(result.current.files[0].file_name).toBe("SOUL.md");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agents/pomni/instructions",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("hides canonical file_types 'user' and 'identity' client-side", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        files: [
          { file_name: "SOUL.md", icon: "FileHeart02", content: "s", is_canonical: true, file_type: "soul", updated_at: "t" },
          { file_name: "User.md", icon: "User01", content: "u", is_canonical: true, file_type: "user", updated_at: "t" },
          { file_name: "Identity.md", icon: "Fingerprint01", content: "i", is_canonical: true, file_type: "identity", updated_at: "t" },
          { file_name: "Tools.md", icon: "File06", content: "t", is_canonical: true, file_type: "tools", updated_at: "t" },
        ],
      }),
    });

    const { result } = renderHook(() => useInstructionFiles(makeAgent()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const names = result.current.files.map((f) => f.file_name);
    expect(names).not.toContain("User.md");
    expect(names).not.toContain("Identity.md");
    expect(names).toContain("Tools.md");
    expect(names).toContain("SOUL.md");
  });

  it("sets error string on non-ok response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useInstructionFiles(makeAgent()));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/500/);
  });

  it("refetch() re-fires fetch and updates list", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: [] }),
    });
    const { result } = renderHook(() => useInstructionFiles(makeAgent()));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.files).toHaveLength(0);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        files: [
          { file_name: "SOUL.md", icon: "FileHeart02", content: "", is_canonical: true, file_type: "soul", updated_at: "t" },
        ],
      }),
    });
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.files).toHaveLength(1);
  });

  it("subscribes to both agent_identity_files and agent_instructions channels", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ files: [] }) });
    renderHook(() => useInstructionFiles(makeAgent()));
    await waitFor(() => expect(supabaseStub.channel).toHaveBeenCalled());
    expect(supabaseStub.channel).toHaveBeenCalledTimes(2);
    const channelNames = supabaseStub.channel.mock.calls.map((c: string[]) => c[0]);
    expect(channelNames.some((n: string) => n.startsWith("instr-identity-pomni-"))).toBe(true);
    expect(channelNames.some((n: string) => n.startsWith("instr-user-pomni-"))).toBe(true);
  });
});
