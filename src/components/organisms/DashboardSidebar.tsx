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

  const sidebarWidth = collapsed ? 56 : 240;

  return (
    <aside
      style={{
        width: `${sidebarWidth}px`,
        minWidth: `${sidebarWidth}px`,
        position: 'sticky',
        top: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Brand mark — fixed top */}
      {!collapsed && <BrandMark />}
      {collapsed && (
        <div style={{ height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-heading)' }}>DC</span>
        </div>
      )}

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: collapsed ? '0 8px' : '0 12px' }} />

      {/* Scrollable navigation sections */}
      <nav
        className="flex-1 flex flex-col gap-4 overflow-y-auto"
        style={{
          minHeight: 0,
          padding: collapsed ? '12px 6px' : '16px 12px',
        }}
      >
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {/* Section label — hidden when collapsed */}
            {!collapsed && (
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  paddingLeft: '8px',
                  paddingBottom: '6px',
                  fontFamily: 'var(--font-heading)',
                }}
              >
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
                    className={cx("nav-item", active && "active")}
                    title={collapsed ? item.label : undefined}
                    style={collapsed ? {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px 0',
                    } : undefined}
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
      <div style={{ borderTop: '1px solid var(--border)', padding: collapsed ? '8px 6px 4px' : '8px 12px 4px' }}>
        <div className="flex flex-col gap-0.5">
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const active = item.isActive(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx("nav-item", active && "active")}
                title={collapsed ? item.label : undefined}
                style={collapsed ? {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 0',
                } : undefined}
              >
                <Icon size={16} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Collapse toggle button */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '4px 6px' }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '8px',
            width: '100%',
            padding: collapsed ? '8px 0' : '8px 8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: '12px',
            fontFamily: 'var(--font-body)',
            borderRadius: '6px',
            transition: 'background 0.1s, color 0.1s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-hover, #2E2E2E)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {/* Fixed bottom — Node status strip */}
      {!collapsed && (
        <div className="px-3 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          <NodeStatusStrip />
        </div>
      )}
    </aside>
  );
}
