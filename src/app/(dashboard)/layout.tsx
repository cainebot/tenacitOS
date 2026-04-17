"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { FC } from "react";
import {
  Building06,
  Calendar,
  ChevronRight,
  Data,
  Map01,
  MessageChatCircle,
  Rows01,
  Server01,
} from "@untitledui/icons";
import {
  Badge,
  AgentSubNav,
  AgentSubNavDivider,
  AgentListItem,
  type NavItemDividerType,
  type NavItemType,
  type FeaturedCardData,
} from "@circos/ui";
import { AgentBoardProvider, useAgentBoard } from "@/contexts/agent-board-context";
import { MyParticipantProvider } from "@/contexts/my-participant-context";
import { AnimatedSidebar } from "@/components/application/animated-sidebar";
import { DevPerfProfiler } from "@/components/dev-perf-profiler";
import { BotIcon } from "@/components/icons/bot-icon";
import { useRealtimeNodes } from "@/hooks/useRealtimeNodes";
import {
  ProjectIconBadge,
  type ProjectCoverColorId,
  type ProjectCoverIcon,
} from "@/components/application/project-cover";
import type { ProjectRow } from "@/types/project";
import { useConversations } from "@/features/chat/hooks/use-conversations";
import { ChatHoverMenu } from "@/features/chat/components/chat-hover-menu";
import officeEvents from "@/lib/office-events";

/** Tiny display-only project icon for the sidebar (no picker). */
function ProjectIcon({ color, icon }: { color: ProjectCoverColorId; icon: ProjectCoverIcon }) {
  const Badge = () => (
    <ProjectIconBadge
      color={color}
      icon={icon}
      size={20}
      iconSize={12}
      rounded="rounded"
      className="mr-2"
    />
  );
  return Badge;
}

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

type ActivePanel = 'chat-preview' | 'agents' | 'none'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { agentBoardActive, setAgentBoardActive } = useAgentBoard();
  const { nodes } = useRealtimeNodes();
  const { totalUnread, channels, dms } = useConversations();

  // Chat state
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');
  const [chatHoverOpen, setChatHoverOpen] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHoverClose = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => setChatHoverOpen(false), 150);
  }, []);

  const cancelHoverClose = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  // Fetch projects for dynamic sidebar icons
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectsVersion, setProjectsVersion] = useState(0);
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data: ProjectRow[]) => { if (Array.isArray(data)) setProjects(data) })
      .catch((err) => { console.error("[sidebar-projects] Failed:", err) })
  }, [projectsVersion]);

  useEffect(() => {
    const handler = () => setProjectsVersion((v) => v + 1);
    window.addEventListener("project-cover-changed", handler);
    window.addEventListener("project-created", handler);
    return () => {
      window.removeEventListener("project-cover-changed", handler);
      window.removeEventListener("project-created", handler);
    };
  }, []);

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

  useEffect(() => {
    if (agentBoardActive) {
      setIsCollapsed(true);
      setActivePanel('agents');
    }
  }, [agentBoardActive]);

  useEffect(() => {
    if (activePanel !== 'agents' && agentBoardActive) {
      setAgentBoardActive(false);
    }
  }, [activePanel, agentBoardActive, setAgentBoardActive]);

  const isSlim = isCollapsed;

  const handleToggle = () => {
    setIsCollapsed((prev) => !prev);
  };

  const handleOpenWorkspace = useCallback((conversationId?: string) => {
    if (conversationId) {
      router.push(`/chat?conversation=${conversationId}`)
    } else {
      router.push('/chat')
    }
    setChatHoverOpen(false)
  }, [router]);

  // Selecting an agent from the chat hover popover:
  // - On /office: emit officeEvents so the Phaser scene focuses/selects the agent.
  // - Elsewhere: navigate to /chat?conversation=<id> (the popover's primary purpose
  //   outside the office is navigation to the chat view).
  // The officeEvents-only path previously made the click a no-op on non-office pages.
  const handleSelectAgent = useCallback((agentId: string, agentName: string) => {
    const isOffice = pathname === '/office' || pathname.startsWith('/office/');
    if (isOffice) {
      officeEvents.emit('agent:select', {
        agent_id: agentId,
        name: agentName,
        role: '',
        status: 'active',
      });
      setChatHoverOpen(false);
      return;
    }
    const dm = dms.find((c) => c.agent_id === agentId);
    if (dm) {
      router.push(`/chat?conversation=${dm.conversation_id}`);
    } else {
      router.push('/chat');
    }
    setChatHoverOpen(false);
  }, [pathname, dms, router]);

  const handleSidebarLeave = () => {
    // Chat hover menu manages its own close via onMouseLeave
  };

  const chatBadge = totalUnread > 0
    ? <Badge color="brand" type="modern" size="sm">{totalUnread}</Badge>
    : undefined;

  // Dynamic nav items — Projects entry comes from API, Chat entry wires hover menu
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
      { divider: true, label: "General" },
      { label: "Office", href: "/office", icon: Map01 },
      {
        label: "Chat",
        icon: MessageChatCircle as FC<{ className?: string }>,
        badge: chatBadge,
        href: "/chat",
        onMouseEnter: () => {
          cancelHoverClose();
          if (pathname !== '/chat' && !pathname.startsWith('/chat/')) {
            setChatHoverOpen(true);
          }
        },
        onMouseLeave: () => {
          startHoverClose();
        },
      },
      {
        label: "Projects",
        icon: Rows01,
        href: "/projects",
        items: [
          ...projectItems,
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
  }, [projects, chatBadge, pathname, cancelHoverClose, startHoverClose]);

  const showSecondaryPanel = activePanel === 'agents';
  const secondaryPanelContent = activePanel === 'agents'
    ? <AgentBoardContent />
    : null;

  return (
    <div className="flex h-screen flex-col bg-primary lg:flex-row">
      <AnimatedSidebar
        activeUrl={pathname}
        items={navItems}
        featuredCards={nodeCards}
        isSlim={isSlim}
        onToggle={handleToggle}
        secondaryPanel={secondaryPanelContent}
        showSecondaryPanel={showSecondaryPanel}
        keepHovering={chatHoverOpen}
        onPointerLeave={handleSidebarLeave}
      />

      <main className="flex flex-1 flex-col self-stretch overflow-auto">
        {children}
      </main>

      {chatHoverOpen && pathname !== '/chat' && !pathname.startsWith('/chat/') && (
        <ChatHoverMenu
          channels={channels}
          dms={dms}
          totalUnread={totalUnread}
          onSelectConversation={(id) => handleOpenWorkspace(id)}
          onSelectAgent={handleSelectAgent}
          onOpenWorkspace={() => handleOpenWorkspace()}
          onHoverEnter={cancelHoverClose}
          onHoverLeave={startHoverClose}
          onClose={() => setChatHoverOpen(false)}
        />
      )}

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
      <MyParticipantProvider>
        <DashboardContent>{children}</DashboardContent>
      </MyParticipantProvider>
    </AgentBoardProvider>
  );
}
