"use client";

// Phase 69 — Danger zone tab (Plan 69-02 + Plan 69-04 delete approval).
// Source: Figma sketch 004 variant E. Pattern: Card composition with error border.
//
// BLOCKING-2: consumes `AgentRow` (canonical).
// Wires through to `DeleteAgentModal` (agent-form/delete-agent-modal.tsx)
// via the `onDelete` callback — the modal itself is owned by the page.

import type { FC, ReactNode } from "react";
import { Button, cx } from "@circos/ui";
import { Edit01, Trash01 } from "@untitledui/icons";
import type { AgentRow } from "@/types/supabase";

export const TabDanger: FC<{
  agent: AgentRow;
  onEdit?: () => void;
  onDelete?: () => void;
}> = ({ agent, onEdit, onDelete }) => (
  <div className="flex w-full flex-col gap-5">
    <DangerCard
      title={`Edit ${agent.name}`}
      description="Modifying SOUL or admin fields requires approval. Changes go through the approvals queue."
      action={
        <Button color="secondary-destructive" size="lg" iconLeading={Edit01} onClick={onEdit}>
          Edit agent
        </Button>
      }
    />
    <DangerCard
      title={`Delete ${agent.name}`}
      description="Soft-deletes the agent. Active runs are not killed; bound seats stay reserved 24h before reclamation."
      action={
        <Button color="primary-destructive" size="lg" iconLeading={Trash01} onClick={onDelete}>
          Delete agent
        </Button>
      }
    />
  </div>
);

// pattern: composition, not a UUI atom
const DangerCard: FC<{ title: string; description: string; action: ReactNode }> = ({
  title,
  description,
  action,
}) => (
  <article
    className={cx(
      "flex items-center gap-8 rounded-xl border border-error bg-error-primary/5 px-8 py-6",
    )}
  >
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <h3 className="text-lg font-semibold text-error-primary [font-family:var(--font-display)]">
        {title}
      </h3>
      <p className="text-base text-secondary">{description}</p>
    </div>
    {action}
  </article>
);
