"use client";

// Phase 69 — dashboard mounts NodeStatusStrip above MeshTile.
// SPEC-69-POST-12: MeshTile is preserved intact (Phase 64.5.2-04).
// (dashboard)/layout.tsx owns the page-level landmark; this section is content.
//
// BLOCKING-1/3 (2026-04-20): reads nodes from the real `useRealtimeNodes`
// hook (source of truth = Supabase `nodes` table + Realtime). No fixture
// import. The strip gracefully handles loading/error/empty states.

import { MeshTile } from "@/components/application/mesh-tile/mesh-tile";
import { NodeStatusStrip } from "@/components/application/node-status-strip";
import { useRealtimeNodes } from "@/hooks/useRealtimeNodes";

export default function DashboardPage() {
  const { activeNodes, loading, error, resync } = useRealtimeNodes();

  return (
    <section className="flex w-full flex-col gap-8 px-12 pb-12">
      <NodeStatusStrip
        nodes={activeNodes}
        loading={loading}
        error={error}
        onRetry={() => void resync()}
      />
      <MeshTile lang="es" />
    </section>
  );
}
