"use client";

// Phase 64.5.2-04 — single mesh node row.
// Renders avatar + node_id + tailscale_hostname + BadgeWithDot semaphore +
// "Re-run onboarding" button. Exports `nodeColor()` so the unit test in
// node-color.test.ts can probe the state machine in pure-function isolation
// without mounting React.

import { useState } from "react";
import type { FC } from "react";
import { Avatar, Badge, BadgeWithDot, Button, cx } from "@circos/ui";
import { Server01 } from "@untitledui/icons";
import type { NodeRow } from "@/types/supabase";
import { ReprovisionDialog } from "./reprovision-dialog";

// ---------------------------------------------------------------------------
// nodeColor — UX-MESH-03 state machine (Codex Plan04-HIGH-#2)
//
// Rules, evaluated top-to-bottom:
//   1. status === "offline" → "error" (red) — dominates everything else
//   2. age > 300_000ms (>5min) → "error" (red) — heartbeat_stale
//   3. age < 120_000ms (<2min) AND localOk → "success" (green)
//   4. else → "warning" (amber) — stale 120-300s OR fresh-but-!localOk
// ---------------------------------------------------------------------------
export function nodeColor(
  n: NodeRow,
  localOk: boolean,
  now: number = Date.now(),
): "success" | "warning" | "error" {
  if (n.status === "offline") return "error";
  const hb = n.last_heartbeat_at ? Date.parse(n.last_heartbeat_at) : 0;
  const ageMs = now - hb;
  if (ageMs > 300_000) return "error";
  if (ageMs < 120_000 && localOk) return "success";
  return "warning";
}

const COLOR_LABEL_ES: Record<"success" | "warning" | "error", string> = {
  success: "Activo",
  warning: "Degradado",
  error: "Caído",
};
const COLOR_LABEL_EN: Record<"success" | "warning" | "error", string> = {
  success: "Up",
  warning: "Degraded",
  error: "Down",
};

export interface MeshNodeRowProps {
  node: NodeRow;
  localOk: boolean;
  lang: "es" | "en";
}

export const MeshNodeRow: FC<MeshNodeRowProps> = ({ node, localOk, lang }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const color = nodeColor(node, localOk);
  const label = lang === "es" ? COLOR_LABEL_ES[color] : COLOR_LABEL_EN[color];

  return (
    <li
      className={cx(
        "flex items-center justify-between gap-4 rounded-md border border-secondary px-4 py-3",
        "bg-primary",
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar
          size="sm"
          initials={node.node_id.replace(/^circus-/, "").slice(0, 2).toUpperCase()}
          placeholderIcon={Server01}
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-primary">{node.node_id}</span>
          <span className="text-xs text-tertiary">
            {node.tailscale_hostname ?? (lang === "es" ? "(sin hostname)" : "(no hostname)")}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <BadgeWithDot color={color} type="pill-color" size="sm">
          {label}
        </BadgeWithDot>
        <Button
          size="sm"
          color="secondary"
          onClick={() => setDialogOpen(true)}
        >
          {lang === "es" ? "Re-ejecutar onboarding" : "Re-run onboarding"}
        </Button>
      </div>
      {dialogOpen && (
        <ReprovisionDialog
          nodeId={node.node_id}
          lang={lang}
          onClose={() => setDialogOpen(false)}
        />
      )}
      {/* Hidden Badge import keeps the symbol referenced for tree-shake guard */}
      <span className="hidden">
        <Badge size="sm" color="gray">_</Badge>
      </span>
    </li>
  );
};
