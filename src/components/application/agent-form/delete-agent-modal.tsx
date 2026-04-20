"use client";

// Phase 69 Plan 02 — DeleteAgentModal.
//
// Mirrors `approval-detail-modal.tsx`'s `requiredConfirmation` pattern:
// the "Delete" button stays disabled until the user types the agent's
// slug verbatim. Paired with the server-side POST /api/agents/:id DELETE
// handler in Plan 03 that inserts a `delete_agent` approval.
//
// Intentional trade-off: "Delete" here means "request deletion". The
// agent row is only soft-deleted after an admin approves the request.

import { useMemo, useState, type FC } from "react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  cx,
} from "@circos/ui";
import type { AgentRow } from "@/types/supabase";
import { getAgentSlug } from "@/lib/agent-display";

export interface DeleteAgentModalProps {
  agent: AgentRow | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (agent: AgentRow) => Promise<void> | void;
  submitting?: boolean;
  errorMessage?: string | null;
}

export const DeleteAgentModal: FC<DeleteAgentModalProps> = ({
  agent,
  isOpen,
  onOpenChange,
  onConfirm,
  submitting = false,
  errorMessage = null,
}) => {
  const [confirmText, setConfirmText] = useState<string>("");
  const requiredSlug = useMemo(() => (agent ? getAgentSlug(agent) : ""), [agent]);
  const confirmMatches = agent != null && confirmText === requiredSlug;

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) setConfirmText("");
  };

  const handleConfirm = async () => {
    if (!agent || !confirmMatches) return;
    await onConfirm(agent);
    setConfirmText("");
  };

  if (!agent) return null;

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange} size="md">
      <ModalHeader>Archive {agent.name}</ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-secondary">
            Archiving <span className="font-semibold text-primary">{agent.name}</span>{" "}
            sends a <code className="[font-family:var(--font-code)]">delete_agent</code>{" "}
            approval. The agent stays in the database (soft-delete, <code>deleted_at</code>)
            but is hidden from runtime. Active runs are not killed; bound seats stay
            reserved for 24 h.
          </p>
          <div
            className={cx(
              "flex flex-col gap-2 rounded-lg border border-error bg-error-primary/5 px-4 py-3",
            )}
          >
            <label
              htmlFor="delete-confirm"
              className="text-xs font-medium text-error-primary"
            >
              Type <code className="[font-family:var(--font-code)] text-primary">{requiredSlug}</code> to confirm
            </label>
            <Input
              id="delete-confirm"
              aria-label="Type the agent's slug to confirm"
              value={confirmText}
              onChange={(v) => setConfirmText(typeof v === "string" ? v : "")}
              placeholder={requiredSlug}
              isDisabled={submitting}
              autoComplete="off"
            />
          </div>
          {errorMessage && (
            <p
              role="alert"
              className="rounded-md border border-error bg-error-primary/10 px-3 py-2 text-xs text-error-primary"
            >
              {errorMessage}
            </p>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          color="tertiary"
          size="sm"
          onClick={() => handleOpenChange(false)}
          isDisabled={submitting}
        >
          Cancel
        </Button>
        <Button
          color="primary-destructive"
          size="sm"
          onClick={handleConfirm}
          isDisabled={!confirmMatches || submitting}
          isLoading={submitting}
          showTextWhileLoading
        >
          Delete
        </Button>
      </ModalFooter>
    </Modal>
  );
};
