"use client"

/**
 * MessageBubbleSkeleton — Phase 91.2-02 (D-08)
 *
 * 5 variantes layout-accurate para initial-load de conversaciones de chat:
 *   - text-short: 1 línea (h-5)
 *   - text-long:  3 líneas (h-4)
 *   - image:      aspect-ratio dinámico (desde DB o 16/9 fallback; Pattern 2, D-03)
 *   - audio:      h-14 (match AudioBubble: p-3 wrapper + h-8 waveform ≈ 56px total)
 *   - file:       h-[72px] (match FileBubble: p-3 wrapper + icono size-md + 2 líneas de texto)
 *
 * Dimensiones audio/file leídas de control-panel/src/components/application/message.tsx:
 *   - AudioBubble (líneas 602-608): wrapper `p-3`, AudioWaveform `h-8` → altura total
 *     interior ~32px + 24px padding vertical ≈ 56px → usamos h-14 (56px).
 *   - FileBubble (líneas 482-499): wrapper `p-3`, FileTypeIcon size="md" (~size-10 = 40px)
 *     + 2 líneas text-sm (≈ 20px × 2) → altura total ~72px → usamos h-[72px].
 *
 * Este componente compone (nunca reinventa) el primitivo `@circos/ui` Skeleton (D-06).
 * El shimmer viene del primitivo — este archivo no re-implementa pulse animation.
 */

import { Skeleton, cx } from "@circos/ui"

export type BubbleSkeletonVariant =
  | "text-short"
  | "text-long"
  | "image"
  | "audio"
  | "file"

export interface MessageBubbleSkeletonProps {
  variant: BubbleSkeletonVariant
  /** true = aligns right and omits avatar/name header (matches outgoing bubble layout) */
  sent?: boolean
  /** Only for variant="image": "W / H" string; fallback "16 / 9" (D-03) */
  aspectRatio?: string
  className?: string
}

export function MessageBubbleSkeleton({
  variant,
  sent = false,
  aspectRatio,
  className,
}: MessageBubbleSkeletonProps) {
  const align = sent ? "items-end" : "items-start"

  return (
    <div className={cx("flex flex-col gap-1 px-4 py-1", align, className)}>
      {!sent && (
        <div className="flex items-center gap-2">
          <Skeleton variant="circle" size="sm" />
          <Skeleton variant="text" className="h-3 w-24" />
        </div>
      )}

      {variant === "text-short" && (
        <Skeleton variant="rect" className="h-5 w-40 rounded-xl" />
      )}

      {variant === "text-long" && (
        <div className="flex flex-col gap-1">
          <Skeleton variant="text" className="h-4 w-64" />
          <Skeleton variant="text" className="h-4 w-56" />
          <Skeleton variant="text" className="h-4 w-40" />
        </div>
      )}

      {variant === "image" && (
        <div
          className="w-full max-w-[280px] overflow-hidden rounded-xl"
          // Dynamic aspect-ratio cannot be expressed as a Tailwind utility (allowlisted
          // inline style — see message.tsx:824 where the real ImageBubble does the same).
          style={{ aspectRatio: aspectRatio ?? "16 / 9" }}
        >
          <Skeleton variant="rect" className="size-full rounded-xl" />
        </div>
      )}

      {variant === "audio" && (
        <Skeleton variant="rect" className="h-14 w-64 rounded-xl" />
      )}

      {variant === "file" && (
        <Skeleton variant="rect" className="h-[72px] w-64 rounded-xl" />
      )}
    </div>
  )
}
