"use client";

import { usePathname } from "next/navigation";
import {
  BarChart01,
  Calendar,
  CpuChip01,
  Grid01,
  LayoutAlt01,
  Settings01,
  Terminal,
  Users01,
} from "@untitledui/icons";
import {
  MobileNavigationHeader,
  NavAccountCard,
  NavList,
  type NavItemDividerType,
  type NavItemType,
} from "@circos/ui";

const navItems: (NavItemType | NavItemDividerType)[] = [
  { label: "Office", href: "/office", icon: Grid01 },
  { label: "Agents", href: "/agents", icon: CpuChip01 },
  { label: "Boards", href: "/board-groups", icon: LayoutAlt01 },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Activity", href: "/activity", icon: BarChart01 },
  { label: "Sessions", href: "/sessions", icon: Users01 },
  { label: "Terminal", href: "/terminal", icon: Terminal },
  { divider: true },
  { label: "Settings", href: "/settings", icon: Settings01 },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-primary">
      {/* Mobile header */}
      <MobileNavigationHeader>
        <div className="flex h-full flex-col bg-primary">
          <NavList activeUrl={pathname} items={navItems} />
          <div className="mt-auto p-3">
            <NavAccountCard />
          </div>
        </div>
      </MobileNavigationHeader>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-secondary bg-primary lg:flex">
        <NavList activeUrl={pathname} items={navItems} />
        <div className="mt-auto p-3">
          <NavAccountCard />
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
