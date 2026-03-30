import { type FC, type SVGProps } from "react"

interface Props extends SVGProps<SVGSVGElement> {
  color?: string
  size?: number
}

export const PanelLeftClose: FC<Props> = ({ size = 24, color = "currentColor", ...rest }) => (
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
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M9 3v18" />
    <path d="m16 15-3-3 3-3" />
  </svg>
)

PanelLeftClose.displayName = "PanelLeftClose"
