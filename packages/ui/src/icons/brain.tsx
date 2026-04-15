import * as React from "react"

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  color?: string
}

const Brain: React.FC<IconProps> = ({
  size = 24,
  color = "currentColor",
  ...props
}) =>
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
    React.createElement("path", { d: "M12 18V5" }),
    React.createElement("path", {
      d: "M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",
    }),
    React.createElement("path", {
      d: "M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",
    }),
    React.createElement("path", {
      d: "M17.997 5.125a4 4 0 0 1 2.526 5.77",
    }),
    React.createElement("path", { d: "M18 18a4 4 0 0 0 2-7.464" }),
    React.createElement("path", {
      d: "M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",
    }),
    React.createElement("path", { d: "M6 18a4 4 0 0 1-2-7.464" }),
    React.createElement("path", {
      d: "M6.003 5.125a4 4 0 0 0-2.526 5.77",
    }),
  )

Brain.displayName = "Brain"

export { Brain }
