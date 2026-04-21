"use client";

// Phase 69 Plan 10 — CreateInstructionFileModal.
//
// Mounted from tab-instructions.tsx when the operator clicks the "+" button
// next to "Files". Wires to POST /api/agents/[id]/instructions → MCP tool
// create_user_instruction → approvals.
//
// Client-side validation (defense-in-depth; server + MCP + DB also enforce):
//   - file_name stem is 1..60 alphanumeric/_/- and not a canonical name
//   - icon is validated via @untitledui/icons exports (IconPicker universe)
//   - content length ≤ 50 000
//
// NO dangerouslySetInnerHTML anywhere. All text rendered via React children.

import { useMemo, useState, type ComponentType, type SVGProps } from "react";
import { Button, Input, Modal, TextArea, cx } from "@circos/ui";
import { FileCheck02 } from "@untitledui/icons";
import { IconPicker } from "./icon-picker";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

// Mirror of server/MCP CANONICAL_NAMES_LOWER (lower-case, without .md).
const CANONICAL_NAMES_LOWER = [
  "soul",
  "agents",
  "user",
  "identity",
  "tools",
  "heartbeat",
  "memory",
  "memoy",
];

const FILE_STEM_REGEX = /^[A-Za-z0-9_-]+$/;

export interface CreateInstructionFileModalProps {
  agentId: string;
  existingFileNames: string[];
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function toFinalFileName(stem: string): string {
  const trimmed = stem.trim();
  return trimmed.endsWith(".md") ? trimmed : `${trimmed}.md`;
}

function validateFileName(stem: string, existing: string[]): string | null {
  const trimmed = stem.trim();
  if (trimmed.length === 0) return "File name cannot be empty.";
  if (trimmed.length > 60) return "File name must be at most 60 characters.";
  const bare = trimmed.replace(/\.md$/i, "");
  if (!FILE_STEM_REGEX.test(bare)) {
    return "Use only letters, numbers, _ or - (no spaces).";
  }
  if (CANONICAL_NAMES_LOWER.includes(bare.toLowerCase())) {
    return "This name is reserved for a canonical file.";
  }
  const final = toFinalFileName(trimmed);
  if (existing.includes(final)) {
    return "A file with that name already exists for this agent.";
  }
  return null;
}

export function CreateInstructionFileModal({
  agentId,
  existingFileNames,
  isOpen,
  onClose,
  onCreated,
}: CreateInstructionFileModalProps) {
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");
  // HI-03 — lazy initializer defers the `FileCheck02` reference to
  // first render. Vitest's ESM/CJS interop resolves the named export
  // as `undefined` at module-load time; lazy-init sidesteps that by
  // evaluating the identifier after React has mounted the component.
  // Also a correctness win in StrictMode (no re-eval of the initial).
  const [selectedIcon, setSelectedIcon] = useState<IconType>(() => FileCheck02);
  const [selectedIconName, setSelectedIconName] = useState<string>("FileCheck02");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const nameError = useMemo(
    () => (fileName.length > 0 ? validateFileName(fileName, existingFileNames) : null),
    [fileName, existingFileNames],
  );

  const canSubmit =
    !submitting &&
    fileName.trim().length > 0 &&
    nameError === null &&
    content.length <= 50_000;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const finalFileName = toFinalFileName(fileName);
      const res = await fetch(
        `/api/agents/${encodeURIComponent(agentId)}/instructions`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_name: finalFileName,
            icon: selectedIconName,
            content,
          }),
        },
      );
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        setErrorMsg(
          errBody.message ?? errBody.error ?? `Request failed (${res.status}).`,
        );
        setSubmitting(false);
        return;
      }
      // Reset form.
      setFileName("");
      setContent("");
      setSelectedIcon(FileCheck02);
      setSelectedIconName("FileCheck02");
      setSubmitting(false);
      onCreated();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error");
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !submitting) onClose();
      }}
      size="md"
    >
      <div className={cx("flex flex-col gap-4")} data-testid="create-instruction-file-modal">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-primary">Create instruction file</h3>
          <p className="text-sm text-tertiary">
            Adds a new .md file to this agent. Creation requires human approval.
          </p>
        </div>

        <Input
          label="File name"
          placeholder="e.g. Playbook"
          value={fileName}
          onChange={(v) => setFileName(typeof v === "string" ? v : "")}
          hint="Alphanumeric, underscore, dash. `.md` added automatically. Cannot shadow a canonical file."
          isInvalid={nameError !== null}
          {...(nameError ? { errorMessage: nameError } : {})}
          isDisabled={submitting}
        />

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-secondary">Icon:</span>
          <IconPicker
            value={selectedIcon}
            onChange={(icon, name) => {
              setSelectedIcon(icon);
              setSelectedIconName(name);
            }}
          />
          <code className="text-xs text-tertiary">{selectedIconName}</code>
        </div>

        <TextArea
          label="Initial content (optional)"
          value={content}
          onChange={(v) => setContent(typeof v === "string" ? v : "")}
          hint={`${content.length.toLocaleString()} / 50,000 chars`}
          isInvalid={content.length > 50_000}
          {...(content.length > 50_000
            ? { errorMessage: "Content exceeds 50 000 chars." }
            : {})}
          isDisabled={submitting}
        />

        {errorMsg !== null && (
          <div
            className="rounded-md border border-error bg-error_subtle px-3 py-2 text-sm text-error-primary"
            data-testid="create-instruction-file-modal-error"
          >
            {errorMsg}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button color="secondary" size="md" onClick={onClose} isDisabled={submitting}>
            Cancel
          </Button>
          <Button
            color="primary"
            size="md"
            onClick={handleSubmit}
            isDisabled={!canSubmit}
            isLoading={submitting}
          >
            Request creation
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export const __testables = {
  validateFileName,
  toFinalFileName,
  CANONICAL_NAMES_LOWER,
} as const;
