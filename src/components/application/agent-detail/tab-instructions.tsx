"use client";

// Phase 69 Plan 10 — Instructions tab (live CRUD via /api/agents/[id]/instructions).
//
// Source: Figma node 17036:109689 (B · Intrucciones).
// Plan 69-09 shipped the read-only surface; Plan 69-10 wires:
//   - Read — useInstructionFiles() merges canonical + user-created + SOUL.md.
//   - Create — "+" button opens CreateInstructionFileModal → POST → approval.
//   - Icon edit — IconPicker onChange → PATCH (direct UPDATE, non-gated).
//   - Content edit — "Save" → PATCH (approval-gated; SOUL.md routes via AgentForm).
//   - Delete user file — button visible only for user-created rows → DELETE → approval.
//
// SECURITY T3: all content rendered as React text children inside <pre> or
// <Textarea>. No dangerouslySetInnerHTML. file_name + icon come from the
// server-side whitelist-validated response.

import { Fragment, useCallback, useMemo, useState, type ComponentType, type SVGProps } from "react";
import { Badge, Button, ButtonUtility, TextArea, cx } from "@circos/ui";
import * as UntitledIcons from "@untitledui/icons";
import {
  Copy03,
  Edit05,
  File06,
  FileHeart02,
  Plus,
  SearchLg,
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

export const TabInstructions: React.FC<{
  agent: AgentRow;
  onEdit?: () => void;
}> = ({ agent, onEdit }) => {
  const { files, loading, error, refetch } = useInstructionFiles(agent);
  const [activeName, setActiveName] = useState<string>("SOUL.md");
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InstructionFileRow | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  const active = useMemo<InstructionFileRow | null>(() => {
    if (files.length === 0) return null;
    return files.find((f) => f.file_name === activeName) ?? files[0];
  }, [files, activeName]);

  const ActiveIcon = resolveIcon(active?.icon);
  const isSoul = active?.file_name === "SOUL.md";
  const isEmpty = !active || active.content.length === 0;
  const lines = isEmpty ? [] : (active!.content.split("\n"));
  const charCount = active?.content.length ?? 0;

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

  const handleEdit = () => {
    if (!active) return;
    // SOUL.md edit → route through AgentForm (Plan 69-02).
    if (isSoul) {
      onEdit?.();
      return;
    }
    setDraftContent(active.content);
    setIsEditing(true);
  };

  const handleSave = useCallback(async () => {
    if (!active) return;
    setSaving(true);
    setOpError(null);
    try {
      const res = await fetch(
        `/api/agents/${encodeURIComponent(agent.agent_id)}/instructions/${encodeURIComponent(active.file_name)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: draftContent }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        setOpError(body.message ?? body.error ?? `Save failed (${res.status})`);
        setSaving(false);
        return;
      }
      setIsEditing(false);
      setSaving(false);
      await refetch();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Network error");
      setSaving(false);
    }
  }, [active, agent.agent_id, draftContent, refetch]);

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
                  onClick={() => {
                    setActiveName(file.file_name);
                    setIsEditing(false);
                  }}
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
              isDisabled={isEmpty}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
            {!isEditing ? (
              <Button color="secondary" size="sm" iconTrailing={Edit05} onClick={handleEdit}>
                Edit
              </Button>
            ) : (
              <>
                <Button
                  color="tertiary"
                  size="sm"
                  iconTrailing={X}
                  onClick={() => setIsEditing(false)}
                  isDisabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  size="sm"
                  onClick={handleSave}
                  isLoading={saving}
                  isDisabled={saving || isSoul}
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

        {isEditing && !isSoul ? (
          <div className="flex flex-1 flex-col gap-3 px-5 py-4">
            <TextArea
              label="Content"
              value={draftContent}
              onChange={(v) => setDraftContent(typeof v === "string" ? v : "")}
              hint={`${draftContent.length.toLocaleString()} / 50,000 chars — saving requires human approval`}
              isInvalid={draftContent.length > 50_000}
              rows={16}
              isDisabled={saving}
            />
          </div>
        ) : isEmpty ? (
          <div
            data-testid="instructions-empty-state"
            className="flex min-h-[360px] flex-1 items-center justify-center px-5 py-10"
          >
            <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
              <div className="flex size-12 items-center justify-center rounded-[10px] border border-primary bg-primary shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05),inset_0px_0px_0px_1px_rgba(12,14,18,0.18),inset_0px_-2px_0px_0px_rgba(12,14,18,0.05)]">
                <SearchLg className="size-6 text-fg-quaternary" aria-hidden />
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-lg font-semibold text-primary">No content yet</p>
                <p className="text-sm text-tertiary">
                  {active
                    ? `${active.file_name} has no content for ${agent.name ?? agent.agent_id}.`
                    : "No file selected."}
                </p>
              </div>
              {active && !isSoul && (
                <Button color="primary" size="md" iconLeading={Edit05} onClick={handleEdit}>
                  Add content
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-start px-5 py-4">
            <div
              data-testid="instructions-body"
              className="grid w-full grid-cols-[auto_1fr] overflow-x-auto rounded-xl border border-secondary bg-primary"
            >
              {lines.map((line, i) => (
                <Fragment key={i}>
                  <span
                    aria-hidden
                    className={cx(
                      "sticky left-0 z-10 select-none border-r border-secondary bg-secondary px-4 text-right text-sm leading-5 text-quaternary [font-family:var(--font-code)]",
                      i === 0 && "pt-5",
                      i === lines.length - 1 && "pb-5",
                    )}
                  >
                    {i + 1}
                  </span>
                  <pre
                    className={cx(
                      "min-h-5 px-5 text-sm leading-5 text-primary [font-family:var(--font-code)] whitespace-pre",
                      i === 0 && "pt-5",
                      i === lines.length - 1 && "pb-5",
                    )}
                  >
                    {line}
                  </pre>
                </Fragment>
              ))}
            </div>
          </div>
        )}
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
