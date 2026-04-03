// ============================================================
// Agent Types for v1.9 Agents Page UI
// Types specific to agent detail, identity, permissions,
// creation flow, and LLM chat. Supabase row types live in
// types/supabase.ts -- do not duplicate here.
// ============================================================

/**
 * Identity file name type -- the 7 files that define an agent's identity.
 */
export type IdentityFileType =
  | 'SOUL.md'
  | 'AGENTS.md'
  | 'USER.md'
  | 'IDENTITY.md'
  | 'TOOLS.md'
  | 'HEARTBEAT.md'
  | 'MEMORY.md'

/**
 * Const array of all identity file types for runtime validation.
 */
export const IDENTITY_FILE_TYPES: IdentityFileType[] = [
  'SOUL.md',
  'AGENTS.md',
  'USER.md',
  'IDENTITY.md',
  'TOOLS.md',
  'HEARTBEAT.md',
  'MEMORY.md',
]

/**
 * Response shape from identity API (GET /api/agents/[id]/identity/[fileType]).
 */
export interface IdentityFile {
  fileType: IdentityFileType
  content: string
  updatedAt: string | null
}

/**
 * Agent permissions stored in soul_config.permissions JSONB.
 * No DB migration required -- this is a structured slice of soul_config.
 */
export interface AgentPermissions {
  execution_role: 'conservative' | 'collaborative' | 'autonomous'
  command_mode: 'off' | 'restricted' | 'full'
  web_access: boolean
  file_tools: 'none' | 'read' | 'read_write'
  sandbox: 'none' | 'workspace' | 'full'
  allowed_tools: string[]
  denied_tools: string[]
}

/**
 * Chat message with inline component data.
 * Used by useLLMChat hook and agent creation flow.
 */
export interface LLMMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: Date
  data?: Record<string, unknown> // inline component values (radio, dropdown, toggle selections)
}

/**
 * Tracks generation progress per identity file during agent creation flow.
 */
export interface CreationDocStatus {
  fileType: IdentityFileType
  status: 'pending' | 'generating' | 'done'
  content: string
}

/**
 * Shape of entries in public/characters.json.
 * Static file for v1.9; DB table deferred until sprites land.
 */
export interface CharacterDef {
  id: string
  name: string
  emoji: string
  description: string
}

/**
 * Configuration for useLLMChat hook.
 */
export interface LLMChatConfig {
  api: string // e.g. '/api/llm/agent-creation/chat'
  systemPrompt?: string
  initialMessages?: LLMMessage[]
  onFinish?: (message: LLMMessage) => void
  onToken?: (token: string) => void
}
