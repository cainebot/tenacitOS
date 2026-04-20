import type { Meta, StoryObj } from "@storybook/react";
import { RunLogStream } from "./run-log-stream";
import type { AgentRunLogRow } from "@/types/supabase";

const meta: Meta<typeof RunLogStream> = {
  title: "Phase69/RunLogStream",
  component: RunLogStream,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof RunLogStream>;

const RUN_ID = "11111111-2222-3333-4444-555555555555";

function makeChunk(
  id: number,
  stream: "stdout" | "stderr",
  chunk: string,
): AgentRunLogRow {
  return {
    id,
    run_id: RUN_ID,
    stream,
    chunk,
    ts: new Date(Date.UTC(2026, 3, 20, 12, 34, 56, id * 7)).toISOString(),
  };
}

export const Empty: Story = {
  name: "Empty (no chunks, active)",
  args: {
    chunks: [],
    active: true,
  },
};

export const MixedStreams: Story = {
  name: "10 chunks (stdout + stderr)",
  args: {
    active: true,
    chunks: [
      makeChunk(1, "stdout", "[runner] booting codex adapter"),
      makeChunk(2, "stdout", "[runner] AUTH_SECRET loaded (hidden)"),
      makeChunk(3, "stdout", "[codex] prompt primed"),
      makeChunk(4, "stderr", "warn: rate-limit budget 12/30"),
      makeChunk(5, "stdout", "[codex] tool call: list_agents"),
      makeChunk(6, "stdout", "[codex] tool result ok (3ms)"),
      makeChunk(7, "stderr", "error: dispatcher timeout (retrying)"),
      makeChunk(8, "stdout", "[codex] retry 1/3"),
      makeChunk(9, "stdout", "[codex] success"),
      makeChunk(10, "stdout", "[runner] exiting with code 0"),
    ],
  },
};

export const ManyChunks: Story = {
  name: "500 chunks (upper-bound DOM)",
  args: {
    active: true,
    chunks: Array.from({ length: 500 }, (_, i) =>
      makeChunk(
        i + 1,
        i % 13 === 0 ? "stderr" : "stdout",
        `line ${i + 1}: simulating sustained agent output`,
      ),
    ),
  },
};

export const Terminal: Story = {
  name: "Terminal (active=false)",
  args: {
    active: false,
    chunks: [
      makeChunk(1, "stdout", "[runner] resumed from cached run"),
      makeChunk(2, "stdout", "summary: approvals dispatched 2"),
      makeChunk(3, "stdout", "[runner] exit 0"),
    ],
  },
};
