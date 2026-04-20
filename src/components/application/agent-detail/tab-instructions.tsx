"use client";

// Phase 69 — Instructions tab (Plan 69-09 real-data wiring).
// Source: Figma node 17036:109689 (B · Intrucciones).
// 2-col card: Files panel (266px) + viewer (header + Code Snippet body).
// Code Snippet pattern composed locally — @circos/ui no exporta CodeSnippet aún.
//
// Plan 69-09 contract (v1 read-only):
//   - Soul.md  → `agent.soul_content` (real column from AgentRow).
//   - Tools.md / Agents.md / Memoy.md / Heartbeat.md → render EMPTY STATE.
//     No mock bodies are fabricated (per SPEC-69-INSTR-02/03 + BLOCKING mock
//     removal). The write path for these four files ships in a later phase.
//   - Copy button → `navigator.clipboard.writeText(active.body)` (unchanged).
//   - Edit button → `onEdit()` callback (Soul.md only routes to /agents/:slug/edit;
//     other files are read-only in v1; Edit remains a no-op for them).
//   - Save button → `TODO(plan-10)` no-op that `console.warn`s; real write path
//     lives in Plan 02's AgentForm and flows through /api/agents/[id] + approvals.
//
// SECURITY T3: Body is rendered as a React text child inside <pre>; React
// auto-escapes, no raw-HTML inject APIs are used. Stored-XSS via agent
// `soul_content` is mitigated.

import { useMemo, useState, type ComponentType, type FC, type SVGProps } from "react";
import { Badge, Button, ButtonUtility, cx } from "@circos/ui";
import { Copy03, Edit05, File06, FileHeart02, Plus, SearchLg } from "@untitledui/icons";
import type { AgentRow } from "@/types/supabase";
import { IconPicker } from "./icon-picker";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

interface InstructionFile {
  id: string;
  name: string;
  icon: IconType;
  body: string;
}

// Build the canonical 5-file list for the Instructions tab.
// Only Soul.md has a real data source in v1; the rest have an empty body
// which triggers the Figma empty-state in the viewer panel.
const buildInstructionFiles = (agent: AgentRow): InstructionFile[] => {
  const soulBody = agent.soul_content ?? "";
  return [
    { id: "soul", name: "Soul.md", icon: FileHeart02, body: soulBody },
    { id: "tools", name: "Tools.md", icon: File06, body: "" },
    { id: "agents", name: "Agents.md", icon: File06, body: "" },
    { id: "memoy", name: "Memoy.md", icon: File06, body: "" },
    { id: "heartbeat", name: "Heartbeat.md", icon: File06, body: "" },
  ];
};

// Line-count badge in the file list. 0 for empty bodies (per v1 contract).
const countLines = (body: string): number => (body.length === 0 ? 0 : body.split("\n").length);

export const TabInstructions: FC<{ agent: AgentRow; onEdit?: () => void }> = ({
  agent,
  onEdit,
}) => {
  const baseFiles = useMemo(() => buildInstructionFiles(agent), [agent]);
  const [iconOverrides, setIconOverrides] = useState<Record<string, IconType>>({});
  const files = useMemo(
    () =>
      baseFiles.map((f) => (iconOverrides[f.id] ? { ...f, icon: iconOverrides[f.id] } : f)),
    [baseFiles, iconOverrides],
  );
  const [activeId, setActiveId] = useState<string>(baseFiles[0]?.id ?? "soul");
  const [copied, setCopied] = useState(false);

  const active = files.find((f) => f.id === activeId) ?? files[0];
  const ActiveIcon = active.icon;
  const isEmpty = active.body.length === 0;
  const lines = isEmpty ? [] : active.body.split("\n");
  const charCount = active.body.length;
  // Display-only version placeholder until a real versioning column lands.
  const displayVersion = "1";

  const handleIconChange = (icon: IconType) => {
    setIconOverrides((prev) => ({ ...prev, [active.id]: icon }));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(active.body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — clipboard may not be available
    }
  };

  const handleEdit = () => {
    // Soul.md → route to /agents/:slug/edit via parent-provided onEdit.
    // Other files have no write path in v1 — the Edit button is a no-op
    // and logs a console.warn so operators notice missing wiring in dev.
    if (active.id === "soul") {
      onEdit?.();
      return;
    }
    console.warn(
      `[tab-instructions] Edit is read-only for ${active.name} in v1 — ships in a later phase.`,
    );
  };

  return (
    <article className="flex w-full items-stretch overflow-hidden rounded-xl border border-secondary bg-secondary">
      {/* Files panel */}
      <aside className="flex w-[266px] shrink-0 flex-col gap-2 border-r border-primary bg-primary px-2 py-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-base font-semibold text-white [font-family:var(--font-display)]">
            Files
          </h3>
          <ButtonUtility
            size="xs"
            color="secondary"
            icon={Plus}
            tooltip="Add new instruction file"
            aria-label="Add new instruction file"
          />
        </div>
        <ul className="flex flex-col">
          {files.map((file) => {
            const isActive = file.id === active.id;
            const Icon = file.icon;
            return (
              <li key={file.id} className="py-0.5">
                <button
                  type="button"
                  onClick={() => setActiveId(file.id)}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
                    isActive ? "bg-active" : "hover:bg-primary_hover",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="size-5 shrink-0 text-fg-quaternary" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-secondary">
                    {file.name}
                  </span>
                  <Badge type="modern" size="sm">
                    {countLines(file.body)}
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Viewer */}
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-secondary px-5 py-4">
          <IconPicker value={ActiveIcon} onChange={handleIconChange} />
          <h2 className="text-base font-bold text-primary [font-family:var(--font-display)]">
            {active.name.replace(/^([^.]+)/, (s) => s.toUpperCase())}
          </h2>
          <div className="ml-auto flex items-center gap-3">
            <Badge type="modern" size="sm">
              {charCount.toLocaleString()} chars · v{displayVersion}
            </Badge>
            <Button
              color="tertiary"
              size="sm"
              iconTrailing={Copy03}
              onClick={handleCopy}
              isDisabled={isEmpty}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button color="secondary" size="sm" iconTrailing={Edit05} onClick={handleEdit}>
              Edit
            </Button>
          </div>
        </header>

        {isEmpty ? (
          /* Empty state — Plan 69-02 Skills-tab pattern (modern FeaturedIcon) */
          <div
            data-testid="instructions-empty-state"
            className="flex min-h-[360px] flex-1 items-center justify-center px-5 py-10"
          >
            <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
              {/* Featured icon · modern skeuomorphic pattern (composed locally — @circos/ui FeaturedIcon lacks theme="modern") */}
              <div className="flex size-12 items-center justify-center rounded-[10px] border border-primary bg-primary shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05),inset_0px_0px_0px_1px_rgba(12,14,18,0.18),inset_0px_-2px_0px_0px_rgba(12,14,18,0.05)]">
                <SearchLg className="size-6 text-fg-quaternary" aria-hidden />
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-lg font-semibold text-primary">No content yet</p>
                <p className="text-sm text-tertiary">
                  {active.name} has no content wired for {agent.name} in v1. The write path
                  ships in a later phase.
                </p>
              </div>
              <Button color="primary" size="md" iconLeading={Plus} isDisabled>
                Create file (coming soon)
              </Button>
            </div>
          </div>
        ) : (
          /* Code Snippet pattern */
          <div className="flex items-start px-5 py-4">
            <div className="flex w-full overflow-hidden rounded-xl border border-secondary bg-primary">
              <div className="flex shrink-0 flex-col items-end border-r border-secondary bg-secondary px-4 py-5">
                {lines.map((_, i) => (
                  <span
                    key={i}
                    className="text-right text-sm leading-5 text-quaternary [font-family:var(--font-code)]"
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
              <pre
                data-testid="instructions-body"
                className={cx(
                  "min-w-0 flex-1 overflow-auto px-5 py-5",
                  "text-sm leading-5 text-primary",
                  "[font-family:var(--font-code)] whitespace-pre-wrap",
                )}
              >
                {active.body}
              </pre>
            </div>
          </div>
        )}
      </section>
    </article>
  );
};
