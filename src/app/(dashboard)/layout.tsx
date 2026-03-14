"use client";

import { Dock, TopBar, StatusBar } from "@/components/TenacitOS";
import { RealtimeProvider } from "@/components/RealtimeProvider";
import NodeStatusStrip from "@/components/NodeStatusStrip";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RealtimeProvider>
      <div className="tenacios-shell" style={{ minHeight: "100vh" }}>
        <Dock />
        <TopBar />

        <main
          style={{
            marginLeft: "68px", // Width of dock
            marginTop: "48px", // Height of top bar
            marginBottom: "32px", // Height of status bar
            minHeight: "calc(100vh - 48px - 32px)",
            padding: "24px",
          }}
        >
          <NodeStatusStrip />
          {children}
        </main>

        <StatusBar />
      </div>
    </RealtimeProvider>
  );
}
