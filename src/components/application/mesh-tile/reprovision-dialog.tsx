"use client";

// Phase 64.5.2-04 — UUI Modal that streams NDJSON from
// /api/nodes/:node_id/reprovision and humanizes embedded error_codes via
// useErrorMessages.lookup. Codex Plan04-MEDIUM:
//   - No hand-rolled fixed-position overlay — uses @circos/ui Modal exclusively.
//   - Each NDJSON line is JSON.parse'd; envelopes with ok:false + error_code are
//     rendered as humanized title/description/next_step (NEVER raw JSON).
//   - AbortController on unmount mitigates DoS T-64.5.2-04-04.

import { useEffect, useRef, useState } from "react";
import type { FC } from "react";
import { Modal, Button, cx } from "@circos/ui";
import { isErrorCode } from "@circos/cli-connect/shared/error-codes";
import { useErrorMessages } from "@/hooks/useErrorMessages";

interface StreamEnvelope {
  ok?: boolean;
  error_code?: string;
  message?: string;
  stderr?: string;
  exitCode?: number;
}

interface StreamLine {
  raw: string;
  envelope: StreamEnvelope | null;
}

export interface ReprovisionDialogProps {
  nodeId: string;
  lang: "es" | "en";
  onClose: () => void;
}

export const ReprovisionDialog: FC<ReprovisionDialogProps> = ({ nodeId, lang, onClose }) => {
  const [lines, setLines] = useState<StreamLine[]>([]);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const { lookup } = useErrorMessages(lang);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    abortRef.current = ac;
    (async () => {
      try {
        const res = await fetch(`/api/nodes/${nodeId}/reprovision`, {
          method: "POST",
          signal: ac.signal,
        });
        if (!res.ok || !res.body) {
          setLines((l) => [...l, { raw: `HTTP ${res.status}`, envelope: null }]);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            if (!part.trim()) continue;
            let envelope: StreamEnvelope | null = null;
            try {
              envelope = JSON.parse(part);
            } catch {
              envelope = null;
            }
            if (envelope && typeof envelope.exitCode === "number") {
              setExitCode(envelope.exitCode);
            }
            setLines((l) => [...l, { raw: part, envelope }]);
          }
        }
      } catch (e) {
        if (!ac.signal.aborted) {
          setLines((l) => [
            ...l,
            { raw: e instanceof Error ? e.message : String(e), envelope: null },
          ]);
        }
      }
    })();
    return () => ac.abort();
  }, [nodeId]);

  return (
    <Modal isOpen onOpenChange={(open) => { if (!open) onClose(); }} size="xl">
      <div className={cx("flex flex-col gap-4")}>
        <h3 className="text-md font-semibold text-primary">
          {lang === "es" ? "Re-ejecutando onboarding" : "Re-running onboarding"}: {nodeId}
        </h3>
        <ul
          className={cx(
            "max-h-80 overflow-auto rounded-md bg-secondary p-3 text-xs space-y-2",
            "border border-secondary",
          )}
          data-testid="reprovision-stream"
        >
          {lines.length === 0 && (
            <li className="text-tertiary">
              {lang === "es" ? "Esperando salida..." : "Waiting for output..."}
            </li>
          )}
          {lines.map((line, i) => {
            const env = line.envelope;
            // Codex Plan04-MEDIUM-#4 — humanize envelope error_code, never raw JSON
            if (env && env.ok === false && env.error_code && isErrorCode(env.error_code)) {
              const copy = lookup(env.error_code);
              return (
                <li key={i} className="text-error-primary">
                  <strong>{copy.title}</strong> — {copy.description}
                  {copy.next_step && (
                    <div className="text-tertiary mt-1">→ {copy.next_step}</div>
                  )}
                </li>
              );
            }
            if (env && typeof env.stderr === "string") {
              return (
                <li key={i} className="text-warning-primary font-mono">
                  {env.stderr}
                </li>
              );
            }
            if (env && typeof env.exitCode === "number") {
              return (
                <li
                  key={i}
                  className={cx(
                    "font-medium",
                    env.exitCode === 0 ? "text-success-primary" : "text-error-primary",
                  )}
                >
                  exit={env.exitCode}
                </li>
              );
            }
            if (env && typeof env.message === "string") {
              return (
                <li key={i} className="text-primary">
                  {env.message}
                </li>
              );
            }
            // Plain log line (non-JSON) — render verbatim
            return (
              <li key={i} className="text-tertiary font-mono">
                {line.raw}
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between">
          <span className="text-xs text-tertiary">
            {exitCode === null
              ? lang === "es"
                ? "Stream activo"
                : "Stream active"
              : `exit=${exitCode}`}
          </span>
          <Button color="secondary" size="sm" onClick={onClose}>
            {lang === "es" ? "Cerrar" : "Close"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
