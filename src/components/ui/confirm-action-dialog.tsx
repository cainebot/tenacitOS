import type { ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  onConfirm: () => void;
  isConfirming: boolean;
  errorMessage?: string | null;
  confirmLabel?: string;
  confirmingLabel?: string;
  cancelLabel?: string;
  cancelVariant?: NonNullable<ButtonProps["variant"]>;
  errorStyle?: "text" | "panel";
  ariaLabel?: string;
  /**
   * When set, renders a name-confirmation input field.
   * The confirm button is disabled until the user types the exact confirmName.
   * Use for high-stakes deletions like board deletion.
   */
  confirmName?: string;
  confirmNameValue?: string;
  onConfirmNameChange?: (value: string) => void;
  confirmNamePlaceholder?: string;
};

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isConfirming,
  errorMessage,
  confirmLabel = "Delete",
  confirmingLabel = "Deleting…",
  cancelLabel = "Cancel",
  cancelVariant = "outline",
  errorStyle = "panel",
  ariaLabel,
  confirmName,
  confirmNameValue = "",
  onConfirmNameChange,
  confirmNamePlaceholder,
}: ConfirmActionDialogProps) {
  const nameConfirmationRequired = !!confirmName;
  const nameMatchesRequired = nameConfirmationRequired
    ? confirmNameValue === confirmName
    : true;
  const isDisabled = isConfirming || !nameMatchesRequired;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label={ariaLabel}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {nameConfirmationRequired && (
          <div className="mt-2">
            <input
              type="text"
              value={confirmNameValue}
              onChange={(e) => onConfirmNameChange?.(e.target.value)}
              placeholder={confirmNamePlaceholder ?? `Type "${confirmName}" to confirm`}
              className="flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              autoComplete="off"
            />
          </div>
        )}
        {errorMessage ? (
          errorStyle === "text" ? (
            <p className="text-sm text-[var(--negative)]">{errorMessage}</p>
          ) : (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs text-[var(--text-secondary)]">
              {errorMessage}
            </div>
          )
        ) : null}
        <DialogFooter>
          <Button variant={cancelVariant} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isDisabled}>
            {isConfirming ? confirmingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
