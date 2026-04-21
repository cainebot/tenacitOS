"use client"

export interface StepIconBaseProps {
  status?: "Incomplete" | "Complete"
  size?: "sm" | "md"
  className?: string
}

const sizes = {
  sm: { wh: 24, center: 12, outerR: 11, dotR: 4, checkPoints: "7.5,12.75 10.5,15.75 16.5,9.75", checkStrokeWidth: 1.5 },
  md: { wh: 32, center: 16, outerR: 15, dotR: 5, checkPoints: "10,17 14,21 22,13", checkStrokeWidth: 2 },
}

export const StepIconBase = ({ status = "Incomplete", size = "md", className }: StepIconBaseProps) => {
  const s = sizes[size]

  if (status === "Complete") {
    return (
      <svg
        width={s.wh}
        height={s.wh}
        viewBox={`0 0 ${s.wh} ${s.wh}`}
        fill="none"
        className={className}
        aria-hidden="true"
      >
        <circle
          cx={s.center}
          cy={s.center}
          r={s.outerR}
          fill="var(--bg-brand-solid)"
        />
        <polyline
          points={s.checkPoints}
          stroke="var(--bg-primary)"
          strokeWidth={s.checkStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    )
  }

  // Incomplete
  return (
    <svg
      width={s.wh}
      height={s.wh}
      viewBox={`0 0 ${s.wh} ${s.wh}`}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle
        cx={s.center}
        cy={s.center}
        r={s.outerR}
        fill="var(--bg-primary)"
        stroke="var(--border-disabled_subtle)"
        strokeWidth={size === "sm" ? 1.5 : 2}
      />
      <circle
        cx={s.center}
        cy={s.center}
        r={s.dotR}
        fill="var(--border-disabled_subtle)"
      />
    </svg>
  )
}
