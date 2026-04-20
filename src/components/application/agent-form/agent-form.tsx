"use client";

// Phase 69 Plan 02 — AgentForm organism.
//
// Single form used by both `/agents/new` (create) and `/agents/[id]/edit`
// (update). Renders 4 editable fields (name, slug, soul_content,
// avatar_url) + 2 read-only placeholders (role, adapter_type).
//
// Contract:
//   - mode="create"   → all fields editable; submit posts the full payload.
//   - mode="edit"     → pre-filled from `initial`; submit diffs client-side.
//   - readOnly=true   → every input disabled + submit button hidden
//                       (SPEC-69-CRUD-03 pending_approval banner path).
//
// Validation is handled by `@/lib/agent-validators` — shared with the
// server-side validator in Plan 03 so the two never drift.
// SECURITY:
//   - T3 (stored-XSS via name): client regex whitelist rejects HTML
//     metacharacters before POST.
//   - T9 (dangerous avatar_url): `isAllowedAvatarUrl` rejects
//     javascript: / data: / file: / blob: at the UI boundary. Server
//     re-applies the same predicate.

import { useMemo, useState, type FC, type FormEvent } from "react";
import { Button, Form, Input, TextArea, cx } from "@circos/ui";
import type { AgentRow } from "@/types/supabase";
import {
  AGENT_VALIDATION,
  isAllowedAvatarUrl,
  kebabify,
  validateAgentName,
  validateAgentSlug,
  validateAvatarUrl,
  validateSoulContent,
} from "@/lib/agent-validators";

export interface AgentFormValues {
  name: string;
  slug: string;
  soul_content: string;
  avatar_url: string;
}

export interface AgentFormProps {
  mode: "create" | "edit";
  initial?: Partial<AgentRow>;
  readOnly?: boolean;
  submitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: AgentFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

const READONLY_ROLE_PLACEHOLDER = "—assigned by admin—";
const READONLY_ADAPTER_PLACEHOLDER = "—assigned by admin—";
const READONLY_TOOLTIP = "Managed by ops — contact admin to change.";

export const AgentForm: FC<AgentFormProps> = ({
  mode,
  initial,
  readOnly = false,
  submitting = false,
  errorMessage = null,
  onSubmit,
  onCancel,
}) => {
  const [name, setName] = useState<string>(initial?.name ?? "");
  const [slug, setSlug] = useState<string>(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState<boolean>(Boolean(initial?.slug));
  const [soulContent, setSoulContent] = useState<string>(initial?.soul_content ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string>(initial?.avatar_url ?? "");

  // Auto-kebab slug on name change until user manually edits slug.
  const handleNameChange = (next: string) => {
    setName(next);
    if (!slugTouched) {
      setSlug(kebabify(next));
    }
  };

  const nameError = useMemo(() => validateAgentName(name), [name]);
  const slugError = useMemo(() => validateAgentSlug(slug), [slug]);
  const soulError = useMemo(() => validateSoulContent(soulContent), [soulContent]);
  const avatarError = useMemo(() => validateAvatarUrl(avatarUrl), [avatarUrl]);

  const canSubmit =
    !readOnly &&
    !submitting &&
    nameError == null &&
    slugError == null &&
    soulError == null &&
    avatarError == null &&
    isAllowedAvatarUrl(avatarUrl);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const values: AgentFormValues = {
      name: name.trim(),
      slug: slug.trim(),
      soul_content: soulContent,
      avatar_url: avatarUrl.trim(),
    };
    await onSubmit(values);
  };

  return (
    <Form onSubmit={handleSubmit} className="flex w-full max-w-2xl flex-col gap-6">
      <section className="flex flex-col gap-4">
        <Input
          label="Name"
          placeholder="e.g. Scrum master"
          value={name}
          onChange={(v) => handleNameChange(typeof v === "string" ? v : "")}
          isRequired
          isDisabled={readOnly}
          isInvalid={nameError != null}
          hint={nameError ?? `1–${AGENT_VALIDATION.NAME_MAX} characters, letters/numbers/hyphen/space/underscore`}
          maxLength={AGENT_VALIDATION.NAME_MAX}
        />
        <Input
          label="Slug"
          placeholder="auto-derived from name"
          value={slug}
          onChange={(v) => {
            setSlugTouched(true);
            setSlug(typeof v === "string" ? v : "");
          }}
          isDisabled={readOnly}
          isInvalid={slugError != null}
          hint={slugError ?? "Lowercase kebab-case. Auto-derived from the name until you edit it."}
          maxLength={AGENT_VALIDATION.SLUG_MAX}
        />
        <TextArea
          label="SOUL"
          placeholder="# Who am I\n\n…"
          value={soulContent}
          onChange={(v) => setSoulContent(typeof v === "string" ? v : "")}
          isDisabled={readOnly}
          isInvalid={soulError != null}
          hint={
            soulError ??
            `Identity contract — markdown, up to ${AGENT_VALIDATION.SOUL_MAX.toLocaleString()} chars.`
          }
          rows={10}
        />
        <div className="flex items-baseline justify-end">
          <span
            className={cx(
              "text-xs [font-family:var(--font-code)]",
              soulContent.length > AGENT_VALIDATION.SOUL_MAX
                ? "text-error-primary"
                : "text-tertiary",
            )}
          >
            {soulContent.length.toLocaleString()}/{AGENT_VALIDATION.SOUL_MAX.toLocaleString()}
          </span>
        </div>
        <Input
          label="Avatar URL"
          placeholder="https://…"
          value={avatarUrl}
          onChange={(v) => setAvatarUrl(typeof v === "string" ? v : "")}
          isDisabled={readOnly}
          isInvalid={avatarError != null}
          hint={avatarError ?? "Optional. http:// or https:// only."}
          maxLength={AGENT_VALIDATION.AVATAR_URL_MAX}
        />
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-secondary bg-primary p-5">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-primary">Admin fields (read-only)</span>
          <span className="text-xs text-tertiary">{READONLY_TOOLTIP}</span>
        </div>
        <Input
          label="Role"
          value={initial?.role ? String(initial.role) : READONLY_ROLE_PLACEHOLDER}
          isDisabled
          hint="Managed by ops."
        />
        <Input
          label="Adapter type"
          value={initial?.adapter_type ?? READONLY_ADAPTER_PLACEHOLDER}
          isDisabled
          hint="Managed by ops."
        />
      </section>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-lg border border-error bg-error-primary/10 px-4 py-3 text-sm text-error-primary"
        >
          {errorMessage}
        </p>
      )}

      {!readOnly && (
        <div className="flex items-center justify-end gap-3">
          {onCancel && (
            <Button
              color="tertiary"
              size="md"
              onClick={onCancel}
              isDisabled={submitting}
            >
              Cancel
            </Button>
          )}
          <Button
            color="primary"
            size="md"
            type="submit"
            isDisabled={!canSubmit}
            isLoading={submitting}
            showTextWhileLoading
          >
            {mode === "create" ? "Request creation" : "Request update"}
          </Button>
        </div>
      )}
    </Form>
  );
};
