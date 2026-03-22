"use client"

import { type ReactNode } from "react"
import { SlideoutMenu, type SlideoutSize } from "../application/slideout-menu"
import { Button } from "../base/button"
import { cx } from "../../utils/cx"

export interface SidePanelProps {
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  title?: string
  size?: SlideoutSize
  trigger?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function SidePanel({
  isOpen,
  onOpenChange,
  title,
  size = "md",
  trigger,
  children,
  footer,
  className,
}: SidePanelProps) {
  return (
    <SlideoutMenu
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      size={size}
      trigger={trigger}
      className={cx("flex flex-col", className)}
    >
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
      {footer && (
        <div className="flex items-center justify-end gap-3 border-t border-primary/10 px-6 py-4">
          {footer}
        </div>
      )}
    </SlideoutMenu>
  )
}

export interface SidePanelFormProps extends SidePanelProps {
  onSubmit?: () => void
  onCancel?: () => void
  submitLabel?: string
  cancelLabel?: string
  isSubmitting?: boolean
}

export function SidePanelForm({
  onSubmit,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isSubmitting = false,
  onOpenChange,
  ...props
}: SidePanelFormProps) {
  const handleCancel = () => {
    onCancel?.()
    onOpenChange?.(false)
  }

  return (
    <SidePanel
      {...props}
      onOpenChange={onOpenChange}
      footer={
        <>
          <Button color="secondary" onClick={handleCancel}>
            {cancelLabel}
          </Button>
          <Button
            color="primary"
            onClick={onSubmit}
            isLoading={isSubmitting}
          >
            {submitLabel}
          </Button>
        </>
      }
    />
  )
}
