"use client"

import { cx } from "../../utils/cx"

export interface ProgressBarProps {
    value: number
    min?: number
    max?: number
    className?: string
    progressClassName?: string
    valueFormatter?: (value: number, valueInPercentage: number) => string | number
}

export const ProgressBarBase = ({ value, min = 0, max = 100, className, progressClassName }: ProgressBarProps) => {
    const percentage = ((value - min) * 100) / (max - min)

    return (
        <div
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={min}
            aria-valuemax={max}
            className={cx("h-2 w-full overflow-hidden rounded-full bg-quaternary", className)}
        >
            <div
                style={{ transform: `translateX(-${100 - percentage}%)` }}
                className={cx("size-full rounded-full bg-fg-brand-primary transition duration-75 ease-linear", progressClassName)}
            />
        </div>
    )
}

type ProgressBarLabelPosition = "right" | "bottom" | "top-floating" | "bottom-floating"

export interface ProgressIndicatorWithTextProps extends ProgressBarProps {
    labelPosition?: ProgressBarLabelPosition
}

export const ProgressBar = ({ value, min = 0, max = 100, valueFormatter, labelPosition, className, progressClassName }: ProgressIndicatorWithTextProps) => {
    const percentage = ((value - min) * 100) / (max - min)
    const formattedValue = valueFormatter ? valueFormatter(value, percentage) : `${percentage.toFixed(0)}%`

    const baseProgressBar = <ProgressBarBase min={min} max={max} value={value} className={className} progressClassName={progressClassName} />

    switch (labelPosition) {
        case "right":
            return (
                <div className="flex items-center gap-3">
                    {baseProgressBar}
                    <span className="shrink-0 text-sm font-medium text-secondary tabular-nums">{formattedValue}</span>
                </div>
            )
        case "bottom":
            return (
                <div className="flex flex-col items-end gap-2">
                    {baseProgressBar}
                    <span className="text-sm font-medium text-secondary tabular-nums">{formattedValue}</span>
                </div>
            )
        case "top-floating":
            return (
                <div className="relative flex flex-col items-end gap-2">
                    {baseProgressBar}
                    <div
                        style={{ left: `${percentage}%` }}
                        className="absolute -top-2 -translate-x-1/2 -translate-y-full rounded-lg bg-primary_alt px-3 py-2 shadow-lg ring-1 ring-secondary_alt"
                    >
                        <div className="text-xs font-semibold text-secondary tabular-nums">{formattedValue}</div>
                    </div>
                </div>
            )
        case "bottom-floating":
            return (
                <div className="relative flex flex-col items-end gap-2">
                    {baseProgressBar}
                    <div
                        style={{ left: `${percentage}%` }}
                        className="absolute -bottom-2 -translate-x-1/2 translate-y-full rounded-lg bg-primary_alt px-3 py-2 shadow-lg ring-1 ring-secondary_alt"
                    >
                        <div className="text-xs font-semibold text-secondary">{formattedValue}</div>
                    </div>
                </div>
            )
        default:
            return baseProgressBar
    }
}
