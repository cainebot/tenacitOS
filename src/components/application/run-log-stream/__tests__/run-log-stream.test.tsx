// Phase 69 Plan 05 — RunLogStream unit tests.
//
// Guards:
//   - SECURITY T1 (DOM-XSS): <script> / <img onerror> / javascript:
//     payloads in a chunk render as text nodes only; no <script> or
//     <img> element is injected.
//   - SECURITY T6 banner: the persistent warning banner with the exact
//     PAYLOAD_MASKING_WARNING copy is always visible (even with 0
//     chunks), matching the interim-UX contract in the plan.
//   - stdout / stderr streams receive distinct semantic classes.
//   - No dangerouslySetInnerHTML usage in the rendered DOM (sanity).
//   - 500-chunk upper bound renders without throwing.

import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { RunLogStream } from "../run-log-stream";
import { PAYLOAD_MASKING_WARNING } from "@/app/(dashboard)/agents/[id]/copy";
import type { AgentRunLogRow } from "@/types/supabase";

afterEach(() => cleanup());

function makeChunk(
  id: number,
  stream: "stdout" | "stderr",
  chunk: string,
): AgentRunLogRow {
  return {
    id,
    run_id: "11111111-2222-3333-4444-555555555555",
    stream,
    chunk,
    ts: "2026-04-20T12:34:56.123Z",
  };
}

describe("RunLogStream", () => {
  it("always renders the SECURITY T6 sensitive-data warning banner", () => {
    render(<RunLogStream chunks={[]} active />);
    const banner = screen.getByTestId("run-log-stream-sensitive-banner");
    expect(banner).toBeTruthy();
    expect(banner.textContent ?? "").toContain(PAYLOAD_MASKING_WARNING);
  });

  it("renders the banner even when chunks exist (non-dismissible)", () => {
    render(
      <RunLogStream
        active
        chunks={[makeChunk(1, "stdout", "hello")]}
      />,
    );
    expect(screen.getByTestId("run-log-stream-sensitive-banner")).toBeTruthy();
  });

  it("renders stdout with text-primary and stderr with text-error-primary", () => {
    const { container } = render(
      <RunLogStream
        active
        chunks={[
          makeChunk(1, "stdout", "hello"),
          makeChunk(2, "stderr", "boom"),
        ]}
      />,
    );
    const stdout = container.querySelector(
      '[data-testid="run-log-chunk-1"][data-stream="stdout"]',
    ) as HTMLElement | null;
    const stderr = container.querySelector(
      '[data-testid="run-log-chunk-2"][data-stream="stderr"]',
    ) as HTMLElement | null;

    expect(stdout).not.toBeNull();
    expect(stderr).not.toBeNull();
    expect(stdout!.className).toContain("text-primary");
    expect(stderr!.className).toContain("text-error-primary");
  });

  it("SECURITY T1: <script> in chunk renders as text, no <script> element created", () => {
    const { container } = render(
      <RunLogStream
        active
        chunks={[
          makeChunk(99, "stderr", "<script>alert(1)</script>"),
        ]}
      />,
    );
    // The literal string appears as text content.
    const chunkEl = container.querySelector(
      '[data-testid="run-log-chunk-99"]',
    ) as HTMLElement | null;
    expect(chunkEl).not.toBeNull();
    expect(chunkEl!.textContent ?? "").toContain("<script>alert(1)</script>");
    // ...but no <script> element is actually injected into the scroll body.
    const scrollBody = container.querySelector(
      '[data-testid="run-log-stream-scroll"]',
    ) as HTMLElement | null;
    expect(scrollBody).not.toBeNull();
    expect(scrollBody!.querySelectorAll("script").length).toBe(0);
  });

  it("SECURITY T1: <img onerror=…> in chunk does not create an <img> element", () => {
    const { container } = render(
      <RunLogStream
        active
        chunks={[
          makeChunk(7, "stderr", "<img src=x onerror=alert(1)>"),
        ]}
      />,
    );
    const chunkEl = container.querySelector(
      '[data-testid="run-log-chunk-7"]',
    ) as HTMLElement | null;
    expect(chunkEl).not.toBeNull();
    expect(chunkEl!.textContent ?? "").toContain("<img src=x onerror=alert(1)>");
    // No real <img> element gets instantiated inside our chunk cell.
    expect(chunkEl!.querySelectorAll("img").length).toBe(0);
  });

  it("SECURITY T1: 'javascript:' literal stays as text (no href coercion path)", () => {
    const { container } = render(
      <RunLogStream
        active
        chunks={[
          makeChunk(3, "stdout", "see javascript:alert(1) for details"),
        ]}
      />,
    );
    const chunkEl = container.querySelector(
      '[data-testid="run-log-chunk-3"]',
    ) as HTMLElement | null;
    expect(chunkEl).not.toBeNull();
    expect(chunkEl!.textContent ?? "").toContain("javascript:alert(1)");
    // No <a href> is built from this text.
    expect(chunkEl!.querySelectorAll("a").length).toBe(0);
  });

  it("renders 500 chunks without errors (upper-bound DOM)", () => {
    const chunks = Array.from({ length: 500 }, (_, i) =>
      makeChunk(
        i + 1,
        i % 13 === 0 ? "stderr" : "stdout",
        `line ${i + 1}`,
      ),
    );
    const { container } = render(<RunLogStream active chunks={chunks} />);
    const scroll = container.querySelector(
      '[data-testid="run-log-stream-scroll"]',
    );
    expect(scroll).not.toBeNull();
    // One chunk element per id — spot-check first and last.
    expect(container.querySelector('[data-testid="run-log-chunk-1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="run-log-chunk-500"]')).not.toBeNull();
  });

  it('shows "Streaming live" when active and "Finished" when terminal', () => {
    const { rerender } = render(<RunLogStream chunks={[]} active />);
    expect(screen.queryByText("Streaming live")).not.toBeNull();
    expect(screen.queryByText("Finished")).toBeNull();

    rerender(<RunLogStream chunks={[]} active={false} />);
    expect(screen.queryByText("Finished")).not.toBeNull();
    expect(screen.queryByText("Streaming live")).toBeNull();
  });
});
