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
        "flex h-full flex-col border-r border-white/10 bg-[#1C1C1E]",
        collapsed ? "w-16" : "w-60",
        "transition-[width] duration-200",
        className
      )}
    >
      {header && (
        <div className="border-b border-white/10 p-4">{header}</div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className={cx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B30]",
                  item.isActive
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white/80",
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
        <div className="border-t border-white/10 p-4">{footer}</div>
      )}
    </nav>
  )
}
