"use client";

// Phase 69 Plan 11 — PauseAgentModal.
//
// Operator-facing prompt to supply a reason (≤ 280 chars) before calling
// POST /api/agents/[id]/pause. Reason is optional — empty is accepted.
// Per Assumption A1 this is NOT an approval dialog; it is a direct control
// action.

import { useEffect, useState, type FC } from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextArea,
} from "@circos/ui";
import type { AgentRow } from "@/types/supabase";

export interface PauseAgentModalProps {
  agent: AgentRow | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string | undefined) => Promise<void> | void;
  submitting?: boolean;
  errorMessage?: string | null;
}

const REASON_MAX = 280;

export const PauseAgentModal: FC<PauseAgentModalProps> = ({
  agent,
  isOpen,
  onOpenChange,
  onConfirm,
  submitting = false,
  errorMessage = null,
}) => {
  const [reason, setReason] = useState<string>("");

  // ME-10 — reset reason whenever the controlled `isOpen` flips to false.
  // React Aria only fires onOpenChange on user-driven close (overlay click
  // / Esc), not on a programmatic `setPauseOpen(false)` from the parent's
  // onConfirm. Without this reset, pausing agent A and then opening the
  // modal for agent B surfaced A's reason pre-filled.
  //
  // The effect runs once per `isOpen` transition; the setReason("") is a
  // no-op when `reason` is already empty, so react-compiler's
  // set-state-during-effect rule does not cycle. Disable the rule
  // locally because the dependency graph is truly minimal (prop in,
  // state out, no derived value).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isOpen) setReason("");
  }, [isOpen]);

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) setReason("");
  };

  const handleConfirm = async () => {
    if (!agent) return;
    const trimmed = reason.trim();
    await onConfirm(trimmed.length > 0 ? trimmed : undefined);
  };

  if (!agent) return null;

  const overLimit = reason.length > REASON_MAX;

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange} size="md">
      <ModalHeader>Pause {agent.name}</ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-secondary">
            Pausing keeps <span className="font-semibold text-primary">{agent.name}</span>{" "}
            from picking up new runs. In-flight work continues until it finishes;
            the operator is notified if any runs are queued or running.
          </p>
          <TextArea
            label="Reason (optional)"
            placeholder="e.g. Maintenance window"
            value={reason}
            onChange={(v) => setReason(typeof v === "string" ? v : "")}
            rows={3}
            isDisabled={submitting}
            maxLength={REASON_MAX}
            hint={`${reason.length}/${REASON_MAX}`}
            isInvalid={overLimit}
          />
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
          color="primary"
          size="sm"
          onClick={handleConfirm}
          isDisabled={submitting || overLimit}
          isLoading={submitting}
          showTextWhileLoading
        >
          Pause
        </Button>
      </ModalFooter>
    </Modal>
  );
};
