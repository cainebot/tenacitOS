// Phase 64.5.2-04 — dashboard root mounts MeshTile inside a section.
// The (dashboard)/layout.tsx already owns the page-level landmark; nesting
// a second one here would violate landmark rules (Codex Plan04-MEDIUM-layout).

import { MeshTile } from "@/components/application/mesh-tile/mesh-tile";

export default function DashboardPage() {
  return (
    <section className="p-6">
      <MeshTile lang="es" />
    </section>
  );
}
