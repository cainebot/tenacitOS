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
import {
  createContext,
  useContext,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { cx } from "../../utils/cx"

export type TabListType = "underline" | "button-minimal"
export type TabListSize = "sm" | "md"

const TabListContext = createContext<{
  type: TabListType
  size: TabListSize
  fullWidth: boolean
}>({ type: "underline", size: "md", fullWidth: false })

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
  type?: TabListType
  size?: TabListSize
  fullWidth?: boolean
}

function ButtonMinimalTabListWrapper({
  className,
  fullWidth,
  children,
}: {
  className?: string
  fullWidth: boolean
  children: ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)

  const updateIndicator = useCallback(() => {
    const container = containerRef.current
    const indicator = indicatorRef.current
    if (!container || !indicator) return

    const selectedTab = container.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!selectedTab) {
      indicator.style.opacity = "0"
      return
    }

    // offsetLeft/offsetWidth are relative to the padding edge of the
    // offsetParent (the container). Subtract 1px and add 2px to width
    // so the indicator overlaps the container border on each side,
    // matching the vertical overlap from -top-px/-bottom-px.
    indicator.style.transform = `translateX(${selectedTab.offsetLeft - 1}px)`
    indicator.style.width = `${selectedTab.offsetWidth + 2}px`
    indicator.style.opacity = "1"
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const indicator = indicatorRef.current
    if (!container || !indicator) return

    // Initial position without transition
    indicator.style.transition = "none"
    updateIndicator()

    // Enable transition after initial paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        indicator.style.transition =
          "transform 200ms cubic-bezier(0.4, 0, 0.2, 1)"
      })
    })

    // Watch for selection changes
    const mutationObs = new MutationObserver(updateIndicator)
    mutationObs.observe(container, {
      attributes: true,
      subtree: true,
      attributeFilter: ["aria-selected"],
    })

    // Recalculate on resize
    const resizeObs = new ResizeObserver(() => {
      indicator.style.transition = "none"
      updateIndicator()
      requestAnimationFrame(() => {
        indicator.style.transition =
          "transform 200ms cubic-bezier(0.4, 0, 0.2, 1)"
      })
    })
    resizeObs.observe(container)

    return () => {
      mutationObs.disconnect()
      resizeObs.disconnect()
    }
  }, [updateIndicator])

  return (
    <div
      ref={containerRef}
      className={cx(
        "relative overflow-visible rounded-(--radius-md) border border-secondary bg-secondary",
        fullWidth && "w-full",
        className
      )}
    >
      <div
        ref={indicatorRef}
        className="pointer-events-none absolute -top-px -bottom-px z-0 rounded-(--radius-md) border border-primary bg-primary shadow-xs opacity-0"
        aria-hidden
      />
      {children}
    </div>
  )
}

export function TabList<T extends object>({
  className,
  type = "underline",
  size = "md",
  fullWidth = false,
  children,
  ...props
}: TabListProps<T>) {
  const isButton = type === "button-minimal"

  if (isButton) {
    return (
      <TabListContext.Provider value={{ type, size, fullWidth }}>
        <ButtonMinimalTabListWrapper className={className} fullWidth={fullWidth}>
          <AriaTabList
            className="relative z-10 flex w-full gap-0.5"
            {...props}
          >
            {children}
          </AriaTabList>
        </ButtonMinimalTabListWrapper>
      </TabListContext.Provider>
    )
  }

  return (
    <TabListContext.Provider value={{ type, size, fullWidth }}>
      <AriaTabList
        className={cx(
          "flex gap-1 border-b border-secondary",
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {children}
      </AriaTabList>
    </TabListContext.Provider>
  )
}

export interface TabProps extends Omit<AriaTabProps, "className"> {
  className?: string
  children: ReactNode
}

export function Tab({ className, children, ...props }: TabProps) {
  const { type, size, fullWidth } = useContext(TabListContext)
  const isButton = type === "button-minimal"

  return (
    <AriaTab
      className={cx(
        "cursor-pointer font-semibold outline-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 focus-visible:rounded-sm",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        isButton
          ? cx(
              "relative z-10 h-9 items-center justify-center gap-2 overflow-hidden rounded-(--radius-md) text-center text-sm text-tertiary",
              "transition-colors duration-200 ease-in-out",
              "hover:text-secondary",
              "selected:text-secondary",
              "px-3 py-2",
            )
          : cx(
              "transition-all duration-150 ease-in-out",
              "text-quaternary hover:text-secondary",
              "selected:text-primary selected:border-b-2 selected:border-brand-600 selected:-mb-px",
              size === "sm" ? "px-3 py-1.5 text-sm" : "px-3 py-2 text-sm",
            ),
        fullWidth && "flex-1",
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
      className={cx("pt-4 text-sm text-tertiary outline-none", className)}
      {...props}
    >
      {children}
    </AriaTabPanel>
  )
}
