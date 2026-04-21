"use client"

import { Skeleton, cx } from "@circos/ui"

/**
 * Skeleton loader that mirrors the exact layout of TaskDetailPanel.
 * Matches every section's padding, spacing, and visual proportions.
 */
export function TaskDetailPanelSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cx("flex h-full flex-col overflow-y-auto bg-primary", className)}
    >
      {/* A · Top bar */}
      <div className="flex items-center justify-end gap-1 px-5 py-2">
        <Skeleton variant="rect" className="size-8 rounded-md" />
        <Skeleton variant="rect" className="size-8 rounded-md" />
        <Skeleton variant="rect" className="size-8 rounded-md" />
        <Skeleton variant="rect" className="size-8 rounded-md" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-0 px-5">
          {/* B · Breadcrumb + Title + Status */}
          <div className="flex flex-col gap-3 pb-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5">
              <Skeleton variant="text" className="h-3.5 w-20" />
              <span className="text-tertiary">/</span>
              <Skeleton variant="text" className="h-3.5 w-16" />
            </div>
            {/* Title */}
            <Skeleton variant="text" className="h-7 w-3/4" />
            {/* Status badge + subtask button */}
            <div className="flex items-center gap-2">
              <Skeleton variant="rect" className="h-8 w-28 rounded-full" />
              <Skeleton variant="rect" className="size-8 rounded-md" />
            </div>
          </div>

          {/* C · Description */}
          <div className="py-4">
            <Skeleton variant="text" className="mb-3 h-4 w-24" />
            {/* Toolbar */}
            <div className="mb-2 flex items-center gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} variant="rect" className="size-7 rounded-md" />
              ))}
            </div>
            {/* Editor area */}
            <Skeleton variant="rect" className="h-28 w-full rounded-lg" />
            <Skeleton variant="text" className="mt-2 h-3 w-36" />
          </div>

          <div className="h-px bg-border-secondary" />

          {/* D · Details */}
          <div className="py-4">
            <div className="mb-2 flex items-center gap-2">
              <Skeleton variant="rect" className="size-4 rounded-sm" />
              <Skeleton variant="text" className="h-4 w-16" />
            </div>
            {/* Metadata rows */}
            <div className="flex flex-col">
              <MetadataRowSkeleton label="w-20" value="w-24" />
              <MetadataRowSkeleton label="w-20" value="w-28" />
              <MetadataRowSkeleton label="w-12" value="w-20" />
              <MetadataRowSkeleton label="w-16" value="w-20" />
            </div>
          </div>

          <div className="h-px bg-border-secondary" />

          {/* E · Subtasks */}
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton variant="rect" className="size-4 rounded-sm" />
                <Skeleton variant="text" className="h-4 w-20" />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton variant="rect" className="size-7 rounded-md" />
                <Skeleton variant="rect" className="size-7 rounded-md" />
              </div>
            </div>
          </div>

          <div className="h-px bg-border-secondary" />

          {/* F · Attachments */}
          <div className="py-4">
            <div className="flex items-center justify-between">
              <Skeleton variant="text" className="h-4 w-24" />
              <Skeleton variant="rect" className="size-7 rounded-md" />
            </div>
          </div>

          <div className="h-px bg-border-secondary" />

          {/* G · Comments & Activity */}
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton variant="text" className="h-4 w-24" />
                <Skeleton variant="text" className="h-4 w-20" />
              </div>
              <Skeleton variant="rect" className="size-7 rounded-md" />
            </div>
            {/* Comment rows */}
            <div className="mt-4 flex flex-col gap-3">
              <CommentRowSkeleton />
              <CommentRowSkeleton />
            </div>
            {/* Comment input */}
            <div className="mt-4 flex items-start gap-3">
              <Skeleton variant="circle" size="sm" />
              <Skeleton variant="rect" className="h-10 flex-1 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      <span className="sr-only">Loading card details</span>
    </div>
  )
}

function MetadataRowSkeleton({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center border-b border-secondary/50 py-3">
      <Skeleton variant="text" className={cx("h-3.5", label)} />
      <div className="ml-8 flex items-center gap-2">
        <Skeleton variant="circle" className="size-5" />
        <Skeleton variant="text" className={cx("h-3.5", value)} />
      </div>
    </div>
  )
}

function CommentRowSkeleton() {
  return (
    <div className="flex gap-3 border-b border-secondary/50 py-3">
      <Skeleton variant="circle" size="sm" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <Skeleton variant="text" className="h-3.5 w-24" />
          <Skeleton variant="text" className="h-3 w-16" />
        </div>
        <Skeleton variant="text" className="h-3.5 w-4/5" />
      </div>
    </div>
  )
}
