"use client"

import type { FC, HTMLAttributes } from "react"
import { SearchLg, Settings01 } from "@untitledui/icons"
import { Button as AriaButton, DialogTrigger as AriaDialogTrigger, Popover as AriaPopover } from "react-aria-components"
import { motion } from "motion/react"
import { Avatar } from "../../../base/avatar/avatar"
import { ButtonUtility } from "../../../base/buttons/button-utility"
import { Input } from "../../../base/input/input"
import { cx } from "../../../../utils/cx"
import { UntitledLogo } from "../../../foundations/logo/untitledui-logo"
import { UntitledLogoMinimal } from "../../../foundations/logo/untitledui-logo-minimal"
import { NavAccountCard, NavAccountMenu } from "../base-components/nav-account-card"
import { NavItemBase } from "../base-components/nav-item"
import { NavItemButton } from "../base-components/nav-item-button"
import { NavList } from "../base-components/nav-list"
import type { NavItemDividerType, NavItemType } from "../config"
import { SIDEBAR, SIDEBAR_SPRING } from "../sidebar-constants"
import type { FeaturedCardData } from "./sidebar-section-dividers"
import { FeaturedCardProgressBar } from "../../featured-cards/featured-cards"

// ─── SideMenu ───────────────────────────────────────────────────────
// Unified sidebar. `variant` controls slim (64px) vs expanded (292px).
// When `animated`, uses motion for width + cross-fade between layers.
// When not animated, renders the requested variant statically.

const FADE_OUT = { duration: 0.2 }
const FADE_IN = { duration: 0.2, delay: 0.15 }

export interface SideMenuProps {
  variant: "slim" | "expanded"
  activeUrl?: string
  items: (NavItemType | NavItemDividerType)[]
  featuredCards?: FeaturedCardData[]
  onCollapse?: () => void
  /** Enable width + cross-fade animation between variants (for click toggle). */
  animated?: boolean
  /** Icon shown on the collapse button (expanded state). */
  collapseIcon?: FC<{ className?: string }>
  /** Icon shown on the expand button (slim state). */
  expandIcon?: FC<{ className?: string }>
  /** Label for the collapse/expand button in expanded state (e.g. "Open" when hover-expanded). */
  collapseLabel?: string
  className?: string
}

export function SideMenu({
  variant,
  activeUrl,
  items,
  featuredCards,
  onCollapse,
  animated = false,
  collapseIcon,
  expandIcon,
  collapseLabel = "Collapse",
  className,
}: SideMenuProps) {
  const isSlim = variant === "slim"

  // ── Animated mode: motion.aside with both layers cross-fading ──
  if (animated) {
    return (
      <motion.aside
        className={cx(
          "relative flex h-full flex-col overflow-hidden bg-primary rounded-xl",
          isSlim
            ? "ring-1 ring-secondary ring-inset"
            : "border border-secondary shadow-xs",
          className,
        )}
        animate={{ width: isSlim ? 64 : SIDEBAR.EXPANDED_WIDTH }}
        transition={SIDEBAR_SPRING}
      >
        {/* Expanded layer — fades out when collapsing, fades in delayed when expanding */}
        <motion.div
          className="absolute inset-0 flex flex-col justify-between"
          animate={{ opacity: isSlim ? 0 : 1 }}
          transition={isSlim ? FADE_OUT : FADE_IN}
          style={{ pointerEvents: isSlim ? "none" : "auto", width: SIDEBAR.EXPANDED_WIDTH }}
        >
          <ExpandedContent
            activeUrl={activeUrl}
            items={items}
            featuredCards={featuredCards}
            onCollapse={onCollapse}
            collapseIcon={collapseIcon}
            collapseLabel={collapseLabel}
          />
        </motion.div>

        {/* Slim layer — only mounted when slim, fades in with delay */}
        {isSlim && (
        <motion.div
          className="absolute inset-0 flex flex-col justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={FADE_IN}
          style={{ width: 64 }}
        >
          <div className="flex flex-col items-center pt-5 px-3">
            <UntitledLogoMinimal className="size-8" />
          </div>
          <SlimNavItems items={items} activeUrl={activeUrl} />
          <SlimFooter activeUrl={activeUrl} onCollapse={onCollapse} expandIcon={expandIcon} />
        </motion.div>
        )}
      </motion.aside>
    )
  }

  // ── Static mode: direct render of the requested variant ──
  if (isSlim) {
    return (
      <aside
        className={cx(
          "flex h-full w-[64px] flex-col justify-between overflow-hidden bg-primary rounded-xl ring-1 ring-secondary ring-inset",
          className,
        )}
      >
        <div className="flex flex-col items-center pt-5 px-3">
          <UntitledLogoMinimal className="size-8" />
        </div>
        <SlimNavItems items={items} activeUrl={activeUrl} />
        <SlimFooter activeUrl={activeUrl} onCollapse={onCollapse} />
      </aside>
    )
  }

  return (
    <aside
      className={cx(
        "flex h-full w-[292px] flex-col justify-between overflow-hidden bg-primary rounded-xl border border-secondary shadow-xs",
        className,
      )}
    >
      <ExpandedContent
        activeUrl={activeUrl}
        items={items}
        featuredCards={featuredCards}
        onCollapse={onCollapse}
      />
    </aside>
  )
}

// ─── ExpandedContent ────────────────────────────────────────────────
// Extracted to reuse in both animated and static expanded modes.

function ExpandedContent({
  activeUrl,
  items,
  featuredCards,
  onCollapse,
  collapseIcon,
  collapseLabel = "Collapse",
}: {
  activeUrl?: string
  items: (NavItemType | NavItemDividerType)[]
  featuredCards?: FeaturedCardData[]
  onCollapse?: () => void
  collapseIcon?: FC<{ className?: string }>
  collapseLabel?: string
}) {
  return (
    <>
      <div className="flex flex-col gap-5 px-4 pt-4 lg:px-5 lg:pt-5">
        <div className="flex items-center justify-between">
          <UntitledLogo className="h-8" />
          {onCollapse && (
            <ButtonUtility
              icon={collapseIcon}
              size="xs"
              color="secondary"
              tooltip={collapseLabel}
              tooltipPlacement="right"
              onClick={onCollapse}
            />
          )}
        </div>
        <Input shortcut size="sm" aria-label="Search" placeholder="Search" icon={SearchLg} />
      </div>

      <NavList activeUrl={activeUrl} items={items} className="mt-5 pb-5 lg:flex-1 lg:overflow-y-auto" />

      <div className="mt-auto flex flex-col gap-4 border-t border-secondary px-2 pt-4 pb-4 lg:shrink-0 lg:px-4 lg:pt-6 lg:pb-6">
        <div className="flex flex-col gap-0.5">
          <NavItemBase type="link" href="/settings" icon={Settings01} current={activeUrl === "/settings"}>
            Settings
          </NavItemBase>
        </div>
        <div className="-mx-2 px-2 lg:-mx-4 lg:px-4 flex gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(featuredCards ?? []).map((card) => (
            <FeaturedCardProgressBar
              key={card.title}
              title={card.title}
              description={card.description}
              progress={card.progress}
              showButtons={false}
              className="w-[14.875rem] shrink-0"
            />
          ))}
        </div>
        <NavAccountCard />
      </div>
    </>
  )
}

// ─── SlimNavItems ───────────────────────────────────────────────────

function SlimNavItems({
  items,
  activeUrl,
}: {
  items: (NavItemType | NavItemDividerType)[]
  activeUrl?: string
}) {
  return (
    <ul className="mt-4 flex flex-col gap-0.5 px-3">
      {items.map((item, i) => {
        if ("divider" in item && item.divider) {
          return (
            <li key={`divider-${i}`} className="flex items-start justify-center py-1">
              <div className="h-px w-full bg-primary/10" />
            </li>
          )
        }
        const navItem = item as NavItemType
        if (!navItem.icon) return null
        const isActive = navItem.href === activeUrl || navItem.items?.some((sub) => sub.href === activeUrl)
        return (
          <li key={navItem.label}>
            <NavItemButton
              size="md"
              current={!!isActive}
              href={navItem.href}
              label={navItem.label}
              icon={navItem.icon as FC<{ className?: string }>}
            />
          </li>
        )
      })}
    </ul>
  )
}

// ─── SlimFooter ─────────────────────────────────────────────────────

function SlimFooter({
  activeUrl,
  onCollapse,
  expandIcon,
}: {
  activeUrl?: string
  onCollapse?: () => void
  expandIcon?: FC<{ className?: string }>
}) {
  return (
    <div className="mt-auto flex flex-col items-center gap-4 px-3 pb-5">
      <div className="flex flex-col gap-0.5">
        <NavItemButton size="md" href="/settings" label="Settings" icon={Settings01} current={activeUrl === "/settings"} />
        {expandIcon && <NavItemButton size="md" label="Expand" icon={expandIcon} onClick={onCollapse} />}
      </div>
      <AriaDialogTrigger>
        <AriaButton
          className={({ isPressed, isFocused }) =>
            cx("group relative inline-flex rounded-full", (isPressed || isFocused) && "outline-2 outline-offset-2 outline-focus-ring")
          }
        >
          <Avatar status="online" src="https://www.untitledui.com/images/avatars/olivia-rhye?fm=webp&q=80" size="md" alt="Olivia Rhye" />
        </AriaButton>
        <AriaPopover
          placement="right bottom"
          offset={8}
          crossOffset={6}
          className={({ isEntering, isExiting }) =>
            cx(
              "will-change-transform",
              isEntering && "duration-300 ease-out animate-in fade-in placement-right:slide-in-from-left-2",
              isExiting && "duration-150 ease-in animate-out fade-out placement-right:slide-out-to-left-2",
            )
          }
        >
          <NavAccountMenu />
        </AriaPopover>
      </AriaDialogTrigger>
    </div>
  )
}
