"use client";

// Phase 64.5.2-04 — Mesh health tile (UX-MESH-03 + UX-MESH-04).
// Top-level component mounted in (dashboard)/page.tsx inside <section>.
// Subscribes to Realtime nodes via useRealtimeNodes().activeNodes,
// polls /api/mesh/local-status via useLocalMeshStatus, and renders one
// MeshNodeRow per non-deprovisioned node.

import type { FC } from "react";
import { BadgeWithDot, cx } from "@circos/ui";
import { useRealtimeNodes } from "@/hooks/useRealtimeNodes";
import { useLocalMeshStatus } from "@/hooks/useLocalMeshStatus";
import { useErrorMessages } from "@/hooks/useErrorMessages";
import { MeshNodeRow } from "./mesh-node-row";

export interface MeshTileProps {
  lang?: "es" | "en";
}

export const MeshTile: FC<MeshTileProps> = ({ lang = "es" }) => {
  const { activeNodes, loading: nodesLoading, error: nodesError } = useRealtimeNodes();
  const local = useLocalMeshStatus();
  const { lookup } = useErrorMessages(lang);

  const localOk = local.tailscale_daemon_ok;
  const headerBadgeText = !localOk
    ? lookup("tailscale_not_logged_in").title
    : null;

  return (
    <article
      className={cx(
        "flex flex-col gap-4 rounded-lg border border-secondary bg-primary p-6",
        "shadow-sm",
      )}
      aria-label={lang === "es" ? "Estado de la mesh" : "Mesh status"}
    >
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-md font-semibold text-primary">
            {lang === "es" ? "Mesh" : "Mesh"}
          </h2>
          <span className="text-xs text-tertiary">
            {nodesLoading
              ? lang === "es"
                ? "Cargando nodos..."
                : "Loading nodes..."
              : `${activeNodes.length} ${lang === "es" ? "nodos activos" : "active nodes"}`}
          </span>
        </div>
        {headerBadgeText && (
          <BadgeWithDot color="warning" type="pill-color" size="sm">
            {headerBadgeText}
          </BadgeWithDot>
        )}
      </header>

      {nodesError && (
        <p className="text-sm text-error-primary">{nodesError}</p>
      )}

      {!nodesLoading && activeNodes.length === 0 && !nodesError && (
        <p className="text-sm text-tertiary">
          {lang === "es"
            ? "No hay nodos registrados todavía. Ejecuta `circos provision <node>` para añadir uno."
            : "No nodes registered yet. Run `circos provision <node>` to add one."}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {activeNodes.map((node) => (
          <MeshNodeRow
            key={node.node_id}
            node={node}
            localOk={localOk}
            lang={lang}
          />
        ))}
      </ul>
    </article>
  );
};
