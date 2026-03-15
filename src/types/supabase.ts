// ============================================================
// Supabase Database Types
// Mirrors the schema defined in infrastructure/init_supabase.sql
// Extended in Phase 9 to include departments, agent roles/skills,
// and enhanced task fields.
// ============================================================

export type NodeStatus = 'online' | 'offline' | 'degraded';

// 6 states as per Phase 3 spec (thinking + queued added via migration)
export type AgentStatus = 'idle' | 'working' | 'error' | 'offline' | 'thinking' | 'queued';

export type TaskStatus = 'pending' | 'claimed' | 'in_progress' | 'completed' | 'failed';

export type TaskType = 'general' | 'code-review' | 'deploy' | 'research' | 'build' | 'test';

// Phase 9: Agent role and badge types
export type AgentRole = 'lead' | 'specialist' | 'intern';
export type AgentBadge = 'LEAD' | 'SPC' | 'INT';

export interface NodeRow {
  node_id: string;
  tailscale_ip: string;
  gateway_port: number;
  auth_token_hash: string;
  status: NodeStatus;
  agent_count: number;
  ram_usage_mb: number;
  ram_total_mb: number;
  cpu_percent: number;
  last_heartbeat: string; // ISO timestamp
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

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
  max_retries: number;
  retry_count: number;
  created_at: string;
  claimed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
  // Phase 9 extensions
  required_skills?: string[];
  description?: string | null;
  labels?: string[];
  due_date?: string | null;  // ISO timestamp
  comments?: Array<{ author: string; text: string; created_at: string }>;
}

// Helper type for Supabase Realtime postgres_changes events
export type RealtimePayload<T> = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
};
