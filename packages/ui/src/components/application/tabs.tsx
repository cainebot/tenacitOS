"use client"

import {
  Tabs as AriaTabs,
  TabList as AriaTabList,
  Tab as AriaTab,
  TabPanel as AriaTabPanel,
  type TabsProps as AriaTabsProps,
  type TabListProps as AriaTabListProps,
  type TabProps as AriaTabProps,
  type TabPanelProps as AriaTabPanelProps,
} from "react-aria-components"
import { type ReactNode } from "react"
import { cx } from "../../utils/cx"

export interface TabsProps extends Omit<AriaTabsProps, "className"> {
  className?: string
  children: ReactNode
}

export function Tabs({ className, children, ...props }: TabsProps) {
  return (
    <AriaTabs
      className={cx("flex flex-col", className)}
      {...props}
    >
      {children}
    </AriaTabs>
  )
}

export interface TabListProps<T extends object>
  extends Omit<AriaTabListProps<T>, "className"> {
  className?: string
}

export function TabList<T extends object>({
  className,
  ...props
}: TabListProps<T>) {
  return (
    <AriaTabList
      className={cx(
        "flex gap-1 border-b border-white/10",
        className
      )}
      {...props}
    />
  )
}

export interface TabProps extends Omit<AriaTabProps, "className"> {
  className?: string
  children: ReactNode
}

export function Tab({ className, children, ...props }: TabProps) {
  return (
    <AriaTab
      className={cx(
        "cursor-pointer px-3 py-2 text-sm font-medium outline-none transition-colors",
        "text-white/50 hover:text-white/80",
        "selected:text-white selected:border-b-2 selected:border-[#FF3B30] selected:-mb-px",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B30] focus-visible:rounded-sm",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      {children}
    </AriaTab>
  )
}

export interface TabPanelProps extends Omit<AriaTabPanelProps, "className"> {
  className?: string
  children: ReactNode
}

export function TabPanel({ className, children, ...props }: TabPanelProps) {
  return (
    <AriaTabPanel
      className={cx("pt-4 text-sm text-white/70 outline-none", className)}
      {...props}
    >
      {children}
    </AriaTabPanel>
  )
}
