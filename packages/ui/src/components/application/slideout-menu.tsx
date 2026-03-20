"use client"

import {
  DialogTrigger,
  Modal,
  ModalOverlay,
  Dialog,
} from "react-aria-components"
import { type ReactNode } from "react"
import { cx } from "../../utils/cx"

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
} as const

export type SlideoutSize = keyof typeof sizeStyles

export interface SlideoutMenuProps {
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  title?: string
  children: ReactNode
  size?: SlideoutSize
  trigger?: ReactNode
  className?: string
}

export function SlideoutMenu({
  isOpen,
  onOpenChange,
  title,
  children,
  size = "md",
  trigger,
  className,
}: SlideoutMenuProps) {
  return (
    <DialogTrigger>
      {trigger}
      <ModalOverlay
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isDismissable
        className={cx(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
          "entering:animate-in entering:fade-in entering:duration-200",
          "exiting:animate-out exiting:fade-out exiting:duration-150"
        )}
      >
        <Modal
          className={cx(
            "fixed inset-y-0 right-0 w-full",
            sizeStyles[size],
            "entering:animate-in entering:slide-in-from-right entering:duration-300 entering:ease-out",
            "exiting:animate-out exiting:slide-out-to-right exiting:duration-200 exiting:ease-in"
          )}
        >
          <Dialog
            className={cx(
              "flex h-full flex-col border-l border-white/10 bg-[#1C1C1E] outline-none",
              "text-white",
              className
            )}
          >
            {({ close }) => (
              <>
                {title && (
                  <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                    <h2 className="text-lg font-semibold text-white">
                      {title}
                    </h2>
                    <button
                      onClick={close}
                      className={cx(
                        "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                        "text-white/50 hover:bg-white/10 hover:text-white",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B30]"
                      )}
                      aria-label="Close"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-6">{children}</div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  )
}
