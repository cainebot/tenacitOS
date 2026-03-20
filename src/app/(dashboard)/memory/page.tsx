"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, Edit3, RefreshCw, Brain } from "lucide-react";
import { FileTree, FileNode } from "@/components/FileTree";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { MarkdownPreview } from "@/components/MarkdownPreview";

type ViewMode = "edit" | "preview";

interface Workspace {
  id: string;
  name: string;
  emoji: string;
  path: string;
  agentName?: string;
}

export default function MemoryPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasUnsavedChanges = content !== originalContent;

  // Load workspaces
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

  const loadFileTree = useCallback(async (workspace: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/files?workspace=${encodeURIComponent(workspace)}`);
      if (!res.ok) throw new Error("Failed to load files");
      const data = await res.json();
      setFiles(data);
    } catch (err) {
      setError("Failed to load file tree");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadFile = useCallback(async (workspace: string, path: string) => {
    try {
      setError(null);
      const res = await fetch(
        `/api/files?workspace=${encodeURIComponent(workspace)}&path=${encodeURIComponent(path)}`
      );
      if (!res.ok) throw new Error("Failed to load file");
      const data = await res.json();
      setContent(data.content);
      setOriginalContent(data.content);
    } catch (err) {
      setError("Failed to load file");
      console.error(err);
    }
  }, []);

  const saveFile = useCallback(async () => {
    if (!selectedWorkspace || !selectedPath) return;
    const res = await fetch("/api/files", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace: selectedWorkspace, path: selectedPath, content }),
    });
    if (!res.ok) throw new Error("Failed to save file");
    setOriginalContent(content);
  }, [selectedWorkspace, selectedPath, content]);

  const handleSelectFile = useCallback(
    async (path: string) => {
      if (hasUnsavedChanges) {
        const confirmed = window.confirm("You have unsaved changes. Discard them?");
        if (!confirmed) return;
      }
      setSelectedPath(path);
      if (selectedWorkspace) await loadFile(selectedWorkspace, path);
    },
    [hasUnsavedChanges, selectedWorkspace, loadFile]
  );

  const handleWorkspaceSelect = (workspaceId: string) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm("You have unsaved changes. Discard them?");
      if (!confirmed) return;
    }
    setSelectedWorkspace(workspaceId);
    setSelectedPath(null);
    setContent("");
    setOriginalContent("");
  };

  useEffect(() => {
    if (selectedWorkspace) loadFileTree(selectedWorkspace);
  }, [selectedWorkspace, loadFileTree]);

  useEffect(() => {
    if (files.length > 0 && !selectedPath) {
      const memoryMd = files.find((f) => f.name === "MEMORY.md" && f.type === "file");
      const firstFile = memoryMd || files.find((f) => f.type === "file");
      if (firstFile) handleSelectFile(firstFile.path);
    }
  }, [files, selectedPath, handleSelectFile]);

  const selectedWorkspaceData = workspaces.find((w) => w.id === selectedWorkspace);

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-primary mb-1">
          Memory Browser
        </h1>
        <p className="font-[family-name:var(--font-text)] text-[13px] text-secondary">
          Ver y editar archivos de memoria de los agentes
        </p>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden border-t border-primary">
        {/* ── LEFT SIDEBAR: Workspace list ────────────────────────────────── */}
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
                  "w-full flex items-center gap-2.5 px-4 py-[9px] border-none cursor-pointer text-left transition-all duration-[120ms] ease-in-out",
                  isSelected
                    ? "bg-brand-600/10 border-l-[3px] border-l-[var(--brand-600)]"
                    : "bg-transparent border-l-[3px] border-l-transparent",
                ].join(" ")}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "var(--bg-quaternary)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                <span className="text-lg leading-none shrink-0">{workspace.emoji}</span>
                <div className="min-w-0">
                  <div
                    className={[
                      "font-[family-name:var(--font-display)] text-[13px] whitespace-nowrap overflow-hidden text-ellipsis",
                      isSelected
                        ? "font-semibold text-brand-600"
                        : "font-normal text-primary",
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

        {/* ── RIGHT PANEL ──────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {selectedWorkspace && selectedWorkspaceData ? (
            <>
              {/* Toolbar bar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-primary bg-secondary shrink-0 gap-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-brand-600" />
                  <span className="font-[family-name:var(--font-display)] text-[13px] font-semibold text-primary">
                    {selectedWorkspaceData.name}
                  </span>
                  {selectedPath && (
                    <>
                      <span className="text-quaternary text-[13px]">/</span>
                      <span className="font-[family-name:var(--font-code)] text-[12px] text-quaternary overflow-hidden text-ellipsis whitespace-nowrap max-w-[300px]">
                        {selectedPath}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Refresh */}
                  <button
                    onClick={() => selectedWorkspace && loadFileTree(selectedWorkspace)}
                    title="Refresh"
                    className="p-[5px_7px] rounded-md bg-transparent border-none cursor-pointer text-quaternary flex items-center transition-all duration-[120ms] ease-in-out hover:text-primary"
                  >
                    <RefreshCw size={14} />
                  </button>

                  {/* View toggle */}
                  <div className="flex bg-primary rounded-md p-[3px] gap-0.5">
                    <button
                      onClick={() => setViewMode("preview")}
                      className={[
                        "flex items-center gap-[5px] px-2.5 py-[5px] rounded text-xs font-semibold border-none cursor-pointer transition-all duration-[120ms] ease-in-out",
                        viewMode === "preview"
                          ? "bg-brand-600 text-gray-50"
                          : "bg-transparent text-quaternary",
                      ].join(" ")}
                    >
                      <Eye size={13} />
                      Preview
                    </button>
                    <button
                      onClick={() => setViewMode("edit")}
                      className={[
                        "flex items-center gap-[5px] px-2.5 py-[5px] rounded text-xs font-semibold border-none cursor-pointer transition-all duration-[120ms] ease-in-out",
                        viewMode === "edit"
                          ? "bg-brand-600 text-gray-50"
                          : "bg-transparent text-quaternary",
                      ].join(" ")}
                    >
                      <Edit3 size={13} />
                      Edit
                    </button>
                  </div>
                </div>
              </div>

              {/* File tree + editor */}
              <div className="flex flex-1 overflow-hidden">
                {/* File tree */}
                <div className="w-[230px] shrink-0 border-r border-primary overflow-y-auto">
                  {isLoading ? (
                    <div className="p-6 text-center text-secondary">
                      Loading...
                    </div>
                  ) : error && files.length === 0 ? (
                    <div className="p-6 text-center text-error-600">
                      {error}
                    </div>
                  ) : (
                    <FileTree files={files} selectedPath={selectedPath} onSelect={handleSelectFile} />
                  )}
                </div>

                {/* Editor / Preview */}
                <div className="flex-1 flex flex-col min-w-0 bg-primary overflow-hidden">
                  {selectedPath ? (
                    <div className="flex-1 min-h-0 overflow-auto">
                      {viewMode === "edit" ? (
                        <MarkdownEditor
                          content={content}
                          onChange={setContent}
                          onSave={saveFile}
                          hasUnsavedChanges={hasUnsavedChanges}
                        />
                      ) : (
                        <MarkdownPreview content={content} />
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-quaternary">
                      <div className="text-center">
                        <Brain className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-sm">Selecciona un archivo para ver o editar</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-quaternary text-sm">
              Selecciona un workspace
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
