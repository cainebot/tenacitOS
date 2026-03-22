"use client"

import { Button as AriaButton } from "react-aria-components"
import { cx } from "../../utils/cx"

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  siblingCount?: number
  className?: string
}

function getPageNumbers(
  currentPage: number,
  totalPages: number,
  siblingCount: number
): (number | "ellipsis")[] {
  const totalNumbers = siblingCount * 2 + 3
  const totalBlocks = totalNumbers + 2

  if (totalPages <= totalBlocks) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)

  const showLeftEllipsis = leftSiblingIndex > 2
  const showRightEllipsis = rightSiblingIndex < totalPages - 1

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftCount = 3 + 2 * siblingCount
    const leftRange = Array.from({ length: leftCount }, (_, i) => i + 1)
    return [...leftRange, "ellipsis", totalPages]
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightCount = 3 + 2 * siblingCount
    const rightRange = Array.from(
      { length: rightCount },
      (_, i) => totalPages - rightCount + i + 1
    )
    return [1, "ellipsis", ...rightRange]
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i
  )
  return [1, "ellipsis", ...middleRange, "ellipsis", totalPages]
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className,
}: PaginationProps) {
  const pages = getPageNumbers(currentPage, totalPages, siblingCount)

  if (totalPages <= 1) return null

  return (
    <nav
      aria-label="Pagination"
      className={cx("flex items-center gap-1", className)}
    >
      <AriaButton
        isDisabled={currentPage <= 1}
        onPress={() => onPageChange(currentPage - 1)}
        className={cx(
          "inline-flex h-8 w-8 items-center justify-center rounded-sm text-sm transition-colors",
          "text-quaternary hover:bg-tertiary hover:text-primary",
          "disabled:opacity-30 disabled:cursor-not-allowed",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        )}
        aria-label="Previous page"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </AriaButton>

      {pages.map((page, index) =>
        page === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="inline-flex h-8 w-8 items-center justify-center text-sm text-quaternary"
          >
            ...
          </span>
        ) : (
          <AriaButton
            key={page}
            onPress={() => onPageChange(page)}
            className={cx(
              "inline-flex h-8 min-w-8 items-center justify-center rounded-sm px-2 text-sm transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
              page === currentPage
                ? "bg-brand-600 text-white"
                : "text-quaternary hover:bg-tertiary hover:text-primary"
            )}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </AriaButton>
        )
      )}

      <AriaButton
        isDisabled={currentPage >= totalPages}
        onPress={() => onPageChange(currentPage + 1)}
        className={cx(
          "inline-flex h-8 w-8 items-center justify-center rounded-sm text-sm transition-colors",
          "text-quaternary hover:bg-tertiary hover:text-primary",
          "disabled:opacity-30 disabled:cursor-not-allowed",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        )}
        aria-label="Next page"
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
            d="M9 5l7 7-7 7"
          />
        </svg>
      </AriaButton>
    </nav>
  )
}
