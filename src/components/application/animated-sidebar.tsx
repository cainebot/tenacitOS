"use client"

import { type ReactNode, useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { SideMenu, SIDEBAR, SIDEBAR_SPRING, type NavItemType, type NavItemDividerType } from "@circos/ui"
import type { FeaturedCardData } from "@circos/ui"
import { PanelLeftClose } from "@/components/icons/panel-left-close"
import { PanelRightClose } from "@/components/icons/panel-right-close"

/**
 * AnimatedSidebar — orchestrates the SideMenu morphing transition.
 *
 * Uses a SINGLE SideMenu instance whose `variant` is derived from the
 * combined state (isSlim + isHovering). This guarantees that:
 *
 * - hover-expanded → fixed-expanded keeps the same DOM tree (variant
 *   stays "expanded", no remount, no flicker)
 * - slim → hover-expanded animates smoothly via SideMenu's spring
 * - hover-expanded → slim (mouse leave) cross-fades back cleanly
 */

interface AnimatedSidebarProps {
  activeUrl?: string
  items: (NavItemType | NavItemDividerType)[]
  featuredCards?: FeaturedCardData[]
  isSlim: boolean
  onToggle: () => void
  secondaryPanel?: ReactNode
  showSecondaryPanel?: boolean
  /** Called when pointer leaves the entire sidebar + secondary panel area. */
  onPointerLeave?: () => void
}

export function AnimatedSidebar({
  activeUrl,
  items,
  featuredCards,
  isSlim,
  onToggle,
  secondaryPanel,
  showSecondaryPanel,
  onPointerLeave: onPointerLeaveProp,
}: AnimatedSidebarProps) {
  const [isHovering, setIsHovering] = useState(false)

  // Clear hover when the sidebar is expanded externally
  useEffect(() => {
    if (!isSlim) setIsHovering(false)
  }, [isSlim])

  // ── Derived state ──
  // Visual variant: expanded when hovering over slim OR when not slim
  const visualVariant: "slim" | "expanded" =
    isSlim && !isHovering ? "slim" : "expanded"

  // Floating overlay mode: expanded via hover, doesn't push content
  const isOverlay = isSlim && isHovering

  // Placeholder width: only accounts for the fixed (non-hover) layout
  const baseWidth = isSlim ? SIDEBAR.SLIM_WIDTH : SIDEBAR.EXPANDED_WITH_PAD
  const placeholderWidth = showSecondaryPanel
    ? baseWidth + SIDEBAR.PANEL_WIDTH
    : baseWidth

  // ── Toggle handler ──
  // When expanding from hover, just consolidate the state — the SideMenu
  // variant stays "expanded", so there's zero visual change.
  const handleToggle = () => {
    if (isOverlay) {
      setIsHovering(false)
      onToggle() // sets isSlim → false
    } else {
      onToggle()
    }
  }

  return (
    <>
      {/* Single sidebar container — fixed position, grows with SideMenu */}
      <div
        className={`z-50 hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:py-1 lg:pl-1${
          isOverlay ? " shadow-xl" : ""
        }`}
        onPointerLeave={() => { setIsHovering(false); onPointerLeaveProp?.() }}
      >
        {/* Single SideMenu instance — always animated, variant derived from state */}
        {/* onPointerEnter on this wrapper so only the sidebar area triggers hover,
            while the outer onPointerLeave keeps hover alive across the agents panel */}
        <div className="h-full" onPointerEnter={() => isSlim && setIsHovering(true)}>
        <SideMenu
          variant={visualVariant}
          animated
          activeUrl={activeUrl}
          items={items}
          featuredCards={featuredCards}
          onCollapse={handleToggle}
          collapseIcon={isOverlay ? PanelRightClose : PanelLeftClose}
          expandIcon={PanelRightClose}
          collapseLabel={isOverlay ? "Open" : "Collapse"}
        />
        </div>

        {/* Secondary panel (agent board) — slides in beside sidebar */}
        <AnimatePresence initial={false}>
          {showSecondaryPanel && (
            <motion.div
              key="secondary-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: SIDEBAR.PANEL_WIDTH, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={SIDEBAR_SPRING}
              className="h-full overflow-x-hidden overflow-y-auto border-r border-secondary bg-primary"
            >
              <div style={{ width: SIDEBAR.PANEL_WIDTH }} className="h-full">
                {secondaryPanel}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Animated placeholder — pushes main content */}
      <motion.div
        className="invisible hidden lg:sticky lg:top-0 lg:bottom-0 lg:left-0 lg:block"
        animate={{ paddingLeft: placeholderWidth }}
        transition={SIDEBAR_SPRING}
      />
    </>
  )
}
