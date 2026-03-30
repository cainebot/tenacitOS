import { type FC, type SVGProps } from "react"

interface Props extends SVGProps<SVGSVGElement> {
  color?: string
  size?: number
}

export const Kanban: FC<Props> = ({ size = 24, color = "currentColor", ...rest }) => (
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
    <path d="M5 3v14" />
    <path d="M12 3v8" />
    <path d="M19 3v18" />
  </svg>
)

Kanban.displayName = "Kanban"
