"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Kanban, Bot, Map, Activity, Settings } from "lucide-react";

import { BrandMark } from "@/components/atoms/BrandMark";
import NodeStatusStrip from "@/components/NodeStatusStrip";
import { cn } from "@/lib/cn";

interface NavLink {
  label: string;
  href: string;
  icon: React.ElementType<{ className?: string; size?: number }>;
  isActive: (pathname: string) => boolean;
}

const NAV_LINKS: NavLink[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    isActive: (p) => p === "/dashboard" || p === "/",
  },
  {
    label: "Boards",
    href: "/boards",
    icon: Kanban,
    isActive: (p) => p.startsWith("/boards"),
  },
  {
    label: "Agents",
    href: "/agents",
    icon: Bot,
    isActive: (p) => p.startsWith("/agents"),
  },
  {
    label: "Office",
    href: "/office",
    icon: Map,
    isActive: (p) => p.startsWith("/office"),
  },
  {
    label: "Activity",
    href: "/activity",
    icon: Activity,
    isActive: (p) => p.startsWith("/activity"),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    isActive: (p) => p.startsWith("/settings"),
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="sidebar-width flex flex-col shrink-0"
      style={{
        backgroundColor: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        minHeight: '100vh',
      }}
    >
      {/* Brand mark */}
      <BrandMark />

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '0 12px' }} />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_LINKS.map((link) => {
          const Icon = link.icon;
          const active = link.isActive(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn("nav-item", active && "active")}
            >
              <Icon size={20} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Node status strip at bottom */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <NodeStatusStrip />
      </div>
    </aside>
  );
}
