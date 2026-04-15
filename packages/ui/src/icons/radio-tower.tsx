import * as React from "react"

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  color?: string
}

const RadioTower: React.FC<IconProps> = ({
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
    React.createElement("path", { d: "M4.9 16.1C1 12.2 1 5.8 4.9 1.9" }),
    React.createElement("path", {
      d: "M7.8 4.7a6.14 6.14 0 0 0-.8 7.5",
    }),
    React.createElement("circle", { cx: "12", cy: "9", r: "2" }),
    React.createElement("path", {
      d: "M16.2 4.8c2 2 2.26 5.11.8 7.47",
    }),
    React.createElement("path", {
      d: "M19.1 1.9a9.96 9.96 0 0 1 0 14.1",
    }),
    React.createElement("path", { d: "M9.5 18h5" }),
    React.createElement("path", { d: "m8 22 4-11 4 11" }),
  )

RadioTower.displayName = "RadioTower"

export { RadioTower }
