import { type FC, type SVGProps } from "react"

interface Props extends SVGProps<SVGSVGElement> {
  color?: string
  size?: number
}

export const Workflow: FC<Props> = ({ size = 24, color = "currentColor", ...rest }) => (
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
    <rect width="8" height="8" x="3" y="3" rx="2" />
    <path d="M7 11v4a2 2 0 0 0 2 2h4" />
    <rect width="8" height="8" x="13" y="13" rx="2" />
  </svg>
)

Workflow.displayName = "Workflow"
