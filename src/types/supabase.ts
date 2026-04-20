// ============================================================
// Supabase Database Types
// Mirrors the schema defined in infrastructure/init_supabase.sql
// Extended in Phase 9 to include departments, agent roles/skills,
// and enhanced task fields.
// ============================================================

export type NodeStatus = 'online' | 'offline' | 'degraded';

// 7 states — executing_tool added in Phase 26 for tool-call visibility
export type AgentStatus = 'idle' | 'working' | 'error' | 'offline' | 'thinking' | 'queued' | 'executing_tool';

export type TaskStatus = 'pending' | 'claimed' | 'in_progress' | 'completed' | 'failed';

export type TaskType = 'general' | 'code-review' | 'deploy' | 'research' | 'build' | 'test' | 'card-bridge';

// Phase 9: Agent role and badge types
export type AgentRole = 'lead' | 'specialist' | 'intern';
export type AgentBadge = 'LEAD' | 'SPC' | 'INT';

// Phase 64.5.2 Plan 03: NodeRow is a SUPERSET — preserves legacy fields
// (ram_usage_mb, ram_total_mb, agent_count, last_heartbeat) consumed by
// (dashboard)/layout.tsx and api/nodes/list/route.ts, AND adds the new
// columns introduced by migrations 014/016 (tailscale_*, deprovisioned_at,
// last_heartbeat_at, hostname, platform, available_adapters). Removing
// any legacy field breaks the dashboard layout — Codex Plan03-HIGH-#1.
export interface NodeRow {
  // --- Preserved (consumed by (dashboard)/layout.tsx) ---
  node_id: string;
  tailscale_ip: string | null;
  gateway_port: number | null;
  auth_token_hash?: string;
  status: NodeStatus | string | null;
  agent_count: number;          // KEEP — layout.tsx reads this
  ram_usage_mb: number;         // KEEP — layout.tsx computes ramPct
  ram_total_mb: number;         // KEEP — layout.tsx computes ramPct
  cpu_percent?: number;
  last_heartbeat: string | null; // KEEP (legacy alias) — aliased from last_heartbeat_at server-side
  created_at: string | null;
  updated_at: string | null;
  // --- Added by Phase 64.5.2 (superset) ---
  last_heartbeat_at: string | null;    // canonical column name per migration 014
  tailscale_hostname: string | null;
  hostname: string | null;
  deprovisioned_at: string | null;
  platform: string | null;
  available_adapters: string[] | null;
  // Runtime-only (not in schema)
  ram_pct?: number;
}

// Phase 9: Department table
export interface DepartmentRow {
  id: string;
  name: string;
  display_name: string;
  objective: string | null;
  color: string;
  icon: string;
  sort_order: number;
  zone_bounds: { x: number; y: number; width: number; height: number } | null;
  created_at: string;
  updated_at: string;
}

// Phase 62 (v1.9 CLI Agent Connect) extensions — migration
// supabase/migrations/20260416_002_cli_connect_agents_extension.sql
// All fields optional to preserve backwards-compatibility with legacy
// consumers that rely on the Phase 9 shape.
export interface AgentRow {
  agent_id: string;
  node_id: string;
  name: string;
  emoji: string;
  status: AgentStatus;
  current_task_id: string | null;
  avatar_model: string;
  last_activity: string; // ISO timestamp
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Phase 9 extensions
  department_id?: string | null;
  role?: AgentRole;
  skills?: string[];
  about?: string | null;
  soul_config?: Record<string, unknown>;
  badge?: AgentBadge;
  soul_dirty?: boolean;
  // Phase 62 extensions (V3 §12 L868-881) — see CLI-connect schema migration 002.
  // TEXT PK `agent_id` is canonical (NOT `id`); seed agents are is_seed=true.
  slug?: string;
  soul_content?: string | null;
  adapter_type?: string | null;
  adapter_config?: Record<string, unknown>;
  permissions?: Record<string, unknown>;
  preferred_node_id?: string | null;
  bound_node_id?: string | null;
  session_id?: string | null;
  session_params?: Record<string, unknown> | null;
  session_updated_at?: string | null;
  created_by_agent_id?: string | null;
  is_seed?: boolean;
  deleted_at?: string | null;
  avatar_url?: string | null;
}

export interface TaskRow {
  task_id: string;
  source_agent_id: string | null;
  target_agent_id: string | null;
  title: string;
  type: string;
  status: TaskStatus;
  priority: number;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error_message: string | null;
  card_id: string | null;       // FK to cards.card_id — Card→Task bridge link
  max_retries: number;
  retry_count: number;
  created_at: string;
  claimed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
  // Phase 9 extensions (non-optional — DB defaults ensure these are always present)
  required_skills: string[];
  description: string | null;
  labels: string[];
  due_date: string | null;  // ISO timestamp
  comments: Array<{ author: string; text: string; created_at: string }>;
}

// Phase 25: Chat message channels
export type MessageChannel = 'web' | 'telegram' | 'tui';
export type MessageSenderType = 'user' | 'agent';

// Phase 25: Unified chat message row
export interface AgentMessageRow {
  message_id: string;
  sender_type: MessageSenderType;
  sender_id: string;
  recipient_agent_id: string;
  topic: string;
  text: string;
  channel: MessageChannel;
  mentions: Array<{ agent_id: string; username: string }>;
  read_at: string | null;  // ISO timestamp or null
  created_at: string;       // ISO timestamp
}

// Phase 31+35: Skill marketplace types
export type SkillOrigin = 'local' | 'github' | 'skills_sh';
export type AgentSkillStatus = 'pending' | 'installing' | 'installed' | 'failed' | 'uninstalling' | 'uninstall_failed' | 'removed';
export type AgentSkillDesiredState = 'present' | 'absent';

export interface SkillRow {
  id: string;
  name: string;
  description: string;
  icon: string;
  origin: SkillOrigin;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkillVersionRow {
  id: string;
  skill_id: string;
  version: string;
  content: string;
  install_spec: Record<string, unknown>;
  created_at: string;
}

export interface AgentSkillRow {
  id: string;
  agent_id: string;
  skill_id: string;
  skill_version_id: string | null;
  status: AgentSkillStatus;
  desired_state: AgentSkillDesiredState;
  installed_at: string | null;
  last_error: string | null;
  last_attempted_at: string | null;
  created_at: string;
}

// --- Smart Skill Intake: Input Detection Engine ---

export type InputType = 'github_url' | 'command' | 'file' | 'text' | 'unknown';
export type DetectionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type TextIntent = 'skill_description' | 'discovery_intent';

/**
 * SkillDraft is the single source of truth from detection through preview through POST.
 * It mirrors the POST /api/skills body plus detection metadata and the original raw input.
 * No re-derivation at confirm time — what was detected is what gets registered.
 */
export interface SkillDraft {
  // Detection metadata
  type: InputType;
  confidence: DetectionConfidence;
  intent?: TextIntent;           // only set when type === 'text'

  // POST /api/skills body fields (all optional until confirmed)
  name?: string;
  description?: string;
  icon?: string;
  origin?: SkillOrigin;
  source_url?: string;
  content?: string;
  version?: string;

  // Internal tracking
  raw_input: string;             // the original user input, unmodified
  size_error?: boolean;          // true when file input exceeds 500KB cap
}

/**
 * Normalized result from discovery search (ClawHub or GitHub tree fallback).
 * Used by GET /api/skills/discover and DiscoveryPanel component.
 */
export interface DiscoveredSkill {
  slug: string;          // e.g. "vercel-labs/find-skills"
  displayName: string;
  summary: string | null;
  version: string | null;
  updatedAt: number;     // Unix ms timestamp; 0 when unknown (GitHub tree fallback)
  source: 'clawhub' | 'github_tree' | 'skills_sh';
}

// Helper type for Supabase Realtime postgres_changes events
export type RealtimePayload<T> = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
};

// ============================================================
// Phase 62 / Phase 69: agent_runs + agent_run_logs
// Spec: docs/RESEARCH-PAPERCLIP-CLI-CONNECT-v3.md §12 (lines 897-944)
// Migration: supabase/migrations/20260416_003_cli_connect_agent_runs.sql
// ============================================================

export type AgentRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * One row per agent wake (a single CLI invocation).
 * Claimed atomically via the queued→running UPDATE (V3 §5.1).
 * Realtime is enabled for this table; consumers use `useRealtimeRuns`.
 */
export interface AgentRunRow {
  id: string;                      // UUID PK
  agent_id: string;                // FK → agents(agent_id) TEXT
  target_node_id: string | null;   // routing hint (filled by trigger)
  node_id: string | null;          // node that claimed the run
  adapter_type: string;            // e.g. claude_local | codex_local | openclaw_gateway
  status: AgentRunStatus;
  source: string;                  // task_assigned | manual | cron | mcp_call | approval_resolved
  source_ref: Record<string, unknown> | null;
  wake_reason: string | null;
  context: Record<string, unknown> | null;
  attempt: number;
  max_attempts: number;
  session_id: string | null;
  session_params: Record<string, unknown> | null;
  exit_code: number | null;
  signal: string | null;
  timed_out: boolean | null;
  usage_json: Record<string, unknown> | null;
  cost_usd: number | null;
  summary: string | null;
  result_json: Record<string, unknown> | null;
  error_message: string | null;
  error_code: string | null;
  queued_at: string;               // ISO
  claimed_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

/**
 * Chunked stdout/stderr output for a run.
 * NOT realtime-published (V3 §12 L946 — too much volume).
 * Consumers poll via `useRealtimeRunLogs` → GET /api/agent-runs/[runId]/logs.
 */
export interface AgentRunLogRow {
  id: number;                      // BIGSERIAL PK
  run_id: string;                  // FK → agent_runs(id) UUID
  stream: 'stdout' | 'stderr';
  chunk: string;
  ts: string;                      // ISO (column name in migration: ts, NOT created_at)
}
