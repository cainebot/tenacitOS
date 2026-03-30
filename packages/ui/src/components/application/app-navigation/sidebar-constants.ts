export const SIDEBAR = {
  EXPANDED_WIDTH: 292,
  EXPANDED_WITH_PAD: 296,
  SLIM_WIDTH: 68,
  PANEL_WIDTH: 268,
} as const

export const SIDEBAR_SPRING = {
  type: "spring" as const,
  damping: 28,
  stiffness: 200,
  bounce: 0,
} as const
