"use client"

import { type FC, type SVGProps } from "react"
import { Button } from "react-aria-components"
import { Check } from "@untitledui/icons"
import { Popover, cx } from "@circos/ui"
import {
  ListCheck,
  Timeline,
  Calendar,
  Rocket,
  Users,
  ChartLine,
  ChartLineUp,
  Star,
  Bug,
  Lightbulb,
  Globe,
  Gear,
  Bookmark,
  Desktop,
  CircleCheck,
  FileCode,
  Bullhorn,
  Comments,
  Briefcase,
  Newspaper,
  MountainSun,
  PuzzlePiece,
  GaugeHigh,
  Award,
  BasketShopping,
  MapIcon,
  ClipboardList,
  TicketSimple,
  Bolt,
  Flag,
  Heart,
  ShieldHalved,
  Database,
  Cloud,
  Code,
  Cube,
  Building,
  Wrench,
  PaintRoller,
  Flask,
  Compass,
  Trophy,
} from "@/components/icons/fontawesome"

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

export const PROJECT_COVER_COLORS = [
  { id: "gray", bg: "#b0b0b0" },
  { id: "coral", bg: "#f06a6a" },
  { id: "orange", bg: "#ec8d5e" },
  { id: "amber", bg: "#f1bd6c" },
  { id: "yellow", bg: "#f8df72" },
  { id: "lime", bg: "#aecf55" },
  { id: "green", bg: "#5da283" },
  { id: "cyan", bg: "#4ecbc4" },
  { id: "periwinkle", bg: "#9ee7e3" },
  { id: "blue", bg: "#4573d2" },
  { id: "purple", bg: "#aa62e3" },
  { id: "magenta", bg: "#ea4e9d" },
  { id: "rose", bg: "#fc979a" },
  { id: "dark-gray", bg: "#6d6e6f" },
] as const

export type ProjectCoverColorId = (typeof PROJECT_COVER_COLORS)[number]["id"]

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

type IconComponent = FC<SVGProps<SVGSVGElement> & { size?: number; color?: string }>

const ICON_MAP: Record<string, IconComponent> = {
  "list-check": ListCheck,
  timeline: Timeline,
  calendar: Calendar,
  rocket: Rocket,
  users: Users,
  "chart-line": ChartLine,
  "chart-line-up": ChartLineUp,
  star: Star,
  bug: Bug,
  lightbulb: Lightbulb,
  globe: Globe,
  gear: Gear,
  bookmark: Bookmark,
  desktop: Desktop,
  "circle-check": CircleCheck,
  "file-code": FileCode,
  bullhorn: Bullhorn,
  comments: Comments,
  briefcase: Briefcase,
  newspaper: Newspaper,
  "mountain-sun": MountainSun,
  "puzzle-piece": PuzzlePiece,
  "gauge-high": GaugeHigh,
  award: Award,
  "basket-shopping": BasketShopping,
  map: MapIcon,
  "clipboard-list": ClipboardList,
  "ticket-simple": TicketSimple,
  bolt: Bolt,
  flag: Flag,
  heart: Heart,
  "shield-halved": ShieldHalved,
  database: Database,
  cloud: Cloud,
  code: Code,
  cube: Cube,
  building: Building,
  wrench: Wrench,
  "paint-roller": PaintRoller,
  flask: Flask,
  compass: Compass,
  trophy: Trophy,
}

export type ProjectCoverIcon = keyof typeof ICON_MAP

export { ICON_MAP as PROJECT_COVER_ICONS }

// ---------------------------------------------------------------------------
// Sizes
// ---------------------------------------------------------------------------

const sizeClasses = {
  sm: { container: "size-8 rounded-lg", icon: 14 },
  md: { container: "size-10 rounded-xl", icon: 18 },
  lg: { container: "size-14 rounded-2xl", icon: 28 },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface ProjectCoverValue {
  color: ProjectCoverColorId
  icon: ProjectCoverIcon
}

export interface ProjectCoverProps {
  value: ProjectCoverValue
  onChange?: (value: ProjectCoverValue) => void
  size?: "sm" | "md" | "lg"
  className?: string
}

export function ProjectCover({
  value,
  onChange,
  size = "md",
  className,
}: ProjectCoverProps) {
  const currentColor = PROJECT_COVER_COLORS.find((c) => c.id === value.color) ?? PROJECT_COVER_COLORS[0]
  const CurrentIcon = ICON_MAP[value.icon] ?? ListCheck

  const trigger = (
    <Button
      className={cx(
        "flex cursor-pointer items-center justify-center outline-none transition-opacity hover:opacity-80 pressed:scale-95",
        sizeClasses[size].container,
        className,
      )}
      style={{ backgroundColor: currentColor.bg }}
      aria-label="Cambiar portada del proyecto"
    >
      <CurrentIcon size={sizeClasses[size].icon} color="white" />
    </Button>
  )

  return (
    <Popover trigger={trigger} placement="bottom start">
      <div style={{ width: 276 }}>
        {/* Color section */}
        <div className="mb-4">
          <p className="mb-2.5 text-xs font-semibold text-tertiary">Color</p>
          <div className="flex flex-wrap gap-2">
            {PROJECT_COVER_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => onChange?.({ ...value, color: color.id })}
                className={cx(
                  "flex shrink-0 size-8 cursor-pointer items-center justify-center rounded-lg transition-shadow",
                  value.color === color.id
                    ? "ring-2 ring-border-brand ring-offset-2 ring-offset-bg-primary"
                    : "hover:ring-2 hover:ring-border-primary hover:ring-offset-2 hover:ring-offset-bg-primary",
                )}
                style={{ backgroundColor: color.bg }}
                aria-label={color.id}
                aria-pressed={value.color === color.id}
              >
                {value.color === color.id && (
                  <Check size={14} color="white" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Icon section */}
        <div className="border-t border-secondary pt-4">
          <p className="mb-2.5 text-xs font-semibold text-tertiary">Ícono</p>
          <div className="max-h-60 overflow-y-auto" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
            {Object.entries(ICON_MAP).map(([id, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => onChange?.({ ...value, icon: id })}
                className={cx(
                  "flex aspect-square cursor-pointer items-center justify-center rounded-lg transition-colors",
                  "hover:bg-active",
                  value.icon === id
                    ? "bg-active text-primary"
                    : "text-quaternary",
                )}
                aria-label={id}
                aria-pressed={value.icon === id}
              >
                <Icon size={22} color="currentColor" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Popover>
  )
}
