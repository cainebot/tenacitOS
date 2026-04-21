"use client";

// Phase 69 Plan 02 — /agents/new (SPEC-69-CRUD-02).
// Renders `<AgentForm mode="create" />`. On submit, POST /api/agents with
// { name, slug, soul_content, avatar_url }. On 2xx, surface an inline
// "pending approval" banner and route the user to /approvals (where the
// queued `create_agent` row now lives).
//
// NOTE: the POST /api/agents route ships in Plan 69-03 (in-flight). Until
// it lands, the submit may return a 404 — the inline error banner from
// `<AgentForm errorMessage>` surfaces that to the operator.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cx } from "@circos/ui";
import { ChevronRight, HomeLine } from "@untitledui/icons";
import { AgentForm, type AgentFormValues } from "@/components/application/agent-form";
import { AGENTS_COPY } from "@/app/(dashboard)/agents/copy";

export default function NewAgentPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const handleSubmit = async (values: AgentFormValues) => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          slug: values.slug,
          soul_content: values.soul_content,
          avatar_url: values.avatar_url || null,
        }),
      });
      if (!res.ok) {
        const text = await safeReadError(res);
        throw new Error(text || `Request failed: HTTP ${res.status}`);
      }
      setBanner(AGENTS_COPY.toastCreateRequested);
      window.setTimeout(() => {
        router.push("/approvals");
      }, 800);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : AGENTS_COPY.toastCreateFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flex w-full flex-col">
      <header className="flex flex-col gap-5 border-b border-secondary px-12 pb-6 pt-2">
        <Breadcrumb />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-primary [font-family:var(--font-display)]">
            {AGENTS_COPY.newTitle}
          </h1>
          <p className="text-sm text-tertiary">{AGENTS_COPY.newSubtitle}</p>
        </div>
      </header>

      <div className="flex w-full flex-col gap-6 px-12 py-6">
        {banner && (
          <p
            role="status"
            className="rounded-lg border border-success-solid/40 bg-success-solid/10 px-4 py-3 text-sm text-success-primary"
          >
            {banner}
          </p>
        )}

        <AgentForm
          mode="create"
          submitting={submitting}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/agents")}
        />
      </div>
    </section>
  );
}

async function safeReadError(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return body.error ?? body.message ?? null;
  } catch {
    return null;
  }
}

const Breadcrumb = () => (
  <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-tertiary">
    <Link
      href="/"
      className={cx(
        "flex size-7 items-center justify-center rounded-md",
        "text-quaternary transition-colors hover:bg-primary_hover hover:text-tertiary",
      )}
      aria-label="Home"
    >
      <HomeLine className="size-4" />
    </Link>
    <ChevronRight className="size-4 text-quaternary" />
    <Link
      href="/agents"
      className="rounded-md px-2 py-1 text-xs font-semibold text-tertiary transition-colors hover:bg-primary_hover"
    >
      Agents
    </Link>
    <ChevronRight className="size-4 text-quaternary" />
    <span
      aria-current="page"
      className="rounded-md bg-active px-2 py-1 text-xs font-semibold text-secondary"
    >
      New
    </span>
  </nav>
);
