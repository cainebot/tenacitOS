"use client"

import { type ReactNode } from "react"
import { ArrowLeft, ChevronRight, HomeLine } from "@untitledui/icons"
import { cx } from "../../utils/cx"
import { Button } from "../base/buttons/button"

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
}

export interface PageHeaderProps {
  /** Page title */
  title: string
  /** Supporting description below title */
  description?: string
  /** Breadcrumb trail — first item defaults to home icon if no label */
  breadcrumbs?: BreadcrumbItem[]
  /** Action buttons rendered on the right */
  actions?: ReactNode
  /** Optional search or extra content below the header row */
  extra?: ReactNode
  /** Show bottom border (default: true) */
  bordered?: boolean
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  extra,
  bordered = true,
  className,
}: PageHeaderProps) {
  return (
    <div className={cx("relative flex w-full flex-col gap-4 bg-primary", className)}>
      {/* Breadcrumbs — desktop only */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="max-lg:hidden">
          <ol className="flex items-center gap-1">
            {breadcrumbs.map((item, index) => {
              const Icon = item.icon ?? (index === 0 && !item.label ? HomeLine : undefined)
              const isLast = index === breadcrumbs!.length - 1
              return (
                <li key={item.label || `bc-${index}`} className="flex items-center gap-1">
                  {index > 0 && (
                    <ChevronRight className="size-4 text-fg-quaternary" aria-hidden />
                  )}
                  {item.href && !isLast ? (
                    <a
                      href={item.href}
                      className="flex items-center justify-center rounded-md px-2 py-1 text-sm font-semibold text-quaternary transition-colors hover:bg-primary_hover hover:text-tertiary"
                    >
                      {Icon && <Icon className="size-5" />}
                      {item.label && <span>{item.label}</span>}
                    </a>
                  ) : (
                    <span
                      className={cx(
                        "flex items-center justify-center rounded-md px-2 py-1 text-sm font-semibold",
                        isLast
                          ? "bg-primary_hover text-tertiary_hover"
                          : "text-quaternary",
                      )}
                    >
                      {Icon && <Icon className="size-5" />}
                      {item.label && <span>{item.label}</span>}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      )}

      {/* Back button — mobile only */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="flex lg:hidden">
          <Button
            href={breadcrumbs[breadcrumbs.length - 2]?.href ?? "#"}
            color="link-gray"
            size="md"
            iconLeading={ArrowLeft}
          >
            Back
          </Button>
        </div>
      )}

      {/* Title row */}
      <div
        className={cx(
          "flex w-full flex-wrap items-start gap-4",
          bordered && "border-b border-secondary pb-4",
        )}
      >
        <div className="flex min-w-[320px] flex-1 flex-col gap-1">
          <h1 className="text-xl font-semibold text-primary lg:text-display-xs">{title}</h1>
          {description && <p className="text-md text-tertiary">{description}</p>}
        </div>
        {actions && <div className="flex items-start gap-3">{actions}</div>}
      </div>

      {/* Extra content (search, tabs, etc.) */}
      {extra}
    </div>
  )
}
