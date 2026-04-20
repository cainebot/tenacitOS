"use client";

// Phase 69 — Instructions tab.
// Source: Figma node 17036:109689 (B · Intrucciones).
// 2-col card: Files panel (266px) + viewer (header + Code Snippet body).
// Code Snippet pattern composed locally — @circos/ui no exporta CodeSnippet aún.
//
// BLOCKING-2: consumes `AgentRow`. SOUL body reads from the Phase 62
// `soul_content` column. The remaining "Tools / Agents / Memoy / Heartbeat"
// files are placeholder mock bodies until Plan 69-09 lands the real
// instruction-file data-model — clearly labelled as such in the UI.

import { useMemo, useState, type FC } from "react";
import { Badge, Button, ButtonUtility, cx } from "@circos/ui";
import { Copy03, Edit05, File06, FileHeart02, Plus } from "@untitledui/icons";
import type { ComponentType, SVGProps } from "react";
import type { AgentRow } from "@/types/supabase";
import { IconPicker } from "./icon-picker";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

interface InstructionFile {
  id: string;
  name: string;
  icon: IconType;
  body: string;
  count: number;
}

const buildFiles = (agent: AgentRow): InstructionFile[] => {
  const soul = agent.soul_content || `# ${agent.name} — SOUL.md`;
  return [
    {
      id: "soul",
      name: "Soul.md",
      icon: FileHeart02,
      body: soul,
      count: soul.split("\n").length,
    },
    {
      id: "tools",
      name: "Tools.md",
      icon: File06,
      body: `# Tools — ${agent.name}\n\n(Placeholder — wired in Plan 69-09.)`,
      count: 3,
    },
    {
      id: "agents",
      name: "Agents.md",
      icon: File06,
      body: `# Agents directory\n\n(Placeholder — wired in Plan 69-09.)`,
      count: 3,
    },
    {
      id: "memoy",
      name: "Memoy.md",
      icon: File06,
      body: `# Memory — ${agent.name}\n\n(Placeholder — wired in Plan 69-09.)`,
      count: 3,
    },
    {
      id: "heartbeat",
      name: "Heartbeat.md",
      icon: File06,
      body: `# Heartbeat — ${agent.name}\n\n(Placeholder — wired in Plan 69-09.)`,
      count: 3,
    },
  ];
};

export const TabInstructions: FC<{ agent: AgentRow; onEdit?: () => void }> = ({
  agent,
  onEdit,
}) => {
  const baseFiles = useMemo(() => buildFiles(agent), [agent]);
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
  const lines = active.body.split("\n");
  const charCount = active.body.length;

  const handleIconChange = (icon: IconType) => {
    setIconOverrides((prev) => ({ ...prev, [active.id]: icon }));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(active.body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
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
                    {file.count}
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
              {charCount.toLocaleString()} chars
            </Badge>
            <Button color="tertiary" size="sm" iconTrailing={Copy03} onClick={handleCopy}>
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button color="secondary" size="sm" iconTrailing={Edit05} onClick={onEdit}>
              Edit
            </Button>
          </div>
        </header>

        {/* Code Snippet pattern */}
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
      </section>
    </article>
  );
};
