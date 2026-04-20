// Phase 68 Plan 06 — Approvals UI types.
//
// Mirrors the `approvals` table shape landed by migrations 005 (Phase 62)
// + 025 (Phase 68 Plan 01). The dispatcher (Plan 02) also owns the
// status transitions.
//
// Schema reference: supabase/migrations/20260416_005_cli_connect_approvals.sql
//                 + 20260419_025_cli_connect_phase68_approvals.sql

export type ApprovalType =
  | "create_agent"
  | "delete_agent"
  | "delete_agents_bulk"
  | "update_agent"
  | "send_external_message"
  | "update_identity_file_content"
  | "create_user_instruction"
  | "update_user_instruction_content"
  | "delete_user_instruction";

export type ApprovalStatus =
  | "pending"
  | "revision_requested"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled";

export interface ApprovalRow {
  id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  requested_by_agent_id: string | null;
  requested_by_run_id: string | null;
  target_type: string | null;
  target_id: string | null;
  payload: Record<string, unknown>;
  preview: Record<string, unknown> | null;
  reason: string | null;
  approver_human_id: string | null;
  decision_note: string | null;
  created_at: string;
  resolved_at: string | null;
  expires_at: string;
  updated_at?: string | null;
}

export type ApprovalAction = "approve" | "reject" | "request_revision";

export interface ApprovalPatchBody {
  action: ApprovalAction;
  decision_note?: string;
}

export interface ApprovalPatchResponse {
  ok: boolean;
  approval?: ApprovalRow;
  error?: string;
  message?: string;
}

/** The statuses considered "active" (visible in the queue by default). */
export const ACTIVE_APPROVAL_STATUSES: ApprovalStatus[] = [
  "pending",
  "revision_requested",
];

export function isActiveStatus(status: ApprovalStatus): boolean {
  return ACTIVE_APPROVAL_STATUSES.includes(status);
}
