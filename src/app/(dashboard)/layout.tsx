"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import type { FC } from "react";
import {
  BarChartSquare02,
  Building06,
  Calendar,
  ChevronRight,
  Data,
  MessageCircle01,
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
import { PROJECT_COVER_COLORS, PROJECT_COVER_ICONS, type ProjectCoverColorId, type ProjectCoverIcon } from "@/components/application/project-cover/project-cover";
import { useConversations } from "@/features/chat/hooks/use-conversations";
import { ChatPreviewPanel } from "@/features/chat/components/chat-preview-panel";
import { ChatWorkspace } from "@/features/chat/components/chat-workspace";

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { agentBoardActive, setAgentBoardActive } = useAgentBoard();
  const { nodes } = useRealtimeNodes();
  const { totalUnread, channels, dms, loading, error, refetch } = useConversations();

  // Chat state
  const [chatWorkspaceOpen, setChatWorkspaceOpen] = useState(false);
  const [initialConversationId, setInitialConversationId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');

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
      setActivePanel('agents');
    }
  }, [agentBoardActive]);

  // Sync activePanel back to agentBoard state
  useEffect(() => {
    if (activePanel !== 'agents' && agentBoardActive) {
      setAgentBoardActive(false);
    }
  }, [activePanel, agentBoardActive, setAgentBoardActive]);

  const isSlim = isCollapsed;

  const handleToggle = () => {
    setIsCollapsed((prev) => !prev);
  };

  const handleOpenWorkspace = (conversationId?: string) => {
    setInitialConversationId(conversationId ?? null);
    setChatWorkspaceOpen(true);
    setActivePanel('none'); // close preview when workspace opens
  };

  const handleNewMessage = () => {
    setChatWorkspaceOpen(true);
    setActivePanel('none');
  };

  const handleSidebarLeave = () => {
    // Close chat preview when mouse leaves sidebar area
    if (activePanel === 'chat-preview') {
      setActivePanel('none');
    }
  };

  // Build Chat unread badge
  const chatBadge = totalUnread > 0
    ? <Badge color="brand" type="modern" size="sm">{totalUnread}</Badge>
    : undefined;

  // Navigation items — built inside component to support onClick for Chat
  const navItems: (NavItemType | NavItemDividerType)[] = [
    { divider: true, label: "General" },
    { label: "Dashboard", href: "/", icon: BarChartSquare02 },
    {
      label: "Projects",
      icon: Rows01,
      href: "/projects",
      items: [
        { label: "Sales Pipeline", icon: ProjectIcon({ color: "orange", icon: "rocket" }), badge: <Badge color="gray" type="modern" size="sm">4</Badge>, href: "/projects/sales-pipeline" },
        { label: "Tasks", icon: ProjectIcon({ color: "blue", icon: "clipboard-list" }), href: "/projects/tasks" },
        { label: "See all", href: "/projects", iconTrailing: ChevronRight },
      ],
    },
    { label: "Organization", href: "/organization", icon: Building06 },
    { label: "Calendar", href: "/calendar", icon: Calendar },
    { divider: true, label: "Agents" },
    { label: "Agents", href: "/agents", icon: BotIcon },
    { label: "Skills", href: "/skills", icon: Data },
    { label: "Workspaces", href: "/workspaces", icon: Server01 },
    { divider: true, label: "Communication" },
    {
      label: "Chat",
      icon: MessageCircle01 as FC<{ className?: string }>,
      badge: chatBadge,
      onClick: () => {
        // Click → open full workspace
        setChatWorkspaceOpen(true);
        setActivePanel('none');
      },
      onMouseEnter: () => {
        // Hover → show floating preview panel
        if (!chatWorkspaceOpen) {
          setActivePanel('chat-preview');
          setIsCollapsed(true);
        }
      },
    },
  ];

  // Determine secondary panel content and visibility
  const showSecondaryPanel = activePanel !== 'none';
  const secondaryPanelContent = activePanel === 'chat-preview'
    ? <ChatPreviewPanel onOpenWorkspace={handleOpenWorkspace} onNewMessage={handleNewMessage} />
    : activePanel === 'agents'
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
        onPointerLeave={handleSidebarLeave}
      />

      <main className="flex flex-1 flex-col items-start self-stretch gap-8 overflow-auto">
        {children}
      </main>

      {chatWorkspaceOpen && (
        <ChatWorkspace
          onClose={() => setChatWorkspaceOpen(false)}
          initialConversationId={initialConversationId}
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
