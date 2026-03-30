"use client"

import { type ReactNode, useState, useRef, useCallback } from "react"
import { UploadCloud02 } from "@untitledui/icons"
import { cx } from "../../utils/cx"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileUploadProps {
  /** Accepted file types (e.g. "image/*,.pdf") */
  accept?: string
  /** Whether multiple files can be selected */
  multiple?: boolean
  /** Hint text for accepted formats (e.g. "SVG, PNG, JPG or GIF (max. 800x400px)") */
  formatHint?: string
  /** Called when files are selected or dropped */
  onFilesSelected?: (files: File[]) => void
  /** Whether the component is disabled */
  isDisabled?: boolean
  /** Custom click-to-upload label */
  uploadLabel?: string
  /** Custom drag-and-drop label */
  dragLabel?: string
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FileUpload({
  accept,
  multiple = true,
  formatHint = "SVG, PNG, JPG or GIF (max. 800x400px)",
  onFilesSelected,
  isDisabled = false,
  uploadLabel = "Click to upload",
  dragLabel = "or drag and drop",
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      onFilesSelected?.(Array.from(files))
    },
    [onFilesSelected],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (isDisabled) return
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles, isDisabled],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!isDisabled) setIsDragging(true)
    },
    [isDisabled],
  )

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      onClick={() => !isDisabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isDisabled) {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cx(
        "flex cursor-pointer flex-col items-center gap-3 rounded-xl border bg-primary px-6 py-4 transition",
        isDragging
          ? "border-brand-300 bg-primary_hover ring-4 ring-brand-500/24"
          : "border-secondary hover:border-brand-200 hover:bg-primary_hover",
        isDisabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {/* Featured icon */}
      <div className="flex size-10 items-center justify-center rounded-(--radius-md) border border-primary shadow-xs-skeumorphic">
        <UploadCloud02 className="size-5 text-fg-quaternary" />
      </div>

      {/* Text and supporting text */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold text-brand-secondary">
            {uploadLabel}
          </span>
          <span className="text-sm text-tertiary">
            {dragLabel}
          </span>
        </div>
        {formatHint && (
          <p className="text-center text-xs text-tertiary">
            {formatHint}
          </p>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ""
        }}
        className="hidden"
        disabled={isDisabled}
        tabIndex={-1}
      />
    </div>
  )
}
