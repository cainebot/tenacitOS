"use client"

import type { MouseEventHandler, ReactNode } from "react"
import { X as CloseX } from "@untitledui/icons"
import { cx } from "../../utils/cx"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IconComponentType = React.FunctionComponent<{
  className?: string
  strokeWidth?: string | number
}>

export type BadgeSize = "sm" | "md" | "lg"

export type BadgeColor =
  | "gray"
  | "brand"
  | "error"
  | "warning"
  | "success"
  | "gray-blue"
  | "blue-light"
  | "blue"
  | "indigo"
  | "purple"
  | "pink"
  | "orange"

export type BadgeType = "pill-color" | "color" | "modern"

// Legacy variant alias — maps to BadgeColor
export type BadgeVariant =
  | "default"
  | "brand"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "gray"

// ---------------------------------------------------------------------------
// Colour palettes (straight from UUI React official source)
// ---------------------------------------------------------------------------

export const filledColors: Record<
  BadgeColor,
  { root: string; addon: string; addonButton: string }
> = {
  gray: {
    root: "bg-utility-gray-50 text-utility-gray-700 ring-utility-gray-200",
    addon: "text-utility-gray-500",
    addonButton:
      "hover:bg-utility-gray-100 text-utility-gray-400 hover:text-utility-gray-500",
  },
  brand: {
    root: "bg-utility-brand-50 text-utility-brand-700 ring-utility-brand-200",
    addon: "text-utility-brand-500",
    addonButton:
      "hover:bg-utility-brand-100 text-utility-brand-400 hover:text-utility-brand-500",
  },
  error: {
    root: "bg-utility-error-50 text-utility-error-700 ring-utility-error-200",
    addon: "text-utility-error-500",
    addonButton:
      "hover:bg-utility-error-100 text-utility-error-400 hover:text-utility-error-500",
  },
  warning: {
    root: "bg-utility-warning-50 text-utility-warning-700 ring-utility-warning-200",
    addon: "text-utility-warning-500",
    addonButton:
      "hover:bg-utility-warning-100 text-utility-warning-400 hover:text-utility-warning-500",
  },
  success: {
    root: "bg-utility-success-50 text-utility-success-700 ring-utility-success-200",
    addon: "text-utility-success-500",
    addonButton:
      "hover:bg-utility-success-100 text-utility-success-400 hover:text-utility-success-500",
  },
  "gray-blue": {
    root: "bg-utility-gray-blue-50 text-utility-gray-blue-700 ring-utility-gray-blue-200",
    addon: "text-utility-gray-blue-500",
    addonButton:
      "hover:bg-utility-gray-blue-100 text-utility-gray-blue-400 hover:text-utility-gray-blue-500",
  },
  "blue-light": {
    root: "bg-utility-blue-light-50 text-utility-blue-light-700 ring-utility-blue-light-200",
    addon: "text-utility-blue-light-500",
    addonButton:
      "hover:bg-utility-blue-light-100 text-utility-blue-light-400 hover:text-utility-blue-light-500",
  },
  blue: {
    root: "bg-utility-blue-50 text-utility-blue-700 ring-utility-blue-200",
    addon: "text-utility-blue-500",
    addonButton:
      "hover:bg-utility-blue-100 text-utility-blue-400 hover:text-utility-blue-500",
  },
  indigo: {
    root: "bg-utility-indigo-50 text-utility-indigo-700 ring-utility-indigo-200",
    addon: "text-utility-indigo-500",
    addonButton:
      "hover:bg-utility-indigo-100 text-utility-indigo-400 hover:text-utility-indigo-500",
  },
  purple: {
    root: "bg-utility-purple-50 text-utility-purple-700 ring-utility-purple-200",
    addon: "text-utility-purple-500",
    addonButton:
      "hover:bg-utility-purple-100 text-utility-purple-400 hover:text-utility-purple-500",
  },
  pink: {
    root: "bg-utility-pink-50 text-utility-pink-700 ring-utility-pink-200",
    addon: "text-utility-pink-500",
    addonButton:
      "hover:bg-utility-pink-100 text-utility-pink-400 hover:text-utility-pink-500",
  },
  orange: {
    root: "bg-utility-orange-50 text-utility-orange-700 ring-utility-orange-200",
    addon: "text-utility-orange-500",
    addonButton:
      "hover:bg-utility-orange-100 text-utility-orange-400 hover:text-utility-orange-500",
  },
}

// ---------------------------------------------------------------------------
// Type configs
// ---------------------------------------------------------------------------

const addonOnlyColors = Object.fromEntries(
  Object.entries(filledColors).map(([key, value]) => [
    key,
    { root: "", addon: value.addon },
  ]),
) as Record<BadgeColor, { root: string; addon: string }>

const typeConfigs = {
  "pill-color": {
    common:
      "size-max flex items-center whitespace-nowrap rounded-full ring-1 ring-inset",
    styles: filledColors,
  },
  color: {
    common:
      "size-max flex items-center whitespace-nowrap rounded-md ring-1 ring-inset",
    styles: filledColors,
  },
  modern: {
    common:
      "size-max flex items-center whitespace-nowrap rounded-md ring-1 ring-inset shadow-xs",
    styles: {
      gray: {
        root: "bg-primary text-secondary ring-primary",
        addon: "text-gray-500",
        addonButton:
          "hover:bg-utility-gray-100 text-utility-gray-400 hover:text-utility-gray-500",
      },
    } as Record<string, { root: string; addon: string; addonButton?: string }>,
  },
}

const withBadgeTypes = {
  "pill-color": {
    common:
      "size-max flex items-center whitespace-nowrap rounded-full ring-1 ring-inset",
    styles: filledColors,
  },
  color: {
    common:
      "size-max flex items-center whitespace-nowrap rounded-md ring-1 ring-inset",
    styles: filledColors,
  },
  modern: {
    common:
      "size-max flex items-center whitespace-nowrap rounded-md ring-1 ring-inset bg-primary text-secondary ring-primary shadow-xs",
    styles: addonOnlyColors,
  },
}

// ---------------------------------------------------------------------------
// Size configs
// ---------------------------------------------------------------------------

const pillSizes = {
  sm: "py-0.5 px-2 text-xs font-medium",
  md: "py-0.5 px-2.5 text-sm font-medium",
  lg: "py-1 px-3 text-sm font-medium",
}
const badgeSizes = {
  sm: "py-0.5 px-1.5 text-xs font-medium",
  md: "py-0.5 px-2 text-sm font-medium",
  lg: "py-1 px-2.5 text-sm font-medium rounded-lg",
}

const sizesByType = {
  "pill-color": pillSizes,
  color: badgeSizes,
  modern: badgeSizes,
}

// ---------------------------------------------------------------------------
// Legacy variant → color mapping
// ---------------------------------------------------------------------------

const variantToColor: Record<BadgeVariant, BadgeColor> = {
  default: "gray",
  brand: "brand",
  success: "success",
  warning: "warning",
  error: "error",
  info: "blue",
  gray: "gray",
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

export interface BadgeProps {
  /** UUI color (preferred) */
  color?: BadgeColor
  /** Legacy variant prop — mapped to color internally */
  variant?: BadgeVariant
  /** Badge shape type */
  type?: BadgeType
  size?: BadgeSize
  children: ReactNode
  className?: string
}

export function Badge({
  color,
  variant,
  type = "pill-color",
  size = "md",
  children,
  className,
}: BadgeProps) {
  const resolvedColor: BadgeColor =
    color ?? (variant ? variantToColor[variant] : "gray")
  const config = typeConfigs[type]
  const colorStyle = config.styles[resolvedColor] ?? filledColors[resolvedColor]

  return (
    <span
      className={cx(
        config.common,
        sizesByType[type][size],
        colorStyle?.root,
        className,
      )}
    >
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// BadgeWithDot
// ---------------------------------------------------------------------------

export interface BadgeWithDotProps {
  color?: BadgeColor
  variant?: BadgeVariant
  type?: BadgeType
  size?: BadgeSize
  className?: string
  children: ReactNode
}

export function BadgeWithDot({
  color,
  variant,
  type = "pill-color",
  size = "md",
  className,
  children,
}: BadgeWithDotProps) {
  const resolvedColor: BadgeColor =
    color ?? (variant ? variantToColor[variant] : "gray")
  const config = withBadgeTypes[type]
  const colorStyle =
    config.styles[resolvedColor] ?? filledColors[resolvedColor]

  const dotPillSizes = {
    sm: "gap-1 py-0.5 pl-1.5 pr-2 text-xs font-medium",
    md: "gap-1.5 py-0.5 pl-2 pr-2.5 text-sm font-medium",
    lg: "gap-1.5 py-1 pl-2.5 pr-3 text-sm font-medium",
  }
  const dotBadgeSizes = {
    sm: "gap-1 py-0.5 px-1.5 text-xs font-medium",
    md: "gap-1.5 py-0.5 px-2 text-sm font-medium",
    lg: "gap-1.5 py-1 px-2.5 text-sm font-medium rounded-lg",
  }
  const sizes = {
    "pill-color": dotPillSizes,
    color: dotBadgeSizes,
    modern: dotBadgeSizes,
  }

  return (
    <span
      className={cx(
        config.common,
        sizes[type][size],
        colorStyle?.root,
        className,
      )}
    >
      <span
        className={cx(
          "size-1.5 shrink-0 rounded-full",
          colorStyle?.addon
            ? colorStyle.addon.replace("text-", "bg-")
            : "bg-current",
        )}
      />
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// BadgeWithIcon
// ---------------------------------------------------------------------------

export interface BadgeWithIconProps {
  color?: BadgeColor
  variant?: BadgeVariant
  type?: BadgeType
  size?: BadgeSize
  iconLeading?: IconComponentType
  iconTrailing?: IconComponentType
  children: ReactNode
  className?: string
}

export function BadgeWithIcon({
  color,
  variant,
  type = "pill-color",
  size = "md",
  iconLeading: IconLeading,
  iconTrailing: IconTrailing,
  children,
  className,
}: BadgeWithIconProps) {
  const resolvedColor: BadgeColor =
    color ?? (variant ? variantToColor[variant] : "gray")
  const config = withBadgeTypes[type]
  const colorStyle =
    config.styles[resolvedColor] ?? filledColors[resolvedColor]
  const icon = IconLeading ? "leading" : "trailing"

  const iconPillSizes = {
    sm: {
      trailing: "gap-0.5 py-0.5 pl-2 pr-1.5 text-xs font-medium",
      leading: "gap-0.5 py-0.5 pr-2 pl-1.5 text-xs font-medium",
    },
    md: {
      trailing: "gap-1 py-0.5 pl-2.5 pr-2 text-sm font-medium",
      leading: "gap-1 py-0.5 pr-2.5 pl-2 text-sm font-medium",
    },
    lg: {
      trailing: "gap-1 py-1 pl-3 pr-2.5 text-sm font-medium",
      leading: "gap-1 py-1 pr-3 pl-2.5 text-sm font-medium",
    },
  }
  const iconBadgeSizes = {
    sm: {
      trailing: "gap-0.5 py-0.5 pl-2 pr-1.5 text-xs font-medium",
      leading: "gap-0.5 py-0.5 pr-2 pl-1.5 text-xs font-medium",
    },
    md: {
      trailing: "gap-1 py-0.5 pl-2 pr-1.5 text-sm font-medium",
      leading: "gap-1 py-0.5 pr-2 pl-1.5 text-sm font-medium",
    },
    lg: {
      trailing:
        "gap-1 py-1 pl-2.5 pr-2 text-sm font-medium rounded-lg",
      leading:
        "gap-1 py-1 pr-2.5 pl-2 text-sm font-medium rounded-lg",
    },
  }
  const sizes = {
    "pill-color": iconPillSizes,
    color: iconBadgeSizes,
    modern: iconBadgeSizes,
  }

  return (
    <span
      className={cx(
        config.common,
        sizes[type][size][icon],
        colorStyle?.root,
        className,
      )}
    >
      {IconLeading && (
        <IconLeading
          className={cx(colorStyle?.addon, "size-3 stroke-3")}
        />
      )}
      {children}
      {IconTrailing && (
        <IconTrailing
          className={cx(colorStyle?.addon, "size-3 stroke-3")}
        />
      )}
    </span>
  )
}

// ---------------------------------------------------------------------------
// BadgeWithButton
// ---------------------------------------------------------------------------

export interface BadgeWithButtonProps {
  color?: BadgeColor
  variant?: BadgeVariant
  type?: BadgeType
  size?: BadgeSize
  icon?: IconComponentType
  children: ReactNode
  buttonLabel?: string
  onButtonClick?: MouseEventHandler<HTMLButtonElement>
  className?: string
}

export function BadgeWithButton({
  color,
  variant,
  type = "pill-color",
  size = "md",
  icon: Icon = CloseX,
  buttonLabel,
  onButtonClick,
  children,
  className,
}: BadgeWithButtonProps) {
  const resolvedColor: BadgeColor =
    color ?? (variant ? variantToColor[variant] : "gray")
  const config = typeConfigs[type]
  const colorStyle = config.styles[resolvedColor] ?? filledColors[resolvedColor]

  const btnPillSizes = {
    sm: "gap-0.5 py-0.5 pl-2 pr-0.75 text-xs font-medium",
    md: "gap-0.5 py-0.5 pl-2.5 pr-1 text-sm font-medium",
    lg: "gap-0.5 py-1 pl-3 pr-1.5 text-sm font-medium",
  }
  const btnBadgeSizes = {
    sm: "gap-0.5 py-0.5 pl-1.5 pr-0.75 text-xs font-medium",
    md: "gap-0.5 py-0.5 pl-2 pr-1 text-sm font-medium",
    lg: "gap-0.5 py-1 pl-2.5 pr-1.5 text-sm font-medium rounded-lg",
  }
  const sizes = {
    "pill-color": btnPillSizes,
    color: btnBadgeSizes,
    modern: btnBadgeSizes,
  }

  return (
    <span
      className={cx(
        config.common,
        sizes[type][size],
        colorStyle?.root,
        className,
      )}
    >
      {children}
      <button
        type="button"
        aria-label={buttonLabel}
        onClick={onButtonClick}
        className={cx(
          "flex cursor-pointer items-center justify-center p-0.5 outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2",
          (colorStyle as { addonButton?: string }).addonButton,
          type === "pill-color" ? "rounded-full" : "rounded-[3px]",
        )}
      >
        <Icon className="size-3 stroke-[3px] transition-inherit-all" />
      </button>
    </span>
  )
}

// ---------------------------------------------------------------------------
// BadgeIcon
// ---------------------------------------------------------------------------

export interface BadgeIconProps {
  color?: BadgeColor
  variant?: BadgeVariant
  type?: BadgeType
  size?: BadgeSize
  icon: IconComponentType
  className?: string
}

export function BadgeIcon({
  color,
  variant,
  type = "pill-color",
  size = "md",
  icon: Icon,
  className,
}: BadgeIconProps) {
  const resolvedColor: BadgeColor =
    color ?? (variant ? variantToColor[variant] : "gray")
  const config = typeConfigs[type]
  const colorStyle = config.styles[resolvedColor] ?? filledColors[resolvedColor]

  const iconPillSizes = { sm: "p-1.25", md: "p-1.5", lg: "p-2" }
  const iconBadgeSizes = {
    sm: "p-1.25",
    md: "p-1.5",
    lg: "p-2 rounded-lg",
  }
  const sizes = {
    "pill-color": iconPillSizes,
    color: iconBadgeSizes,
    modern: iconBadgeSizes,
  }

  return (
    <span
      className={cx(
        config.common,
        sizes[type][size],
        colorStyle?.root,
        className,
      )}
    >
      <Icon className={cx("size-3 stroke-[3px]", colorStyle?.addon)} />
    </span>
  )
}
