"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Activity,
  FolderKanban,
  Kanban,
  Tag,
  CheckSquare,
  SlidersHorizontal,
  Package,
  Building2,
  Zap,
  Bot,
  Server,
  Map,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { BrandMark } from "@/components/atoms/BrandMark";
import NodeStatusStrip from "@/components/NodeStatusStrip";
import { cx } from "@openclaw/ui";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType<{ className?: string; size?: number }>;
  isActive: (pathname: string) => boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "OVERVIEW",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        isActive: (p) => p === "/dashboard" || p === "/",
      },
      {
        label: "Live feed",
        href: "/activity",
        icon: Activity,
        isActive: (p) => p.startsWith("/activity"),
      },
    ],
  },
  {
    label: "BOARDS",
    items: [
      {
        label: "Board groups",
        href: "/board-groups",
        icon: FolderKanban,
        isActive: (p) => p.startsWith("/board-groups"),
      },
      {
        label: "Boards",
        href: "/boards",
        icon: Kanban,
        isActive: (p) => p.startsWith("/boards"),
      },
      {
        label: "Tags",
        href: "/tags",
        icon: Tag,
        isActive: (p) => p.startsWith("/tags"),
      },
      {
        label: "Approvals",
        href: "/approvals",
        icon: CheckSquare,
        isActive: (p) => p.startsWith("/approvals"),
      },
      {
        label: "Custom fields",
        href: "/custom-fields",
        icon: SlidersHorizontal,
        isActive: (p) => p.startsWith("/custom-fields"),
      },
    ],
  },
  {
    label: "SKILLS",
    items: [
      {
        label: "Marketplace",
        href: "/skills",
        icon: Package,
        isActive: (p) => p.startsWith("/skills"),
      },
    ],
  },
  {
    label: "ADMINISTRATION",
    items: [
      {
        label: "Organization",
        href: "/organization",
        icon: Building2,
        isActive: (p) => p.startsWith("/organization"),
      },
      {
        label: "Gateways",
        href: "/gateways",
        icon: Zap,
        isActive: (p) => p.startsWith("/gateways"),
      },
      {
        label: "Agents",
        href: "/agents",
        icon: Bot,
        isActive: (p) => p.startsWith("/agents"),
      },
      {
        label: "Workspaces",
        href: "/workspaces",
        icon: Server,
        isActive: (p) => p.startsWith("/workspaces"),
      },
    ],
  },
];

// Additional bottom nav items (not in sections)
const BOTTOM_NAV: NavItem[] = [
  {
    label: "Office",
    href: "/office",
    icon: Map,
    isActive: (p) => p.startsWith("/office"),
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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cx(
        "sticky top-0 h-screen flex flex-col",
        "bg-secondary border-r border-primary",
        "transition-[width,min-width] duration-200 ease-in-out overflow-hidden",
        collapsed ? "w-14 min-w-14" : "w-60 min-w-60"
      )}
    >
      {/* Brand mark — fixed top */}
      {!collapsed && <BrandMark />}
      {collapsed && (
        <div className="flex h-12 items-center justify-center">
          <span className="text-lg font-bold text-brand-600 font-display">DC</span>
        </div>
      )}

      {/* Divider */}
      <div className={cx("h-px bg-gray-300", collapsed ? "mx-2" : "mx-3")} />

      {/* Scrollable navigation sections */}
      <nav
        className={cx(
          "flex-1 flex flex-col gap-4 overflow-y-auto min-h-0",
          collapsed ? "p-3 px-1.5" : "p-4 px-3"
        )}
      >
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {/* Section label — hidden when collapsed */}
            {!collapsed && (
              <div className="text-[10px] font-semibold tracking-[0.08em] text-quaternary pl-2 pb-1.5 font-display">
                {section.label}
              </div>
            )}

            {/* Section items */}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = item.isActive(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx("nav-item", active && "active", collapsed && "flex items-center justify-center py-2")}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={16} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Fixed bottom — Office, Settings */}
      <div className={cx("border-t border-primary", collapsed ? "px-1.5 pt-2 pb-1" : "px-3 pt-2 pb-1")}>
        <div className="flex flex-col gap-0.5">
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const active = item.isActive(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx("nav-item", active && "active", collapsed && "flex items-center justify-center py-2")}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={16} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Collapse toggle button */}
      <div className="border-t border-primary p-1 px-1.5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cx(
            "flex items-center gap-2 w-full rounded-md text-xs text-quaternary font-[family-name:var(--font-text)] cursor-pointer bg-transparent border-none",
            "hover:bg-quaternary hover:text-primary transition-colors",
            collapsed ? "justify-center py-2" : "justify-start py-2 px-2"
          )}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {/* Fixed bottom — Node status strip */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-primary">
          <NodeStatusStrip />
        </div>
      )}
    </aside>
  );
}
