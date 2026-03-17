"use client";

import { RealtimeProvider } from "@/components/RealtimeProvider";
import { DashboardSidebar } from "@/components/organisms/DashboardSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RealtimeProvider>
      <div className="flex min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
        <DashboardSidebar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </RealtimeProvider>
  );
}
