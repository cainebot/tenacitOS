import { type FC, type SVGProps } from "react"

interface Props extends SVGProps<SVGSVGElement> {
  color?: string
  size?: number
}

export const ChartNoAxesGantt: FC<Props> = ({ size = 24, color = "currentColor", ...rest }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    stroke={color}
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    <path d="M6 5h12" />
    <path d="M4 12h10" />
    <path d="M12 19h8" />
  </svg>
)

ChartNoAxesGantt.displayName = "ChartNoAxesGantt"
