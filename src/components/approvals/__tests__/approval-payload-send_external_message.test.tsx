// Phase 69 Plan 06 — send_external_message renderer unit tests.
//
// Guards:
//   - Mounts with data-testid="approval-payload-send_external_message".
//   - SECURITY T2 XSS regression: <script> and <img onerror> inside
//     message_body do NOT execute — no <script> element is inserted,
//     no <img onerror> attribute survives.
//   - Valid markdown still renders (**bold** → <strong>), proving
//     react-markdown is wired in and only HTML is stripped.
//   - Email recipient is masked (email local part).
//   - Zero fetch calls (renderer is payload-pure).

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ApprovalPayloadSendExternalMessage } from "../approval-payload-send_external_message";

afterEach(() => cleanup());

describe("ApprovalPayloadSendExternalMessage", () => {
  it("mounts with the dispatch testid", () => {
    render(
      <ApprovalPayloadSendExternalMessage
        payload={{
          channel: "email",
          recipient: "olivia@example.com",
          message_body: "hello",
        }}
      />,
    );
    expect(
      screen.getByTestId("approval-payload-send_external_message"),
    ).toBeTruthy();
  });

  it("renders the channel badge", () => {
    render(
      <ApprovalPayloadSendExternalMessage
        payload={{
          channel: "sms",
          recipient: "+15551234567",
          message_body: "hi",
        }}
      />,
    );
    expect(screen.getByText("sms")).toBeTruthy();
  });

  it("masks the email local part in the recipient", () => {
    render(
      <ApprovalPayloadSendExternalMessage
        payload={{
          channel: "email",
          recipient: "olivia@example.com",
          message_body: "hi",
        }}
      />,
    );
    const recipientSpan = screen.getByTestId(
      "approval-payload-send_external_message-recipient",
    );
    // "olivia" (6 chars) → "o****a@example.com"
    expect(recipientSpan.textContent).toBe("o****a@example.com");
  });

  it("SECURITY T2: <script> and <img onerror> in message_body DO NOT execute", () => {
    const { container } = render(
      <ApprovalPayloadSendExternalMessage
        payload={{
          channel: "email",
          recipient: "victim@example.com",
          message_body:
            "<script>alert('xss')</script>\n<img src=x onerror=alert(1)>\n**bold**",
        }}
      />,
    );
    // (a) No <script> element injected in the rendered subtree.
    expect(container.querySelectorAll("script").length).toBe(0);
    // (b) No <img> with onerror attribute survived.
    const imgs = container.querySelectorAll("img");
    for (const img of Array.from(imgs)) {
      expect(img.getAttribute("onerror")).toBeNull();
    }
  });

  it("SECURITY T2: valid markdown still renders (**bold** → <strong>)", () => {
    const { container } = render(
      <ApprovalPayloadSendExternalMessage
        payload={{
          channel: "email",
          recipient: "olivia@example.com",
          message_body: "**bold**",
        }}
      />,
    );
    const strongs = container.querySelectorAll("strong");
    expect(strongs.length).toBeGreaterThanOrEqual(1);
    expect(strongs[0].textContent).toBe("bold");
  });

  it("makes ZERO fetch calls", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    render(
      <ApprovalPayloadSendExternalMessage
        payload={{
          channel: "email",
          recipient: "olivia@example.com",
          message_body: "hi",
        }}
      />,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
