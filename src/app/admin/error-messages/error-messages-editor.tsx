"use client";

// Phase 64.5.2-05 Plan Task 1 — Admin editor for public.error_messages.
// UUI Table pattern (Codex Plan05-MEDIUM-#4) following projects/page.tsx.
// Identity from NEXT_PUBLIC_ADMIN_EMAIL (build-inlined). NO cookie reads.
// Server-side ADMIN_EMAILS is the real auth gate (route handler).
// Global "All changes saved" toast (Gemini suggestion-#6).
// Delete visible only for orphan codes (NOT in @circos/cli-connect ERROR_CODES).

import { useEffect, useState, useCallback, type FC } from "react";
import { Trash01 } from "@untitledui/icons";
import { Button, Input, Badge, Table, TableCard, cx } from "@circos/ui";
import { isErrorCode } from "@circos/cli-connect/shared/error-codes";

// Read at render-time so vi.stubEnv works in tests; in production builds Next
// inlines process.env.NEXT_PUBLIC_* into the bundle so this is still a static
// string post-build.
const getAdminEmail = (): string => process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";

interface Row {
  error_code: string;
  lang: "es" | "en";
  title: string;
  description: string;
  next_step: string | null;
  doc_link: string | null;
}

const rowKey = (r: Pick<Row, "error_code" | "lang">) => `${r.error_code}:${r.lang}`;

export const ErrorMessagesEditor: FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [missingEnv, setMissingEnv] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [globalToast, setGlobalToast] = useState<string | null>(null);

  useEffect(() => {
    const email = getAdminEmail();
    if (!email) {
      setMissingEnv(true);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/admin/error-messages", {
          headers: { "x-user-email": email },
        });
        if (res.status === 403) {
          setForbidden(true);
          setLoading(false);
          return;
        }
        const body = await res.json();
        setRows((body.rows ?? []) as Row[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateField = useCallback(
    (key: string, field: keyof Row, value: string) => {
      setRows((prev) =>
        prev.map((r) => (rowKey(r) === key ? { ...r, [field]: value } : r)),
      );
    },
    [],
  );

  const save = useCallback(async (row: Row) => {
    const key = rowKey(row);
    setSavingKey(key);
    setErrorKey(null);
    try {
      const res = await fetch("/api/admin/error-messages", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": getAdminEmail(),
        },
        body: JSON.stringify(row),
      });
      if (!res.ok) {
        setErrorKey(key);
        return;
      }
      // Gemini suggestion-#6 — global confirmation toast.
      setGlobalToast("All changes saved");
      setTimeout(() => setGlobalToast(null), 2500);
    } catch {
      setErrorKey(key);
    } finally {
      setSavingKey(null);
    }
  }, []);

  const remove = useCallback(async (row: Row) => {
    const key = rowKey(row);
    setSavingKey(key);
    setErrorKey(null);
    try {
      const params = new URLSearchParams({
        error_code: row.error_code,
        lang: row.lang,
      });
      const res = await fetch(`/api/admin/error-messages?${params}`, {
        method: "DELETE",
        headers: { "x-user-email": getAdminEmail() },
      });
      if (!res.ok) {
        setErrorKey(key);
        return;
      }
      setRows((prev) => prev.filter((r) => rowKey(r) !== key));
      setGlobalToast("All changes saved");
      setTimeout(() => setGlobalToast(null), 2500);
    } catch {
      setErrorKey(key);
    } finally {
      setSavingKey(null);
    }
  }, []);

  if (missingEnv) {
    return (
      <div className="flex w-full flex-col gap-3 rounded-lg border border-secondary bg-primary p-6">
        <h2 className="text-md font-semibold text-primary">
          NEXT_PUBLIC_ADMIN_EMAIL is not set
        </h2>
        <p className="text-sm text-tertiary">
          The admin editor cannot run without a build-inlined identity. Set
          NEXT_PUBLIC_ADMIN_EMAIL (and matching ADMIN_EMAILS server-side) in
          <code className="mx-1 rounded bg-secondary px-1 py-0.5 text-xs">
            control-panel/.env.local
          </code>
          and rebuild. See <code>.env.example</code>.
        </p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="flex w-full flex-col gap-3 rounded-lg border border-error bg-primary p-6">
        <h2 className="text-md font-semibold text-error-primary">
          403 — admin access required
        </h2>
        <p className="text-sm text-tertiary">
          Server rejected the request. Confirm
          <code className="mx-1 rounded bg-secondary px-1 py-0.5 text-xs">
            ADMIN_EMAILS
          </code>
          on the server includes
          <code className="mx-1 rounded bg-secondary px-1 py-0.5 text-xs">
            {getAdminEmail()}
          </code>
          and rebuild.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-tertiary">Loading...</div>;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {globalToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-6 top-6 z-50"
        >
          <Badge color="success" size="lg">
            {globalToast}
          </Badge>
        </div>
      )}

      <TableCard.Root size="md" className="w-full">
        <Table aria-label="Error messages editor" className="w-full">
          <Table.Header>
            <Table.Head id="error_code" isRowHeader className="w-[220px]">
              <span className="text-xs font-medium text-quaternary">Code</span>
            </Table.Head>
            <Table.Head id="lang" className="w-[80px]">
              <span className="text-xs font-medium text-quaternary">Lang</span>
            </Table.Head>
            <Table.Head id="title">
              <span className="text-xs font-medium text-quaternary">Title</span>
            </Table.Head>
            <Table.Head id="description">
              <span className="text-xs font-medium text-quaternary">
                Description
              </span>
            </Table.Head>
            <Table.Head id="next_step">
              <span className="text-xs font-medium text-quaternary">
                Next step
              </span>
            </Table.Head>
            <Table.Head id="doc_link">
              <span className="text-xs font-medium text-quaternary">
                Doc link
              </span>
            </Table.Head>
            <Table.Head id="actions" className="w-[160px]">
              <span className="sr-only">Actions</span>
            </Table.Head>
          </Table.Header>
          <Table.Body>
            {rows.map((row) => {
              const key = rowKey(row);
              const isOrphan = !isErrorCode(row.error_code);
              const saving = savingKey === key;
              const failed = errorKey === key;
              return (
                <Table.Row key={key}>
                  <Table.Cell>
                    <span
                      className={cx(
                        "text-sm font-medium",
                        isOrphan ? "text-warning-primary" : "text-primary",
                      )}
                    >
                      {row.error_code}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm text-tertiary">{row.lang}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      aria-label={`title-${key}`}
                      size="sm"
                      value={row.title}
                      onChange={(v) =>
                        updateField(key, "title", typeof v === "string" ? v : "")
                      }
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      aria-label={`description-${key}`}
                      size="sm"
                      value={row.description}
                      onChange={(v) =>
                        updateField(
                          key,
                          "description",
                          typeof v === "string" ? v : "",
                        )
                      }
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      aria-label={`next_step-${key}`}
                      size="sm"
                      value={row.next_step ?? ""}
                      onChange={(v) =>
                        updateField(
                          key,
                          "next_step",
                          typeof v === "string" ? v : "",
                        )
                      }
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      aria-label={`doc_link-${key}`}
                      size="sm"
                      value={row.doc_link ?? ""}
                      onChange={(v) =>
                        updateField(
                          key,
                          "doc_link",
                          typeof v === "string" ? v : "",
                        )
                      }
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        color="primary"
                        isLoading={saving}
                        onClick={() => save(row)}
                      >
                        Save
                      </Button>
                      {isOrphan && (
                        <Button
                          size="sm"
                          color="tertiary-destructive"
                          iconLeading={Trash01}
                          aria-label={`delete-${key}`}
                          onClick={() => remove(row)}
                        />
                      )}
                      {failed && (
                        <Badge color="error" size="sm">
                          failed
                        </Badge>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      </TableCard.Root>
    </div>
  );
};
