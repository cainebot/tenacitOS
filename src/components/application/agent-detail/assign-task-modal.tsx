"use client";

// Phase 69 Plan 11 — AssignTaskModal (minimal stub).
//
// TODO(kanban-integration): the canonical Kanban surface provides a richer
// TaskDetailPanel (TipTap editor, FileUpload, 9 sections — see memory
// `project_task_detail_panel.md`). Wiring that panel for the agent-detail
// page is out of scope for Plan 69-11. This stub is the minimum viable
// form that submits to POST /api/agents/[id]/assign-task with the required
// {workflow_id, state_id, title, card_type?} fields.

import { useState, type FC } from "react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextArea,
} from "@circos/ui";
import type { AgentRow } from "@/types/supabase";
import type { AssignTaskInput } from "@/hooks/useAgentActions";

export interface AssignTaskModalProps {
  agent: AgentRow | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: AssignTaskInput) => Promise<void> | void;
  submitting?: boolean;
  errorMessage?: string | null;
  /** Default workflow/state (passed by parent — Phase 85 Kanban default board). */
  defaultWorkflowId?: string;
  defaultStateId?: string;
}

const TITLE_MAX = 200;

export const AssignTaskModal: FC<AssignTaskModalProps> = ({
  agent,
  isOpen,
  onOpenChange,
  onConfirm,
  submitting = false,
  errorMessage = null,
  defaultWorkflowId = "",
  defaultStateId = "",
}) => {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [workflowId, setWorkflowId] = useState<string>(defaultWorkflowId);
  const [stateId, setStateId] = useState<string>(defaultStateId);

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setTitle("");
      setDescription("");
      setWorkflowId(defaultWorkflowId);
      setStateId(defaultStateId);
    }
  };

  const handleConfirm = async () => {
    if (!agent) return;
    if (title.trim().length === 0) return;
    await onConfirm({
      title: title.trim(),
      description: description.trim().length > 0 ? description.trim() : undefined,
      workflow_id: workflowId,
      state_id: stateId,
      card_type: "task",
    });
  };

  if (!agent) return null;

  const canSubmit =
    title.trim().length > 0 &&
    title.trim().length <= TITLE_MAX &&
    workflowId.length > 0 &&
    stateId.length > 0;

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange} size="md">
      <ModalHeader>Assign task to {agent.name}</ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-secondary">
            Creates a card with{" "}
            <code className="[font-family:var(--font-code)]">assigned_agent_id</code> ={" "}
            <span className="font-semibold text-primary">{agent.name}</span>. The full
            TaskDetailPanel is not yet wired into this surface — fields shown are the
            minimum required by POST /api/agents/[id]/assign-task. (TODO: kanban-integration)
          </p>
          <Input
            label="Title"
            placeholder="Short summary"
            value={title}
            onChange={(v) => setTitle(typeof v === "string" ? v : "")}
            isDisabled={submitting}
            maxLength={TITLE_MAX}
            isRequired
          />
          <TextArea
            label="Description (optional)"
            placeholder="Details, context, acceptance criteria…"
            value={description}
            onChange={(v) => setDescription(typeof v === "string" ? v : "")}
            rows={4}
            isDisabled={submitting}
          />
          <Input
            label="Workflow ID"
            placeholder="UUID"
            value={workflowId}
            onChange={(v) => setWorkflowId(typeof v === "string" ? v : "")}
            isDisabled={submitting}
            hint="Kanban workflow UUID — will be auto-supplied once kanban-integration lands."
            isRequired
          />
          <Input
            label="State ID"
            placeholder="UUID"
            value={stateId}
            onChange={(v) => setStateId(typeof v === "string" ? v : "")}
            isDisabled={submitting}
            hint="Kanban state UUID — defaults to backlog once kanban-integration lands."
            isRequired
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
          isDisabled={!canSubmit || submitting}
          isLoading={submitting}
          showTextWhileLoading
        >
          Create task
        </Button>
      </ModalFooter>
    </Modal>
  );
};
