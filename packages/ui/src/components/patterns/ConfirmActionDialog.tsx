import type { ReactNode } from "react";

import { Button } from "../base";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "../application";

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
  cancelColor?: "secondary" | "tertiary";
  errorStyle?: "text" | "panel";
  ariaLabel?: string;
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
  cancelColor = "secondary",
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
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <div aria-label={ariaLabel}>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>
          <div>{description}</div>
        </ModalBody>
        {nameConfirmationRequired && (
          <div className="mt-2">
            <input
              type="text"
              value={confirmNameValue}
              onChange={(e) => onConfirmNameChange?.(e.target.value)}
              placeholder={
                confirmNamePlaceholder ?? `Type "${confirmName}" to confirm`
              }
              className="flex h-11 w-full rounded-xl border border-secondary bg-secondary px-4 text-sm text-primary placeholder:text-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              autoComplete="off"
            />
          </div>
        )}
        {errorMessage ? (
          errorStyle === "text" ? (
            <p className="text-sm text-error-primary">{errorMessage}</p>
          ) : (
            <div className="rounded-lg border border-secondary bg-secondary p-3 text-xs text-secondary">
              {errorMessage}
            </div>
          )
        ) : null}
        <ModalFooter>
          <Button color={cancelColor} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button color="primary-destructive" onClick={onConfirm} isDisabled={isDisabled}>
            {isConfirming ? confirmingLabel : confirmLabel}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}
