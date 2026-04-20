// Phase 69 fixtures — test/story seed data, typed against real
// `AgentRow` + `AgentRunRow` shapes from `@/types/supabase`.
//
// BLOCKING-1 remediation (2026-04-20): this file lives under
// `src/__fixtures__/` and is IMPORTED ONLY by test (`*.test.tsx`) and
// story (`*.stories.tsx`) files. The Phase 69 UUI-discipline lint rule
// grep in the executor contract asserts:
//
//   rg -n "phase-69-fixtures" src/app src/components/application → 0 hits
//
// If you are about to import from here in app code, STOP. Use the real
// API / hook instead (`GET /api/agents`, `useRealtimeAgents`).
//
// Exports are also gated behind `process.env.NODE_ENV !== 'production'`
// so tree-shaking eliminates this file from the production build even
// if a stray import slips past the lint rule.

import type { AgentRow, AgentRunRow } from "@/types/supabase";

if (process.env.NODE_ENV === "production") {
  // Throwing at module-load in prod is the belt to BLOCKING-1's braces:
  // if this file ever makes it into the bundle, it fails loudly instead of
  // quietly shipping mock data to real users.
  throw new Error(
    "phase-69-fixtures.ts must not be imported in production code. Use the real API/hook.",
  );
}

// ---------------------------------------------------------------------------
// Agents — test-only seeds. Shape: `AgentRow` (Phase 62 superset).
// ---------------------------------------------------------------------------

const SOUL_JAX = `# Jax — SOUL.md (v12)

You are Jax — a prospector agent on the CircOS mesh.
You hunt qualified leads from the seed list and forward them to Qualifier
agents for scoring.

## Identity
- Role: prospector
- Adapter: codex
- Bound node: circus-01
- Reports to: Scrum Master (Gangle)
`;

export const PHASE_69_AGENTS: AgentRow[] = [
  {
    agent_id: "gangle",
    node_id: "circus-01",
    name: "Gangle",
    emoji: "🧙",
    status: "idle",
    current_task_id: null,
    avatar_model: "",
    last_activity: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    metadata: {},
    created_at: "2026-04-01T13:18:00Z",
    updated_at: "2026-04-19T08:55:00Z",
    slug: "gangle",
    soul_content: "# Gangle — Scrum Master",
    adapter_type: "codex",
    adapter_config: {},
    permissions: { orchestrate: true, reassign: true },
    preferred_node_id: "circus-01",
    bound_node_id: "circus-01",
    is_seed: true,
    deleted_at: null,
    avatar_url: null,
    role: "lead",
  },
  {
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
    soul_content: SOUL_JAX,
    adapter_type: "codex",
    adapter_config: {},
    permissions: { outreach: true, qualify: true },
    preferred_node_id: "circus-01",
    bound_node_id: "circus-01",
    is_seed: true,
    deleted_at: null,
    avatar_url: null,
    role: "specialist",
  },
  {
    agent_id: "kaufmo",
    node_id: "circus-02",
    name: "Kaufmo",
    emoji: "🎭",
    status: "idle",
    current_task_id: null,
    avatar_model: "",
    last_activity: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    metadata: {},
    created_at: "2026-04-02T10:00:00Z",
    updated_at: "2026-04-18T18:22:00Z",
    slug: "kaufmo",
    soul_content: "# Kaufmo — Qualifier",
    adapter_type: "qwen",
    adapter_config: {},
    permissions: { qualify: true, score: true },
    preferred_node_id: "circus-02",
    bound_node_id: "circus-02",
    is_seed: true,
    deleted_at: null,
    avatar_url: null,
    role: "specialist",
  },
  {
    agent_id: "kinger",
    node_id: "circus-01",
    name: "Kinger",
    emoji: "👑",
    status: "error",
    current_task_id: null,
    avatar_model: "",
    last_activity: new Date(Date.now() - 21 * 60 * 1000).toISOString(),
    metadata: {},
    created_at: "2026-04-05T09:30:00Z",
    updated_at: "2026-04-19T08:30:00Z",
    slug: "kinger",
    soul_content: "# Kinger — Enricher",
    adapter_type: "codex",
    adapter_config: {},
    permissions: { enrich: true },
    preferred_node_id: "circus-01",
    bound_node_id: "circus-01",
    is_seed: false,
    deleted_at: null,
    avatar_url: null,
    role: "specialist",
  },
  {
    agent_id: "pomni",
    node_id: "circus-02",
    name: "Pomni",
    emoji: "🤡",
    status: "idle",
    current_task_id: null,
    avatar_model: "",
    last_activity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    metadata: {},
    created_at: "2026-04-03T14:15:00Z",
    updated_at: "2026-04-19T07:00:00Z",
    slug: "pomni",
    soul_content: "# Pomni — Copywriter",
    adapter_type: "glm",
    adapter_config: {},
    permissions: { write: true },
    preferred_node_id: "circus-02",
    bound_node_id: "circus-02",
    is_seed: true,
    deleted_at: null,
    avatar_url: null,
    role: "specialist",
  },
  {
    agent_id: "ragatha",
    node_id: "circus-01",
    name: "Ragatha",
    emoji: "🪡",
    status: "error",
    current_task_id: null,
    avatar_model: "",
    last_activity: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    metadata: {},
    created_at: "2026-04-08T11:45:00Z",
    updated_at: "2026-04-19T08:30:00Z",
    slug: "ragatha",
    soul_content: "# Ragatha — Qualifier",
    adapter_type: "qwen",
    adapter_config: {},
    permissions: { qualify: true },
    preferred_node_id: "circus-01",
    bound_node_id: "circus-01",
    is_seed: false,
    deleted_at: null,
    avatar_url: null,
    role: "intern",
  },
  {
    agent_id: "zooble",
    node_id: "circus-02",
    name: "Zooble",
    emoji: "👁️",
    status: "idle",
    current_task_id: null,
    avatar_model: "",
    last_activity: new Date().toISOString(),
    metadata: {},
    created_at: "2026-04-19T09:00:00Z",
    updated_at: "2026-04-19T09:00:00Z",
    slug: "zooble",
    soul_content: "# Zooble — Enricher",
    adapter_type: "glm",
    adapter_config: {},
    permissions: { enrich: true },
    preferred_node_id: null,
    bound_node_id: null,
    is_seed: false,
    deleted_at: null,
    avatar_url: null,
    role: "intern",
  },
  // Archived (soft-deleted)
  {
    agent_id: "bartleby",
    node_id: "circus-01",
    name: "Bartleby",
    emoji: "🪦",
    status: "offline",
    current_task_id: null,
    avatar_model: "",
    last_activity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {},
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-04-16T12:00:00Z",
    slug: "bartleby",
    soul_content: "",
    adapter_type: "codex",
    adapter_config: {},
    permissions: {},
    preferred_node_id: null,
    bound_node_id: null,
    is_seed: false,
    deleted_at: "2026-04-16T12:00:00Z",
    avatar_url: null,
    role: "intern",
  },
];

// ---------------------------------------------------------------------------
// Agent runs — per-agent mock rows. Shape: `AgentRunRow`.
// ---------------------------------------------------------------------------

export const PHASE_69_RUNS: AgentRunRow[] = [
  {
    id: "8a2f1b3c-0000-0000-0000-000000000001",
    agent_id: "jax",
    target_node_id: "circus-01",
    node_id: "circus-01",
    adapter_type: "codex",
    status: "running",
    source: "manual",
    source_ref: null,
    wake_reason: null,
    context: null,
    attempt: 1,
    max_attempts: 3,
    session_id: null,
    session_params: null,
    exit_code: null,
    signal: null,
    timed_out: null,
    usage_json: null,
    cost_usd: null,
    summary: null,
    result_json: null,
    error_message: null,
    error_code: null,
    queued_at: new Date(Date.now() - 3 * 60_000).toISOString(),
    claimed_at: new Date(Date.now() - 3 * 60_000).toISOString(),
    started_at: new Date(Date.now() - 3 * 60_000).toISOString(),
    finished_at: null,
    created_at: new Date(Date.now() - 3 * 60_000).toISOString(),
  },
  {
    id: "7fe812aa-0000-0000-0000-000000000002",
    agent_id: "jax",
    target_node_id: "circus-01",
    node_id: "circus-01",
    adapter_type: "codex",
    status: "completed",
    source: "manual",
    source_ref: null,
    wake_reason: null,
    context: null,
    attempt: 1,
    max_attempts: 3,
    session_id: null,
    session_params: null,
    exit_code: 0,
    signal: null,
    timed_out: false,
    usage_json: null,
    cost_usd: null,
    summary: null,
    result_json: null,
    error_message: null,
    error_code: null,
    queued_at: new Date(Date.now() - 9 * 60_000).toISOString(),
    claimed_at: new Date(Date.now() - 9 * 60_000).toISOString(),
    started_at: new Date(Date.now() - 8 * 60_000).toISOString(),
    finished_at: new Date(Date.now() - 7 * 60_000).toISOString(),
    created_at: new Date(Date.now() - 9 * 60_000).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Display helpers — kept here because the old fixtures file exported them
// and tests still rely on the names. Production code uses the same helpers
// from `@/lib/agent-display` (they are duplicated in spirit, not in code).
// ---------------------------------------------------------------------------

export function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - Date.parse(iso);
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec} s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return min === 1 ? "1 m ago" : `${min} m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? "1 h ago" : `${hr} h ago`;
  const day = Math.floor(hr / 24);
  return day === 1 ? "1 d ago" : `${day} d ago`;
}

export function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} s`;
  const min = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${min} m` : `${min} m ${rem} s`;
}
