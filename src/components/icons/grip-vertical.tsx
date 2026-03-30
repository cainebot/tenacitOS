import * as React from "react"

interface GripVerticalProps extends React.SVGProps<SVGSVGElement> {
  size?: number
  color?: string
}

const GripVertical = ({ size = 24, color = "currentColor", ...props }: GripVerticalProps) =>
  React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      width: size,
      height: size,
      stroke: color,
      strokeWidth: "2",
      fill: "none",
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const,
      "aria-hidden": "true",
      ...props,
    },
    React.createElement("circle", { cx: "9", cy: "12", r: "1" }),
    React.createElement("circle", { cx: "9", cy: "5", r: "1" }),
    React.createElement("circle", { cx: "9", cy: "19", r: "1" }),
    React.createElement("circle", { cx: "15", cy: "12", r: "1" }),
    React.createElement("circle", { cx: "15", cy: "5", r: "1" }),
    React.createElement("circle", { cx: "15", cy: "19", r: "1" }),
  )

GripVertical.displayName = "GripVertical"

export { GripVertical }
