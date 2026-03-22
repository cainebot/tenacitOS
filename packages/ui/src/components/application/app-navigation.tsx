"use client"

import { type ReactNode } from "react"
import { cx } from "../../utils/cx"

export interface NavItem {
  label: string
  href: string
  icon?: ReactNode
  isActive?: boolean
}

export interface AppNavigationProps {
  items: NavItem[]
  collapsed?: boolean
  header?: ReactNode
  footer?: ReactNode
  className?: string
}

export function AppNavigation({
  items,
  collapsed = false,
  header,
  footer,
  className,
}: AppNavigationProps) {
  return (
    <nav
      className={cx(
        "flex h-full flex-col border-r border-secondary bg-secondary",
        collapsed ? "w-16" : "w-60",
        "transition-[width] duration-200",
        className
      )}
    >
      {header && (
        <div className="border-b border-secondary p-4">{header}</div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className={cx(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
                  item.isActive
                    ? "bg-tertiary text-primary"
                    : "text-quaternary hover:bg-secondary hover:text-secondary",
                  collapsed && "justify-center px-0"
                )}
                aria-current={item.isActive ? "page" : undefined}
              >
                {item.icon && (
                  <span className="shrink-0 [&_svg]:h-5 [&_svg]:w-5">
                    {item.icon}
                  </span>
                )}
                {!collapsed && <span className="truncate">{item.label}</span>}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {footer && (
        <div className="border-t border-secondary p-4">{footer}</div>
      )}
    </nav>
  )
}
