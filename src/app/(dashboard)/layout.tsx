"use client";

import { usePathname } from "next/navigation";
import { RealtimeProvider } from "@/components/RealtimeProvider";
import { DashboardSidebar } from "@/components/organisms/DashboardSidebar";
import { AgentFilterProvider } from "@/contexts/AgentFilterContext";
import { AgentListPanel } from "@/components/organisms/AgentListPanel";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Show agent list panel only on single-board pages: /boards/[id]
  const isBoardDetailPage = /^\/boards\/[^/]+\/?$/.test(pathname);

  return (
    <RealtimeProvider>
      <AgentFilterProvider>
        <div className="flex h-screen bg-[var(--bg-primary)]">
          <DashboardSidebar />
          {isBoardDetailPage && <AgentListPanel />}
          <main className={`flex-1 overflow-auto ${isBoardDetailPage ? 'pt-4 px-0 pb-0' : 'p-6'}`}>
            {children}
          </main>
        </div>
      </AgentFilterProvider>
    </RealtimeProvider>
  );
}
