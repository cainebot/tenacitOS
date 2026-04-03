"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  BarChartSquare02,
  Building06,
  Calendar,
  ChevronRight,
  Data,
  Rows01,
  Server01,
} from "@untitledui/icons";
import {
  AgentSubNav,
  AgentSubNavDivider,
  AgentListItem,
  type NavItemDividerType,
  type NavItemType,
  type FeaturedCardData,
} from "@circos/ui";
import { AgentBoardProvider, useAgentBoard } from "@/contexts/agent-board-context";
import { AnimatedSidebar } from "@/components/application/animated-sidebar";
import { DevPerfProfiler } from "@/components/dev-perf-profiler";
import { BotIcon } from "@/components/icons/bot-icon";
import { useRealtimeNodes } from "@/hooks/useRealtimeNodes";
import { PROJECT_COVER_COLORS, PROJECT_COVER_ICONS, type ProjectCoverColorId, type ProjectCoverIcon } from "@/components/application/project-cover/project-cover";
import type { ProjectRow } from "@/types/project";

/** Tiny display-only project icon for the sidebar (no picker). */
function ProjectIcon({ color, icon }: { color: ProjectCoverColorId; icon: ProjectCoverIcon }) {
  const bg = PROJECT_COVER_COLORS.find((c) => c.id === color)?.bg ?? "#b0b0b0";
  const Icon = PROJECT_COVER_ICONS[icon];
  return () => (
    <span
      className="mr-2 inline-flex shrink-0 items-center justify-center rounded"
      style={{ backgroundColor: bg, width: 20, height: 20 }}
    >
      {Icon && <Icon size={12} color="white" />}
    </span>
  );
}

// Static nav items (top + bottom around the dynamic Projects section)
const navItemsTop: (NavItemType | NavItemDividerType)[] = [
  { divider: true, label: "General" },
  { label: "Dashboard", href: "/", icon: BarChartSquare02 },
];

const navItemsBottom: (NavItemType | NavItemDividerType)[] = [
  { label: "Organization", href: "/organization", icon: Building06 },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { divider: true, label: "Agents" },
  { label: "Agents", href: "/agents", icon: BotIcon },
  { label: "Skills", href: "/skills", icon: Data },
  { label: "Workspaces", href: "/workspaces", icon: Server01 },
];

// Mock agent data for the agent board panel
function AgentBoardContent() {
  return (
    <AgentSubNav title="Agents" count={4}>
      <AgentListItem name="All agents" subtitle="7 total" badgeText="5 active" badgeColor="success" onClick={() => {}} />
      <AgentSubNavDivider />
      <AgentListItem name="Ragatha" badgeText="Inactive" badgeColor="error" onClick={() => {}} />
      <AgentListItem name="Pomni" subtitle="Scrum master" badgeText="IDLE" badgeColor="indigo" onClick={() => {}} />
      <AgentListItem name="Kinger" badgeText="Working" badgeColor="success" onClick={() => {}} />
      <AgentListItem name="Jax" badgeText="Working" badgeColor="success" onClick={() => {}} />
    </AgentSubNav>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { agentBoardActive, setAgentBoardActive } = useAgentBoard();
  const { nodes } = useRealtimeNodes();

  // Fetch projects for dynamic sidebar icons
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectsVersion, setProjectsVersion] = useState(0);
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data: ProjectRow[]) => { if (Array.isArray(data)) setProjects(data) })
      .catch((err) => { console.error("[sidebar-projects] Failed:", err) })
  }, [projectsVersion]);

  // Listen for cover changes from project pages to refresh sidebar
  useEffect(() => {
    const handler = () => setProjectsVersion((v) => v + 1);
    window.addEventListener("project-cover-changed", handler);
    window.addEventListener("project-created", handler);
    return () => {
      window.removeEventListener("project-cover-changed", handler);
      window.removeEventListener("project-created", handler);
    };
  }, []);

  // Build nav items with dynamic project list
  const navItems = useMemo((): (NavItemType | NavItemDividerType)[] => {
    const projectItems = projects.map((p) => ({
      label: p.name,
      icon: ProjectIcon({
        color: (p.cover_color ?? "gray") as ProjectCoverColorId,
        icon: (p.cover_icon ?? "clipboard-list") as ProjectCoverIcon,
      }),
      href: `/projects/${p.slug}`,
    }));

    return [
      ...navItemsTop,
      {
        label: "Projects",
        icon: Rows01,
        href: "/projects",
        items: [
          ...projectItems,
          { label: "See all", href: "/projects", iconTrailing: ChevronRight },
        ],
      },
      ...navItemsBottom,
    ];
  }, [projects]);

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

  // Auto-collapse sidebar when Agent's board opens (visual hint)
  useEffect(() => {
    if (agentBoardActive) {
      setIsCollapsed(true);
    }
  }, [agentBoardActive]);

  const isSlim = isCollapsed;

  const handleToggle = () => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <div className="flex h-screen flex-col bg-primary lg:flex-row">
      <AnimatedSidebar
        activeUrl={pathname}
        items={navItems}
        featuredCards={nodeCards}
        isSlim={isSlim}
        onToggle={handleToggle}
        secondaryPanel={<AgentBoardContent />}
        showSecondaryPanel={agentBoardActive}
      />

      <main className="flex flex-1 flex-col items-start self-stretch gap-8 overflow-auto">
        {children}
      </main>

      <DevPerfProfiler />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AgentBoardProvider>
      <DashboardContent>{children}</DashboardContent>
    </AgentBoardProvider>
  );
}
