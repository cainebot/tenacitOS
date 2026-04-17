import type { FC } from "react"
import { cx } from "@circos/ui"
import {
  PROJECT_COVER_COLORS,
  PROJECT_COVER_ICONS,
  type ProjectCoverColorId,
  type ProjectCoverIcon,
} from "./project-cover"

export interface ProjectIconBadgeProps {
  color: ProjectCoverColorId
  icon: ProjectCoverIcon
  /** Pixel size of the badge (square). Defaults to 20 to match sidebar usage. */
  size?: number
  /** Pixel size of the inner icon. Defaults to roughly 60% of badge size. */
  iconSize?: number
  /** Tailwind rounding class. Defaults to 'rounded' (sidebar). Table uses 'rounded-xl'. */
  rounded?: string
  className?: string
}

export const ProjectIconBadge: FC<ProjectIconBadgeProps> = ({
  color,
  icon,
  size = 20,
  iconSize,
  rounded = "rounded",
  className,
}) => {
  const bg = PROJECT_COVER_COLORS.find((c) => c.id === color)?.bg ?? "#b0b0b0"
  const Icon = PROJECT_COVER_ICONS[icon]
  const resolvedIconSize = iconSize ?? Math.round(size * 0.6)
  return (
    <span
      className={cx("inline-flex shrink-0 items-center justify-center", rounded, className)}
      style={{ backgroundColor: bg, width: size, height: size }}
      aria-hidden
    >
      {Icon && <Icon size={resolvedIconSize} color="white" />}
    </span>
  )
}
