"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { FC } from "react";
import {
  BarChartSquare02,
  Building06,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Data,
  Rows01,
  Server01,
} from "@untitledui/icons";
import {
  Badge,
  SidebarNavigationSectionDividers,
  SidebarNavigationSlim,
  cx,
  type NavItemDividerType,
  type NavItemType,
  type FeaturedCardData,
} from "@circos/ui";
import { BotIcon } from "@/components/icons/bot-icon";
import { useRealtimeNodes } from "@/hooks/useRealtimeNodes";

// Full sidebar nav items
const navItems: (NavItemType | NavItemDividerType)[] = [
  { divider: true, label: "General" },
  { label: "Dashboard", href: "/", icon: BarChartSquare02 },
  {
    label: "Projects",
    icon: Rows01,
    href: "/projects",
    items: [
      { label: "Sales Pipeline", badge: <Badge color="gray" type="modern" size="sm">4</Badge>, href: "/projects/sales-pipeline" },
      { label: "Tasks", href: "/projects/tasks" },
      { label: "See all", href: "/projects", iconTrailing: ChevronRight },
    ],
  },
  { label: "Organization", href: "/organization", icon: Building06 },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { divider: true, label: "Agents" },
  { label: "Agents", href: "/agents", icon: BotIcon },
  { label: "Skills", href: "/skills", icon: Data },
  { label: "Workspaces", href: "/workspaces", icon: Server01 },
];

// Derive slim items from navItems — filter out dividers, keep only items with icons
const slimNavItems = navItems.filter(
  (item): item is NavItemType & { icon: FC<{ className?: string }> } =>
    !("divider" in item && item.divider) && "icon" in item && Boolean(item.icon),
);

// Sidebar edge positions for the toggle pill
// Section-dividers: placeholder paddingLeft = 292 + 4 = 296px
// Slim: placeholder paddingLeft = 68px
const FULL_EDGE = 296;
const SLIM_EDGE = 68;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { nodes } = useRealtimeNodes();

  const nodeCards: FeaturedCardData[] = nodes.map((node) => {
    const ramPct = node.ram_total_mb > 0
      ? Math.round((node.ram_usage_mb / node.ram_total_mb) * 100)
      : 0;
    return {
      title: node.node_id,
      description: `${ramPct}% RAM · ${node.agent_count} Agent${node.agent_count === 1 ? "" : "s"}`,
      progress: ramPct,
    };
  });

  return (
    <div className="flex h-screen flex-col bg-primary lg:flex-row">
      {/* Sidebar */}
      {isCollapsed ? (
        <SidebarNavigationSlim
          activeUrl={pathname}
          items={slimNavItems}
        />
      ) : (
        <SidebarNavigationSectionDividers activeUrl={pathname} items={navItems} featuredCards={nodeCards} />
      )}

      {/* Collapse / expand toggle — floats at the sidebar's right edge, desktop only */}
      <button
        onClick={() => setIsCollapsed((v) => !v)}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{
          left: isCollapsed ? SLIM_EDGE - 12 : FULL_EDGE - 12,
          transition: "left 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        className="fixed top-1/2 z-50 hidden -translate-y-1/2 size-6 cursor-pointer items-center justify-center rounded-full border border-secondary bg-primary text-fg-quaternary shadow-sm hover:bg-secondary hover:text-fg-secondary lg:flex"
      >
        <ChevronLeft
          className={cx(
            "size-3.5 transition-transform duration-300",
            isCollapsed && "rotate-180",
          )}
        />
      </button>

      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
