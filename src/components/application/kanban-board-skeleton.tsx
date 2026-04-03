"use client"

import { Skeleton, cx } from "@circos/ui"

/**
 * Skeleton loader that mirrors the layout of ProjectHeader + KanbanBoardHeader + KanbanBoard columns.
 * Shown while the board data is loading.
 */
export function KanbanBoardSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cx("flex h-full w-full flex-col overflow-hidden", className)}
    >
      {/* ProjectHeader skeleton */}
      <div className="flex flex-col">
        {/* Title bar */}
        <div className="flex items-center justify-between px-6 py-2">
          <div className="flex items-center gap-2.5">
            <Skeleton variant="rect" className="size-8 rounded-lg" />
            <Skeleton variant="text" className="h-7 w-40" />
            <Skeleton variant="rect" className="size-6 rounded-md" />
            <Skeleton variant="rect" className="size-6 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              <Skeleton variant="circle" className="size-8" />
              <Skeleton variant="circle" className="size-8" />
              <Skeleton variant="circle" className="size-8" />
            </div>
            <Skeleton variant="circle" className="size-8" />
          </div>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-secondary">
          <Skeleton variant="rect" className="h-9 w-20 rounded-md" />
          <Skeleton variant="rect" className="h-9 w-16 rounded-md" />
          <Skeleton variant="rect" className="h-9 w-20 rounded-md" />
          <Skeleton variant="rect" className="h-9 w-24 rounded-md" />
        </div>
      </div>

      {/* KanbanBoardHeader skeleton */}
      <div className="flex items-center justify-between border-b border-secondary px-6 py-3">
        <div className="flex items-center gap-2">
          <Skeleton variant="rect" className="h-9 w-24 rounded-lg" />
          <Skeleton variant="rect" className="h-9 w-28 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="rect" className="h-9 w-20 rounded-lg" />
          <Skeleton variant="rect" className="h-9 w-20 rounded-lg" />
          <Skeleton variant="rect" className="h-9 w-48 rounded-lg" />
        </div>
      </div>

      {/* KanbanBoard columns skeleton */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-stretch gap-4 px-6 pb-6 pt-4">
          <ColumnSkeleton cardCount={3} />
          <ColumnSkeleton cardCount={2} />
          <ColumnSkeleton cardCount={4} />
          <ColumnSkeleton cardCount={1} />
        </div>
      </div>

      <span className="sr-only">Loading board</span>
    </div>
  )
}

function ColumnSkeleton({ cardCount }: { cardCount: number }) {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-3">
      {/* Column header */}
      <div className="flex items-center justify-between px-1 pt-2">
        <div className="flex items-center gap-2">
          <Skeleton variant="rect" className="h-5 w-5 rounded" />
          <Skeleton variant="text" className="h-4 w-24" />
          <Skeleton variant="rect" className="h-5 w-6 rounded-full" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton variant="rect" className="size-7 rounded-md" />
          <Skeleton variant="rect" className="size-7 rounded-md" />
        </div>
      </div>
      {/* Cards */}
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: cardCount }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-secondary bg-primary p-3.5">
      <div className="flex flex-col gap-2.5">
        {/* Labels */}
        <div className="flex items-center gap-1.5">
          <Skeleton variant="rect" className="h-5 w-14 rounded-full" />
          <Skeleton variant="rect" className="h-5 w-10 rounded-full" />
        </div>
        {/* Title */}
        <Skeleton variant="text" className="h-4 w-4/5" />
        {/* Footer: assignee + due date */}
        <div className="flex items-center justify-between pt-1">
          <Skeleton variant="circle" className="size-6" />
          <Skeleton variant="text" className="h-3.5 w-16" />
        </div>
      </div>
    </div>
  )
}
