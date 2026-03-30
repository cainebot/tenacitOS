"use client"

import { cx } from "../../utils/cx"

export interface FileTypeIconProps {
  /** File extension label (e.g. "PDF", "DOC", "PNG") */
  fileType: string
  /** Tailwind bg color class for the label. Defaults to bg-error-600 (red, for PDF) */
  color?: string
  /** sm = 32px, md = 40px */
  size?: "sm" | "md"
  className?: string
}

const sizes = {
  sm: { root: "size-8", label: "text-[8px] px-0.5 py-px" },
  md: { root: "size-10", label: "text-[10px] px-[3px] py-0.5" },
}

export function FileTypeIcon({
  fileType,
  color = "bg-error-600",
  size = "md",
  className,
}: FileTypeIconProps) {
  return (
    <div className={cx("relative shrink-0", sizes[size].root, className)}>
      {/* Document page shape */}
      <svg
        className="size-full text-tertiary"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M7 4C7 2.89543 7.89543 2 9 2H25L33 10V36C33 37.1046 32.1046 38 31 38H9C7.89543 38 7 37.1046 7 36V4Z"
          fill="var(--color-bg-primary)"
          stroke="var(--color-border-secondary)"
          strokeWidth="1"
        />
        <path
          d="M25 2L33 10H27C25.8954 10 25 9.10457 25 8V2Z"
          fill="var(--color-bg-secondary)"
          stroke="var(--color-border-secondary)"
          strokeWidth="1"
        />
      </svg>
      {/* Colored file type label */}
      <span
        className={cx(
          "absolute bottom-[15%] left-[2.5%] rounded-[2px] font-bold text-fg-white leading-none whitespace-nowrap",
          color,
          sizes[size].label,
        )}
      >
        {fileType}
      </span>
    </div>
  )
}
