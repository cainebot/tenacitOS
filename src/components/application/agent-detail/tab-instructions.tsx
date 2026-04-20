"use client";

// Quick 260420-nxb — Paperclip parity: inline edit always on, dirty-driven
// save/cancel, unified SOUL save, advanced section. See PLAN + CONTEXT in
// .planning/quick/260420-nxb-instructions-tab-paridad-funcional-con-p/.
//
// Phase 69 Plan 10 (original) — Instructions tab (live CRUD via /api/agents/[id]/instructions).
//
// Source: Figma node 17036:109689 (B · Intrucciones).
// Plan 69-09 shipped the read-only surface; Plan 69-10 wired live CRUD.
// Quick 260420-nxb refactors the surface to Paperclip parity:
//   - `<TextArea>` is always active when a file is selected (no Edit toggle).
//   - Save + Cancel render only when draft !== saved (dirty).
//   - SOUL.md save routes to PATCH /api/agents/[id] { changes: { soul_content } }.
//   - Non-SOUL save routes to PATCH /api/agents/[id]/instructions/[file_name] { content }.
//   - Delete button is visible only for `active.is_canonical === false` files.
//   - Advanced collapsible section at the bottom of the viewer panel
//     (Mode / Root path / Entry file) — UI-only placeholder, persistence
//     tracked as F-69-11 in .planning/phases/69-ui-integration/FOLLOW-UPS.md.
//
// SECURITY T3: all content rendered as React text children inside <TextArea>.
// No dangerouslySetInnerHTML. file_name + icon come from the server-side
// whitelist-validated response.

import { useCallback, useEffect, useMemo, useState, type ComponentType, type SVGProps } from "react";
import { Badge, Button, ButtonUtility, TextArea, cx } from "@circos/ui";
import * as UntitledIcons from "@untitledui/icons";
import {
  ChevronDown,
  ChevronRight,
  Copy03,
  File06,
  FileHeart02,
  Plus,
  Trash02,
  X,
} from "@untitledui/icons";
import type { AgentRow } from "@/types/supabase";
import { IconPicker } from "./icon-picker";
import {
  useInstructionFiles,
  type InstructionFileRow,
} from "@/hooks/useInstructionFiles";
import { CreateInstructionFileModal } from "./create-instruction-file-modal";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

const ICON_INDEX = UntitledIcons as unknown as Record<string, IconType>;

function resolveIcon(name: string | undefined): IconType {
  if (typeof name === "string" && name in ICON_INDEX) {
    const candidate = ICON_INDEX[name];
    if (typeof candidate === "function" || typeof candidate === "object") {
      return candidate;
    }
  }
  return File06;
}

const countLines = (body: string): number => (body.length === 0 ? 0 : body.split("\n").length);

// Threshold helper for confirm-before-discard on Cancel. Guards against
// destroying a large chunk of unsaved work; small diffs revert silently.
function isSignificantDiff(draft: string, saved: string): boolean {
  if (draft === saved) return false;
  if (Math.abs(draft.length - saved.length) > 200) return true;
  if (draft.split("\n").length !== saved.split("\n").length) return true;
  return false;
}

export const TabInstructions: React.FC<{
  agent: AgentRow;
  // onEdit retained for backwards-compat with parent page — unused since
  // Quick 260420-nxb unified SOUL save inline.
  onEdit?: () => void;
}> = ({ agent }) => {
  const { files, loading, error, refetch } = useInstructionFiles(agent);
  const [activeName, setActiveName] = useState<string>("SOUL.md");
  const [copied, setCopied] = useState(false);
  const [rootPathCopied, setRootPathCopied] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InstructionFileRow | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const active = useMemo<InstructionFileRow | null>(() => {
    if (files.length === 0) return null;
    return files.find((f) => f.file_name === activeName) ?? files[0];
  }, [files, activeName]);

  const ActiveIcon = resolveIcon(active?.icon);
  const isSoul = active?.file_name === "SOUL.md" || active?.file_type === "soul";
  const charCount = active?.content.length ?? 0;
  const isDirty = draftContent !== savedContent;

  // Sync draft/saved to the active file. If the user has a dirty draft we
  // preserve it across server-side refetches to avoid clobbering typing,
  // but always keep savedContent authoritative on the server value.
  useEffect(() => {
    if (!active) {
      setDraftContent("");
      setSavedContent("");
      return;
    }
    setSavedContent(active.content);
    setDraftContent((prev) => (prev === savedContent ? active.content : prev));
    // The dependency array intentionally reacts to file switches + server content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.file_name, active?.content]);

  const handleCopy = async () => {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const rootPath = useMemo(
    () => `/agents/${agent.slug ?? agent.agent_id}/`,
    [agent.slug, agent.agent_id],
  );

  const handleCopyRootPath = async () => {
    try {
      await navigator.clipboard.writeText(rootPath);
      setRootPathCopied(true);
      window.setTimeout(() => setRootPathCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleSave = useCallback(async () => {
    if (!active) return;
    setSaving(true);
    setOpError(null);
    try {
      const url = isSoul
        ? `/api/agents/${encodeURIComponent(agent.agent_id)}`
        : `/api/agents/${encodeURIComponent(agent.agent_id)}/instructions/${encodeURIComponent(active.file_name)}`;
      const body = isSoul
        ? { soul_content: draftContent }
        : { content: draftContent };

      const res = await fetch(url, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        setOpError(errBody.message ?? errBody.error ?? `Save failed (${res.status})`);
        setSaving(false);
        return;
      }
      setSavedContent(draftContent);
      setSaving(false);
      await refetch();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Network error");
      setSaving(false);
    }
  }, [active, agent.agent_id, draftContent, isSoul, refetch]);

  const handleCancel = useCallback(() => {
    if (!isDirty) return;
    if (isSignificantDiff(draftContent, savedContent)) {
      const ok = window.confirm("Discard unsaved changes?");
      if (!ok) return;
    }
    setDraftContent(savedContent);
  }, [draftContent, isDirty, savedContent]);

  const handleSelectFile = useCallback(
    (fileName: string) => {
      if (isDirty) {
        const ok = window.confirm("Discard unsaved changes and switch files?");
        if (!ok) return;
      }
      setActiveName(fileName);
    },
    [isDirty],
  );

  const handleIconChange = useCallback(
    async (_icon: IconType, name: string) => {
      if (!active) return;
      setOpError(null);
      try {
        const res = await fetch(
          `/api/agents/${encodeURIComponent(agent.agent_id)}/instructions/${encodeURIComponent(active.file_name)}`,
          {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ icon: name }),
          },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            message?: string;
            error?: string;
          };
          setOpError(body.message ?? body.error ?? `Icon update failed (${res.status})`);
          return;
        }
        await refetch();
      } catch (err) {
        setOpError(err instanceof Error ? err.message : "Network error");
      }
    },
    [active, agent.agent_id, refetch],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setOpError(null);
    try {
      const res = await fetch(
        `/api/agents/${encodeURIComponent(agent.agent_id)}/instructions/${encodeURIComponent(deleteTarget.file_name)}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        setOpError(body.message ?? body.error ?? `Delete failed (${res.status})`);
        setSaving(false);
        return;
      }
      setDeleteTarget(null);
      setSaving(false);
      await refetch();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Network error");
      setSaving(false);
    }
  }, [agent.agent_id, deleteTarget, refetch]);

  return (
    <article
      className="flex w-full items-stretch overflow-hidden rounded-xl border border-secondary bg-secondary"
      data-testid="tab-instructions"
    >
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
            onClick={() => setModalOpen(true)}
          />
        </div>
        <ul className="flex flex-col">
          {loading && files.length === 0 && (
            <li className="px-3 py-2 text-xs text-tertiary">Loading…</li>
          )}
          {error && (
            <li className="px-3 py-2 text-xs text-error-primary">{error}</li>
          )}
          {files.map((file) => {
            const isActive = active?.file_name === file.file_name;
            const Icon = resolveIcon(file.icon);
            return (
              <li key={file.file_name} className="py-0.5">
                <button
                  type="button"
                  onClick={() => handleSelectFile(file.file_name)}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
                    isActive ? "bg-active" : "hover:bg-primary_hover",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="size-5 shrink-0 text-fg-quaternary" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-secondary">
                    {file.file_name}
                  </span>
                  <Badge type="modern" size="sm">
                    {countLines(file.content)}
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
          {active && (
            <IconPicker value={ActiveIcon} onChange={handleIconChange} />
          )}
          <h2 className="text-base font-bold text-primary [font-family:var(--font-display)]">
            {active ? active.file_name : "—"}
          </h2>
          <div className="ml-auto flex items-center gap-3">
            <Badge type="modern" size="sm">
              {charCount.toLocaleString()} chars
            </Badge>
            <Button
              color="tertiary"
              size="sm"
              iconTrailing={Copy03}
              onClick={handleCopy}
              isDisabled={!active || active.content.length === 0}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
            {isDirty && (
              <>
                <Button
                  color="tertiary"
                  size="sm"
                  iconTrailing={X}
                  onClick={handleCancel}
                  isDisabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  size="sm"
                  onClick={handleSave}
                  isLoading={saving}
                  isDisabled={saving || draftContent.length > 50_000}
                >
                  Save
                </Button>
              </>
            )}
            {active && !active.is_canonical && active.file_name !== "SOUL.md" && (
              <ButtonUtility
                size="xs"
                color="secondary-destructive"
                icon={Trash02}
                tooltip="Delete file"
                aria-label={`Delete ${active.file_name}`}
                onClick={() => setDeleteTarget(active)}
              />
            )}
          </div>
        </header>

        {opError && (
          <div
            className="border-b border-error bg-error_subtle px-5 py-2 text-sm text-error-primary"
            data-testid="tab-instructions-error"
          >
            {opError}
          </div>
        )}

        {active ? (
          <div
            className="flex flex-1 flex-col gap-3 px-5 py-4"
            data-testid="instructions-body"
          >
            <TextArea
              label="Content"
              value={draftContent}
              onChange={(v) => setDraftContent(typeof v === "string" ? v : "")}
              hint={`${draftContent.length.toLocaleString()} / 50,000 chars${isSoul ? "" : " — saving requires human approval"}`}
              isInvalid={draftContent.length > 50_000}
              rows={16}
              isDisabled={saving}
              textAreaClassName="[font-family:var(--font-code)] whitespace-pre text-sm leading-5"
            />
          </div>
        ) : (
          <div className="flex min-h-[360px] flex-1 items-center justify-center px-5 py-10">
            <p className="text-sm text-tertiary">No file selected.</p>
          </div>
        )}

        {/* Advanced — UI-only placeholder. F-69-11: Advanced backend persistence pending. */}
        <div className="border-t border-secondary">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            aria-expanded={advancedOpen}
            aria-controls="instructions-advanced-panel"
            data-testid="instructions-advanced-toggle"
            className="flex w-full items-center gap-2 px-5 py-3 text-left text-sm font-semibold text-secondary hover:bg-primary_hover"
          >
            {advancedOpen ? (
              <ChevronDown className="size-4 text-fg-quaternary" aria-hidden />
            ) : (
              <ChevronRight className="size-4 text-fg-quaternary" aria-hidden />
            )}
            Advanced
          </button>
          {advancedOpen && (
            <div
              id="instructions-advanced-panel"
              data-testid="instructions-advanced-panel"
              className="flex flex-col gap-4 px-5 py-4"
            >
              {/* Mode segmented — managed/external. Managed active; External disabled. */}
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-secondary">Mode</span>
                <div className="flex w-fit gap-1 rounded-md border border-primary bg-primary p-0.5">
                  <Button color="primary" size="sm" aria-pressed="true">
                    Managed
                  </Button>
                  <Button color="tertiary" size="sm" aria-pressed="false" isDisabled>
                    External
                  </Button>
                </div>
                <p className="text-xs text-tertiary">
                  Managed files are stored in Supabase and synced to the agent via OpenClaw.
                </p>
              </div>
              {/* Root path — read-only with Copy button */}
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-secondary">Root path</span>
                <div className="flex items-center gap-2">
                  <code
                    data-testid="advanced-root-path"
                    className="flex-1 rounded-md border border-secondary bg-secondary px-3 py-2 text-sm text-primary [font-family:var(--font-code)]"
                  >
                    {rootPath}
                  </code>
                  <Button
                    color="tertiary"
                    size="sm"
                    iconLeading={Copy03}
                    onClick={handleCopyRootPath}
                  >
                    {rootPathCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
              {/* Entry file — read-only */}
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-secondary">Entry file</span>
                <code
                  data-testid="advanced-entry-file"
                  className="w-fit rounded-md border border-secondary bg-secondary px-3 py-2 text-sm text-primary [font-family:var(--font-code)]"
                >
                  AGENTS.md
                </code>
              </div>
              {/* F-69-11: Advanced backend persistence pending. See FOLLOW-UPS.md. */}
            </div>
          )}
        </div>
      </section>

      {/* Create modal */}
      <CreateInstructionFileModal
        agentId={agent.agent_id}
        existingFileNames={files.map((f) => f.file_name)}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          void refetch();
        }}
      />

      {/* Delete confirmation — inline surface (no new modal file to avoid Plan 10 scope creep). */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-heading"
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          data-testid="instructions-delete-confirm"
        >
          <div className="absolute inset-0 bg-overlay" onClick={() => setDeleteTarget(null)} />
          <div className="relative max-w-md rounded-xl border border-secondary bg-primary p-6 shadow-xl">
            <h3 id="delete-confirm-heading" className="text-lg font-semibold text-primary">
              Delete {deleteTarget.file_name}?
            </h3>
            <p className="mt-2 text-sm text-tertiary">
              This will remove the file from all operator surfaces once approved.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                color="secondary"
                size="md"
                onClick={() => setDeleteTarget(null)}
                isDisabled={saving}
              >
                Cancel
              </Button>
              <Button
                color="primary-destructive"
                size="md"
                iconLeading={Trash02}
                onClick={confirmDelete}
                isLoading={saving}
              >
                Request deletion
              </Button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};

// Silence unused-import lint for FileHeart02 (kept for future SOUL.md fallback).
export const __iconExports = { FileHeart02 } as const;
