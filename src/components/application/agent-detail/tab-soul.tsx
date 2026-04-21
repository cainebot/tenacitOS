"use client";

// Phase 69 — SOUL tab (Plan 69-02).
// Read-only viewer for agent's SOUL.md. Edit gates through approvals queue.
// Source: Figma sketch 004 variant B.
//
// BLOCKING-2: consumes `AgentRow`; reads the Phase 62 `soul_content` column.
// SECURITY T3: body renders as a React text child inside <pre> — React
// auto-escapes, no dangerouslySetInnerHTML.

import { useState, type FC } from "react";
import { Badge, Button, cx } from "@circos/ui";
import { Copy01, Edit01 } from "@untitledui/icons";
import type { AgentRow } from "@/types/supabase";

export const TabSoul: FC<{ agent: AgentRow; onEdit?: () => void }> = ({ agent, onEdit }) => {
  const [copied, setCopied] = useState(false);
  const body = agent.soul_content ?? "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — clipboard may not be available
    }
  };

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-xl border border-secondary bg-secondary">
      <header className="flex items-center gap-3 border-b border-secondary px-6 py-5">
        <h3 className="text-lg font-semibold text-primary [font-family:var(--font-display)]">
          SOUL.md
        </h3>
        <div className="ml-auto flex items-center gap-2">
          <Badge type="modern" color="gray" size="md">
            {body.length.toLocaleString()} chars
          </Badge>
          <Button color="tertiary" size="md" iconLeading={Copy01} onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button color="secondary" size="md" iconLeading={Edit01} onClick={onEdit}>
            Edit
          </Button>
        </div>
      </header>
      {body.length === 0 ? (
        <div className="px-6 py-5 text-sm text-tertiary">No SOUL content set.</div>
      ) : (
        <pre
          className={cx(
            "max-h-[600px] overflow-auto px-6 py-5",
            "text-sm leading-relaxed text-secondary",
            "[font-family:var(--font-code)]",
          )}
        >
          {body}
        </pre>
      )}
    </article>
  );
};
