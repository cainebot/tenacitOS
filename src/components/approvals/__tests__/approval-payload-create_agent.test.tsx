// Phase 69 Plan 06 — create_agent renderer unit tests.
//
// Guards:
//   - Mounts with data-testid="approval-payload-create_agent".
//   - SECURITY T2: React escapes <script> / HTML in soul_content.
//   - SECURITY T18 falsification: "Show full SOUL" reveals char
//     beyond the 2000-char initial window (marker at index 40000).
//   - SECURITY T9 defense-in-depth: avatar_url=javascript: does not
//     reach <img src>, falls back to initials.
//   - Zero fetch calls (renderer is payload-pure).

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ApprovalPayloadCreateAgent } from "../approval-payload-create_agent";

afterEach(() => cleanup());

describe("ApprovalPayloadCreateAgent", () => {
  it("mounts with the dispatch testid", () => {
    render(
      <ApprovalPayloadCreateAgent
        payload={{
          slug: "nova",
          name: "Nova",
          soul_content: "hello world",
          avatar_url: "https://example.com/a.png",
        }}
      />,
    );
    expect(screen.getByTestId("approval-payload-create_agent")).toBeTruthy();
  });

  it("renders name, slug subtitle, and soul length counter", () => {
    render(
      <ApprovalPayloadCreateAgent
        payload={{ slug: "nova", name: "Nova", soul_content: "abc" }}
      />,
    );
    expect(screen.getByText("Nova")).toBeTruthy();
    expect(screen.getByText("slug: nova")).toBeTruthy();
    expect(screen.getByText("3/50000")).toBeTruthy();
  });

  it("makes ZERO fetch calls for payload-pure rendering", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    render(
      <ApprovalPayloadCreateAgent
        payload={{
          slug: "nova",
          name: "Nova",
          soul_content: "hello",
          avatar_url: "https://example.com/a.png",
        }}
      />,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("SECURITY T2: <script> in soul_content renders as text, no <script> element", () => {
    const { container } = render(
      <ApprovalPayloadCreateAgent
        payload={{
          slug: "evil",
          name: "Evil",
          soul_content: "<script>alert(1)</script>",
        }}
      />,
    );
    expect(container.querySelectorAll("script").length).toBe(0);
    // The literal text should be present inside the <pre>.
    expect(screen.getByTestId("approval-payload-create_agent-soul").textContent).toContain(
      "<script>",
    );
  });

  it("SECURITY T18: 'Show full SOUL' reveals text beyond index 2000", () => {
    const marker = "MARKER_AT_40K";
    const soul = "x".repeat(40000) + marker + "x".repeat(9000);
    render(
      <ApprovalPayloadCreateAgent
        payload={{ slug: "verbose", name: "Verbose", soul_content: soul }}
      />,
    );
    // Initial render: marker NOT in DOM (only first 2000 chars).
    expect(screen.queryByText(/MARKER_AT_40K/)).toBeNull();
    // Click expand.
    const btn = screen.getByRole("button", { name: /Show full SOUL/i });
    fireEvent.click(btn);
    // Now the marker IS in the DOM.
    const soulPre = screen.getByTestId("approval-payload-create_agent-soul");
    expect(soulPre.textContent ?? "").toContain(marker);
  });

  it("SECURITY T9: javascript: avatar_url falls back to initials, no <img> with that src", () => {
    const { container } = render(
      <ApprovalPayloadCreateAgent
        payload={{
          slug: "evil",
          name: "Ev",
          avatar_url: "javascript:alert(1)",
        }}
      />,
    );
    const imgs = container.querySelectorAll("img");
    for (const img of Array.from(imgs)) {
      expect(img.getAttribute("src") ?? "").not.toContain("javascript:");
    }
  });

  it("graceful render when payload fields are absent", () => {
    render(<ApprovalPayloadCreateAgent payload={{}} />);
    expect(screen.getByTestId("approval-payload-create_agent")).toBeTruthy();
    expect(screen.getByText("(unnamed)")).toBeTruthy();
  });
});
