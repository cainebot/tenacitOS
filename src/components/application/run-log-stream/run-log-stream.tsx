"use client";

// ============================================================
// Phase 69-05 — RunLogStream
//
// Streams `agent_run_logs` chunks into a scrolling `<pre>` container
// with stdout/stderr color coding, timestamp prefixes, auto-scroll-
// to-live behaviour with a "Jump to live" affordance, and a persistent
// non-dismissible warning banner for SECURITY T6 (interim UX until
// server-side masking lands; see FOLLOW-UPS.md §F-69-01).
//
// CRITICAL security constraints (SECURITY T1):
//   - NEVER use `dangerouslySetInnerHTML` here.
//   - NEVER pass `chunk` to a markdown / HTML parser.
//   - Render chunk text as React children ONLY — React's default
//     text-node escaping neutralises <script>/<img onerror=…>/etc.
//
// Props:
//   chunks  — AgentRunLogRow[] (upstream hook caps at 500)
//   active  — true while the run is queued/running; false on terminal.
//             Drives the "Streaming live" / "Finished" header pill.
// ============================================================

import { useEffect, useLayoutEffect, useRef, useState, type FC } from "react";
import { AlertTriangle, ArrowDown } from "@untitledui/icons";
import { Badge, Button, cx } from "@circos/ui";
import type { AgentRunLogRow } from "@/types/supabase";
import { PAYLOAD_MASKING_WARNING } from "@/app/(dashboard)/agents/[id]/copy";

export interface RunLogStreamProps {
  chunks: AgentRunLogRow[];
  active: boolean;
  className?: string;
}

const SCROLL_EPSILON_PX = 8;

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--:--.---";
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  const ms = d.getMilliseconds().toString().padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

export const RunLogStream: FC<RunLogStreamProps> = ({ chunks, active, className }) => {
  const scrollRef = useRef<HTMLPreElement | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);

  const isNearBottom = (el: HTMLElement) =>
    el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_EPSILON_PX;

  // Autoscroll to bottom on chunk-list growth if the user is anchored
  // to the tail. Runs synchronously after DOM mutations so the new
  // chunks are already measurable.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (autoFollow) {
      el.scrollTop = el.scrollHeight;
    }
  }, [chunks.length, autoFollow]);

  // Detach autoFollow when the user scrolls away from the tail; re-
  // attach when they scroll back. This is the "pause on scroll-up"
  // UX from CONTEXT Q3.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const near = isNearBottom(el);
      setAutoFollow(near);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const jumpToLive = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setAutoFollow(true);
  };

  return (
    <section
      className={cx(
        "flex w-full flex-col overflow-hidden rounded-xl border border-secondary bg-primary",
        className,
      )}
      aria-label="Run log stream"
    >
      {/* Header — chunks count + live pill + jump-to-live + banner */}
      <header className="flex flex-col gap-3 border-b border-secondary px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold text-primary [font-family:var(--font-display)]">
            Output
          </h3>
          <Badge type="modern" color="gray" size="md">
            {chunks.length} chunks
          </Badge>
          {active ? (
            <Badge type="pill-color" color="success" size="md">
              Streaming live
            </Badge>
          ) : (
            <Badge type="pill-color" color="gray" size="md">
              Finished
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!autoFollow && (
              <Button
                size="sm"
                color="secondary"
                iconLeading={ArrowDown}
                onClick={jumpToLive}
              >
                Jump to live
              </Button>
            )}
          </div>
        </div>

        {/*
         * SECURITY T6 interim UX — persistent non-dismissible warning.
         * Copy lives in app/(dashboard)/agents/[id]/copy.ts so the
         * Plan 08 smoke can grep for the literal string. Must NEVER
         * render via dangerouslySetInnerHTML.
         */}
        <div
          data-testid="run-log-stream-sensitive-banner"
          role="note"
          className="flex items-start gap-2 rounded-lg border border-warning bg-secondary px-3 py-2 text-xs text-warning-primary"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-primary" aria-hidden />
          <span className="leading-relaxed">{PAYLOAD_MASKING_WARNING}</span>
        </div>
      </header>

      {/* Body — scrolling <pre>. React text-node rendering is the
          entire XSS defense; do NOT add any HTML-parsing path here. */}
      <pre
        ref={scrollRef}
        data-testid="run-log-stream-scroll"
        className={cx(
          "m-0 h-[420px] overflow-y-auto bg-primary p-5 text-xs",
          "[font-family:var(--font-code)]",
        )}
        aria-live={active ? "polite" : "off"}
      >
        {chunks.length === 0 ? (
          <span className="block text-tertiary">
            {active
              ? "Waiting for output…"
              : "No output captured for this run."}
          </span>
        ) : (
          chunks.map((c) => <ChunkLine key={c.id} chunk={c} />)
        )}
      </pre>
    </section>
  );
};

const ChunkLine: FC<{ chunk: AgentRunLogRow }> = ({ chunk }) => {
  const isStderr = chunk.stream === "stderr";
  return (
    <div
      data-testid={`run-log-chunk-${chunk.id}`}
      data-stream={chunk.stream}
      className={cx(
        "whitespace-pre-wrap break-words",
        isStderr ? "text-error-primary" : "text-primary",
      )}
    >
      <span className="mr-2 text-tertiary">{formatTimestamp(chunk.ts)}</span>
      {/* React auto-escapes this text — intentional. See SECURITY T1. */}
      {chunk.chunk}
    </div>
  );
};
