"use client"

import { type ReactNode } from "react"
import {
  DialogTrigger,
  ModalOverlay,
  Modal as NativeModal,
  Dialog,
} from "../../../../../src/components/application/modals/modal"
import { cx } from "../../utils/cx"

export type ModalSize = "sm" | "md" | "lg" | "xl"

const sizeStyles: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
}

export interface ModalProps {
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  size?: ModalSize
  trigger?: ReactNode
  isDismissable?: boolean
  children: ReactNode
  className?: string
}

export function Modal({
  isOpen,
  onOpenChange,
  size = "md",
  trigger,
  isDismissable = true,
  children,
  className,
}: ModalProps) {
  return (
    <DialogTrigger>
      {trigger}
      <ModalOverlay
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isDismissable={isDismissable}
      >
        <NativeModal className={cx("w-full", sizeStyles[size])}>
          <Dialog>
            <div
              className={cx(
                "rounded-xl border border-secondary bg-secondary text-primary shadow-2xl",
                className
              )}
            >
              {children}
            </div>
          </Dialog>
        </NativeModal>
      </ModalOverlay>
    </DialogTrigger>
  )
}

export function ModalHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("border-b border-tertiary px-6 py-4", className)}>
      <h2 className="text-lg font-semibold text-primary">{children}</h2>
    </div>
  )
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("px-6 py-4", className)}>
      {children}
    </div>
  )
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("flex items-center justify-end gap-3 border-t border-tertiary px-6 py-4", className)}>
      {children}
    </div>
  )
}
