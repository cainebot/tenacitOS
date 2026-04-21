"use client";

// Phase 69 Plan 06 — send_external_message approval payload renderer.
//
// Renders the payload the operator is about to dispatch externally:
//   - channel as a coloured Badge.
//   - recipient MASKED (email local part, phone middle digits) so
//     screenshots don't leak PII of the destination contact.
//   - message body rendered via react-markdown in EXPLICIT safe mode.
//
// SECURITY T2 — react-markdown safe-mode configuration (greppable
// invariant for CI):
//   - `skipHtml` prop is set (belt-and-suspenders; raw HTML inside
//     markdown is stripped).
//   - `components={{}}` — no custom renderer overrides. Prevents a
//     future edit from reintroducing dangerouslySetInnerHTML via a
//     custom `components.html` / `components.p` handler.
//   - `rehypePlugins={[]}` — explicit empty. Forbids `rehype-raw`,
//     `rehype-sanitize` configured with `allowDangerousHtml`, or any
//     plugin that opts into raw HTML.
//   - `remarkPlugins={[]}` — explicit empty. Forbids `remark-parse`
//     with `allowDangerousHtml`.
//
// These four invariants make Plan 08 smoke step 6 (rg "rehype-raw",
// "allowDangerousHtml", "dangerouslySetInnerHTML") return zero hits.

import ReactMarkdown from "react-markdown";
import { Badge, cx } from "@circos/ui";
import { APPROVALS_COPY } from "./copy";

interface SendExternalMessagePayload {
  channel?: string;
  recipient?: string;
  to?: string;
  message_body?: string;
  subject?: string;
}

function maskRecipient(recipient: string): string {
  if (!recipient) return "";
  // Email: mask local part → o***a@domain.
  const atIdx = recipient.indexOf("@");
  if (atIdx > 0) {
    const local = recipient.slice(0, atIdx);
    const domain = recipient.slice(atIdx);
    if (local.length <= 2) return `*${"*".repeat(Math.max(0, local.length - 1))}${domain}`;
    return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}${domain}`;
  }
  // Phone: mask middle digits, keep first 2 and last 2.
  const digitsOnly = recipient.replace(/\D/g, "");
  if (digitsOnly.length >= 6) {
    const first = recipient.slice(0, 2);
    const last = recipient.slice(-2);
    return `${first}${"*".repeat(Math.max(0, recipient.length - 4))}${last}`;
  }
  // Anything else: return as-is (LinkedIn URL, Slack id).
  return recipient;
}

export function ApprovalPayloadSendExternalMessage({
  payload,
}: {
  payload: SendExternalMessagePayload;
}) {
  const channel = payload.channel ?? "unknown";
  const rawRecipient = payload.recipient ?? payload.to ?? "";
  const maskedRecipient = rawRecipient
    ? maskRecipient(rawRecipient)
    : APPROVALS_COPY.messageMasked;
  const messageBody = payload.message_body ?? "";
  const subject = payload.subject;

  return (
    <div
      data-testid="approval-payload-send_external_message"
      className="flex flex-col gap-4"
    >
      {/* Channel + recipient */}
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-quaternary">
            {APPROVALS_COPY.messageChannelLabel}
          </span>
          <Badge color="indigo" size="sm" type="pill-color">
            {channel}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-quaternary">
            {APPROVALS_COPY.messageRecipientLabel}
          </span>
          <span
            className="font-mono text-xs text-primary"
            data-testid="approval-payload-send_external_message-recipient"
          >
            {maskedRecipient}
          </span>
        </div>
        {subject && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-quaternary">Subject</span>
            <span className="text-sm text-primary">{subject}</span>
          </div>
        )}
      </section>

      {/* Message body — SAFE markdown */}
      <section className="flex flex-col gap-1">
        <span className="text-xs font-medium text-quaternary">
          {APPROVALS_COPY.messageBodyLabel}
        </span>
        <div
          className={cx(
            "prose prose-sm max-w-none rounded-md border border-secondary bg-tertiary p-3",
            "text-sm text-primary",
          )}
          data-testid="approval-payload-send_external_message-body"
        >
          <ReactMarkdown
            skipHtml
            components={{}}
            rehypePlugins={[]}
            remarkPlugins={[]}
          >
            {messageBody}
          </ReactMarkdown>
        </div>
      </section>
    </div>
  );
}
