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
};

function typeLabel(t: ApprovalType): string {
  switch (t) {
    case "create_agent": return "Create agent";
    case "delete_agent": return "Delete agent";
    case "delete_agents_bulk": return "Delete agents (bulk)";
    case "update_agent": return "Update agent";
    case "send_external_message": return "Send external message";
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
    const recipient = (payload as { recipient?: string; to?: string }).recipient
      ?? (payload as { to?: string }).to;
    // Only require typing for an external recipient (heuristic: contains '@').
    if (typeof recipient === "string" && recipient.includes("@")) {
      return recipient;
    }
    return null;
  }
  return null;
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

  const approveDisabled =
    submitting || (confirmation !== null && confirmText !== confirmation);

  if (!approval) return null;

  const payloadJson = JSON.stringify(approval.payload ?? {}, null, 2);

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
            <pre
              className={cx(
                "max-h-80 overflow-auto rounded-md border border-secondary bg-tertiary p-3",
                "font-mono text-xs text-primary whitespace-pre-wrap break-all",
              )}
            >
              {payloadJson}
            </pre>
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
                Escribe exactamente{" "}
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
