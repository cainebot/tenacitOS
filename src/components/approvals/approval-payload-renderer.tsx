"use client";

// Phase 69 Plan 06 — dispatcher for per-type approval payload
// renderers.
//
// Switches on `approval.type` and returns the matching
// approval-payload-<type>.tsx component. Unknown or future types
// fall back to the raw JSON <pre> (existing Phase 68 behaviour) —
// text children only, no dangerouslySetInnerHTML — so the DOM is
// forward-compatible without becoming an XSS sink.
//
// Each renderer ships its own `data-testid="approval-payload-<type>"`
// so Plan 08 smoke + this plan's component tests can assert the
// dispatch is wired correctly.

import { cx } from "@circos/ui";
import type { ApprovalRow } from "@/types/approval";
import { ApprovalPayloadCreateAgent } from "./approval-payload-create_agent";
import { ApprovalPayloadUpdateAgent } from "./approval-payload-update_agent";
import { ApprovalPayloadDeleteAgent } from "./approval-payload-delete_agent";
import { ApprovalPayloadDeleteAgentsBulk } from "./approval-payload-delete_agents_bulk";
import { ApprovalPayloadSendExternalMessage } from "./approval-payload-send_external_message";

export function ApprovalPayloadRenderer({
  approval,
}: {
  approval: ApprovalRow;
}) {
  const payload = (approval.payload ?? {}) as Record<string, unknown>;

  switch (approval.type) {
    case "create_agent":
      return <ApprovalPayloadCreateAgent payload={payload} />;
    case "update_agent":
      return <ApprovalPayloadUpdateAgent payload={payload} />;
    case "delete_agent":
      return <ApprovalPayloadDeleteAgent payload={payload} />;
    case "delete_agents_bulk":
      return <ApprovalPayloadDeleteAgentsBulk payload={payload} />;
    case "send_external_message":
      return <ApprovalPayloadSendExternalMessage payload={payload} />;
    default:
      // Forward-compat: future approval types render as raw JSON.
      // React text children → auto-escaped; no dangerouslySetInnerHTML.
      return (
        <pre
          data-testid="approval-payload-fallback"
          className={cx(
            "max-h-80 overflow-auto rounded-md border border-secondary bg-tertiary p-3",
            "font-mono text-xs text-primary whitespace-pre-wrap break-all",
          )}
        >
          {JSON.stringify(approval.payload ?? {}, null, 2)}
        </pre>
      );
  }
}
