"use client";

import { useState, useEffect } from "react";
import { List, Grid3X3 } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FileBrowser } from "@/components/FileBrowser";

interface Workspace {
  id: string;
  name: string;
  emoji: string;
  path: string;
  agentName?: string;
}

export default function FilesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  useEffect(() => {
    fetch("/api/files/workspaces")
      .then((res) => res.json())
      .then((data) => {
        setWorkspaces(data.workspaces || []);
        if (data.workspaces.length > 0) {
          setSelectedWorkspace(data.workspaces[0].id);
        }
      })
      .catch(() => setWorkspaces([]));
  }, []);

  const handleWorkspaceSelect = (workspaceId: string) => {
    setSelectedWorkspace(workspaceId);
    setCurrentPath("");
  };

  const selectedWorkspaceData = workspaces.find((w) => w.id === selectedWorkspace);

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-1px] text-primary mb-1">
          File Browser
        </h1>
        <p className="font-[family-name:var(--font-text)] text-[13px] text-secondary">
          Navega por los workspaces y archivos de los agentes
        </p>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden border-t border-primary">
        {/* ── LEFT SIDEBAR: Workspace list ─────────────────────────────────── */}
        <aside className="w-[220px] shrink-0 border-r border-primary overflow-y-auto py-4 bg-secondary">
          <p className="text-[10px] font-bold tracking-[0.08em] text-quaternary px-4 pb-2 uppercase">
            Workspaces
          </p>

          {workspaces.map((workspace) => {
            const isSelected = selectedWorkspace === workspace.id;
            return (
              <button
                key={workspace.id}
                onClick={() => handleWorkspaceSelect(workspace.id)}
                className={[
                  "w-full flex items-center gap-[10px] px-4 py-[9px]",
                  "border-none cursor-pointer text-left transition-all duration-[120ms] ease-linear",
                  isSelected
                    ? "bg-brand-600/10 border-l-[3px] border-l-[var(--brand-600)]"
                    : "bg-transparent border-l-[3px] border-l-transparent hover:bg-quaternary",
                ].join(" ")}
              >
                <span className="text-[18px] leading-none shrink-0">{workspace.emoji}</span>
                <div className="min-w-0">
                  <div
                    className={[
                      "font-[family-name:var(--font-display)] text-[13px] whitespace-nowrap overflow-hidden text-ellipsis",
                      isSelected ? "font-semibold text-brand-600" : "font-normal text-primary",
                    ].join(" ")}
                  >
                    {workspace.name}
                  </div>
                  {workspace.agentName && (
                    <div className="text-[11px] text-quaternary whitespace-nowrap overflow-hidden text-ellipsis">
                      {workspace.agentName}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </aside>

        {/* ── RIGHT PANEL: File explorer ────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {selectedWorkspace && selectedWorkspaceData ? (
            <>
              {/* Breadcrumb bar + view toggle */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-primary bg-secondary shrink-0 gap-3">
                <div className="flex-1 min-w-0">
                  <Breadcrumbs
                    path={currentPath}
                    onNavigate={setCurrentPath}
                    prefix={selectedWorkspaceData.name}
                  />
                </div>

                {/* View mode toggle */}
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setViewMode("list")}
                    title="Vista lista"
                    className={[
                      "p-[5px_7px] rounded-[6px] border-none cursor-pointer flex items-center justify-center transition-all duration-[120ms] ease-linear",
                      viewMode === "list"
                        ? "bg-brand-600 text-gray-50"
                        : "bg-transparent text-quaternary",
                    ].join(" ")}
                  >
                    <List size={15} />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    title="Vista iconos"
                    className={[
                      "p-[5px_7px] rounded-[6px] border-none cursor-pointer flex items-center justify-center transition-all duration-[120ms] ease-linear",
                      viewMode === "grid"
                        ? "bg-brand-600 text-gray-50"
                        : "bg-transparent text-quaternary",
                    ].join(" ")}
                  >
                    <Grid3X3 size={15} />
                  </button>
                </div>
              </div>

              {/* File list */}
              <div className="flex-1 p-0">
                <FileBrowser
                  workspace={selectedWorkspace}
                  path={currentPath}
                  onNavigate={setCurrentPath}
                  viewMode={viewMode}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-quaternary text-sm">
              Selecciona un workspace para explorar sus archivos
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
