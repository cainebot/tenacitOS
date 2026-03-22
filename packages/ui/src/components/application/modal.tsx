"use client"

import {
  DialogTrigger,
  Modal as AriaModal,
  ModalOverlay,
  Dialog,
} from "react-aria-components"
import { type ReactNode } from "react"
import { cx } from "../../utils/cx"

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
} as const

export type ModalSize = keyof typeof sizeStyles

export interface ModalProps {
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  children: ReactNode
  size?: ModalSize
  isDismissable?: boolean
  trigger?: ReactNode
  className?: string
}

export function Modal({
  isOpen,
  onOpenChange,
  children,
  size = "md",
  isDismissable = true,
  trigger,
  className,
}: ModalProps) {
  return (
    <DialogTrigger>
      {trigger}
      <ModalOverlay
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isDismissable={isDismissable}
        className={cx(
          "fixed inset-0 z-50 flex items-center justify-center",
          "bg-black/60 backdrop-blur-sm",
          "entering:animate-in entering:fade-in entering:duration-200",
          "exiting:animate-out exiting:fade-out exiting:duration-150"
        )}
      >
        <AriaModal
          className={cx(
            "w-full",
            sizeStyles[size],
            "entering:animate-in entering:zoom-in-95 entering:duration-200",
            "exiting:animate-out exiting:zoom-out-95 exiting:duration-150"
          )}
        >
          <Dialog
            className={cx(
              "rounded-lg border border-secondary bg-secondary p-6 shadow-2xl outline-none",
              "text-primary",
              className
            )}
          >
            {children}
          </Dialog>
        </AriaModal>
      </ModalOverlay>
    </DialogTrigger>
  )
}

export interface ModalHeaderProps {
  children: ReactNode
  className?: string
}

export function ModalHeader({ children, className }: ModalHeaderProps) {
  return (
    <div className={cx("mb-4", className)}>
      <h2 className="text-lg font-semibold text-primary">{children}</h2>
    </div>
  )
}

export interface ModalBodyProps {
  children: ReactNode
  className?: string
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return (
    <div className={cx("text-sm text-tertiary", className)}>{children}</div>
  )
}

export interface ModalFooterProps {
  children: ReactNode
  className?: string
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cx("mt-6 flex items-center justify-end gap-3", className)}
    >
      {children}
    </div>
  )
}
