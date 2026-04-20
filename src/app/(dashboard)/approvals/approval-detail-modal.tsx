"use client";

// Phase 68 Plan 06 Task 4 — Approval detail modal.
//
// Shows the full approval payload (JSON, rendered as text inside <pre>
// to neutralise T-68-06-XSS — never via dangerouslySetInnerHTML), plus
// a decision_note textarea and the three terminal actions:
//   - approve
//   - reject
//   - request_revision (sets status back to revision_requested)
//
// For high-impact types (delete_agent, send_external_message with an
// external recipient) the user must type a confirmation string that
// matches the target (agent_id or recipient) before Approve is enabled.
// This is the T-68-06-UI-TRUST mitigation.

import { useMemo, useState } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Badge,
  cx,
} from "@circos/ui";
import type {
  ApprovalAction,
  ApprovalRow,
  ApprovalType,
} from "@/types/approval";
import { ApprovalPayloadRenderer } from "@/components/approvals/approval-payload-renderer";

interface ApprovalDetailModalProps {
  approval: ApprovalRow | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    approval: ApprovalRow,
    action: ApprovalAction,
    decisionNote: string,
  ) => Promise<void>;
  submitting: boolean;
}

const TYPE_BADGE_COLOR: Record<ApprovalType, Parameters<typeof Badge>[0]["color"]> = {
  create_agent: "brand",
  delete_agent: "error",
  delete_agents_bulk: "error",
  update_agent: "warning",
  send_external_message: "indigo",
  // Phase 69 — 4 new types land on migration 039 §7.
  update_identity_file_content: "warning",
  create_user_instruction: "brand",
  update_user_instruction_content: "warning",
  delete_user_instruction: "error",
};

function typeLabel(t: ApprovalType): string {
  switch (t) {
    case "create_agent": return "Create agent";
    case "delete_agent": return "Delete agent";
    case "delete_agents_bulk": return "Delete agents (bulk)";
    case "update_agent": return "Update agent";
    case "send_external_message": return "Send external message";
    case "update_identity_file_content": return "Update identity file";
    case "create_user_instruction": return "Create user instruction";
    case "update_user_instruction_content": return "Update user instruction";
    case "delete_user_instruction": return "Delete user instruction";
    default: {
      // Exhaustiveness guard — compile-time failure if a new ApprovalType
      // lands without a matching label.
      const _exhaustive: never = t;
      return _exhaustive;
    }
  }
}

/**
 * For T-68-06-UI-TRUST: a destructive/external approval requires the
 * user to type the target id exactly before Approve is enabled.
 * Returns null when no confirmation is required.
 */
function requiredConfirmation(approval: ApprovalRow): string | null {
  const payload = approval.payload ?? {};
  if (approval.type === "delete_agent") {
    const id = (payload as { agent_id?: string }).agent_id;
    return typeof id === "string" && id.length > 0 ? id : null;
  }
  if (approval.type === "delete_agents_bulk") {
    const ids = (payload as { agent_ids?: unknown }).agent_ids;
    if (Array.isArray(ids) && ids.length > 0) {
      return `DELETE ${ids.length}`;
    }
    return null;
  }
  if (approval.type === "send_external_message") {
    // HI-04 (POST-EXEC): the previous `recipient.includes('@')` heuristic
    // only caught email. SMS / LinkedIn / Slack / other fell through
    // without confirmation — one miss-click on Approve would dispatch an
    // outbound message through the most reputation-expensive channels
    // with no safety net. V3 §3.4 Golden Rule requires confirmation for
    // ALL external channels.
    const recipient = (payload as { recipient?: string; to?: string }).recipient
      ?? (payload as { to?: string }).to;
    if (typeof recipient === "string" && recipient.length > 0) {
      return recipient;
    }
    return null;
  }
  return null;
}

/**
 * HI-04 — channel-aware prompt copy. The recipient is always the
 * confirmation target; this helper picks the human-facing noun so the
 * modal reads naturally (e.g. "type the phone number" for SMS).
 */
function confirmationNoun(approval: ApprovalRow): string {
  if (approval.type === "delete_agent") return "the agent id";
  if (approval.type === "delete_agents_bulk") return "the literal string";
  if (approval.type === "send_external_message") {
    const channel = (approval.payload as { channel?: string } | null)?.channel;
    switch (channel) {
      case "email":
        return "the email address";
      case "sms":
        return "the phone number";
      case "linkedin":
        return "the LinkedIn URL";
      case "slack_external":
        return "the Slack id";
      case "other":
        return "the recipient";
      default:
        return "the recipient";
    }
  }
  return "the confirmation string";
}

export function ApprovalDetailModal({
  approval,
  isOpen,
  onOpenChange,
  onSubmit,
  submitting,
}: ApprovalDetailModalProps) {
  const [decisionNote, setDecisionNote] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const confirmation = useMemo(
    () => (approval ? requiredConfirmation(approval) : null),
    [approval],
  );
  const confirmNoun = useMemo(
    () => (approval ? confirmationNoun(approval) : "the confirmation string"),
    [approval],
  );

  const approveDisabled =
    submitting || (confirmation !== null && confirmText !== confirmation);

  if (!approval) return null;

  const handle = async (action: ApprovalAction) => {
    await onSubmit(approval, action, decisionNote);
    setDecisionNote("");
    setConfirmText("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          setDecisionNote("");
          setConfirmText("");
        }
      }}
      size="xl"
    >
      <ModalHeader>
        <div className="flex items-center gap-3">
          <span>Approval detail</span>
          <Badge
            color={TYPE_BADGE_COLOR[approval.type]}
            type="pill-color"
            size="sm"
          >
            {typeLabel(approval.type)}
          </Badge>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-quaternary">
              Requested by
            </span>
            <span className="text-sm text-primary">
              {approval.requested_by_agent_id ?? "Human"}
            </span>
          </div>

          {approval.reason && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-quaternary">Reason</span>
              <p className="text-sm text-secondary">{approval.reason}</p>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-quaternary">Payload</span>
            {/* Phase 69 Plan 06 — per-type structured renderer replaces
                the raw JSON <pre>. Forward-compat: unknown/future types
                fall back to a JSON <pre> inside the dispatcher. */}
            <ApprovalPayloadRenderer approval={approval} />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="decision_note"
              className="text-xs font-medium text-quaternary"
            >
              Decision note (visible al agente en el audit trail)
            </label>
            <textarea
              id="decision_note"
              rows={3}
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder="Opcional. Explica brevemente la decisión."
              className={cx(
                "w-full rounded-md border border-primary bg-primary p-2",
                "text-sm text-primary placeholder:text-placeholder",
                "focus:border-brand focus:outline-none",
              )}
            />
          </div>

          {confirmation !== null && (
            <div className="flex flex-col gap-1 rounded-md border border-error_subtle bg-tertiary p-3">
              <span className="text-xs font-medium text-error-primary">
                Confirmación requerida
              </span>
              <p className="text-xs text-secondary">
                Escribe exactamente {confirmNoun}{" "}
                <code className="font-mono text-primary">{confirmation}</code>{" "}
                para habilitar Approve.
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className={cx(
                  "mt-1 w-full rounded-md border border-primary bg-primary p-2",
                  "text-sm text-primary placeholder:text-placeholder",
                  "focus:border-brand focus:outline-none",
                )}
                placeholder={confirmation}
                autoComplete="off"
              />
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          color="tertiary"
          size="sm"
          onClick={() => onOpenChange(false)}
          isDisabled={submitting}
        >
          Cancel
        </Button>
        <Button
          color="secondary"
          size="sm"
          onClick={() => handle("request_revision")}
          isDisabled={submitting}
        >
          Request revision
        </Button>
        <Button
          color="primary-destructive"
          size="sm"
          onClick={() => handle("reject")}
          isDisabled={submitting}
          isLoading={submitting}
          showTextWhileLoading
        >
          Reject
        </Button>
        <Button
          color="primary"
          size="sm"
          onClick={() => handle("approve")}
          isDisabled={approveDisabled}
          isLoading={submitting}
          showTextWhileLoading
        >
          Approve
        </Button>
      </ModalFooter>
    </Modal>
  );
}
