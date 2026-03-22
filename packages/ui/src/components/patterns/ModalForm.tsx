"use client"

import { type ReactNode } from "react"
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  type ModalSize,
} from "../application/modal"
import { Button } from "../base/button"

export interface ModalFormProps {
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  title: string
  description?: string
  size?: ModalSize
  trigger?: ReactNode
  children: ReactNode
  onSubmit?: () => void
  onCancel?: () => void
  submitLabel?: string
  cancelLabel?: string
  isSubmitting?: boolean
  isDismissable?: boolean
  submitColor?: "primary" | "primary-destructive"
  className?: string
}

export function ModalForm({
  isOpen,
  onOpenChange,
  title,
  description,
  size = "md",
  trigger,
  children,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isSubmitting = false,
  isDismissable = true,
  submitColor = "primary",
  className,
}: ModalFormProps) {
  const handleCancel = () => {
    onCancel?.()
    onOpenChange?.(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size={size}
      trigger={trigger}
      isDismissable={isDismissable}
      className={className}
    >
      <ModalHeader>
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-secondary">{description}</p>
        )}
      </ModalHeader>

      <ModalBody>{children}</ModalBody>

      <ModalFooter>
        <Button color="secondary" onClick={handleCancel}>
          {cancelLabel}
        </Button>
        <Button
          color={submitColor}
          onClick={onSubmit}
          isLoading={isSubmitting}
        >
          {submitLabel}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
