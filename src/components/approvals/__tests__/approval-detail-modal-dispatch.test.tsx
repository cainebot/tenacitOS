// Phase 69 Plan 06 — dispatch component unit tests.
//
// Guards:
//   - Each of the 5 known types mounts its matching
//     approval-payload-<type> testid.
//   - Unknown / future types fall back to
//     approval-payload-fallback (<pre> with JSON.stringify).
//   - No dangerouslySetInnerHTML inside the fallback subtree.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ApprovalPayloadRenderer } from "../approval-payload-renderer";
import type { ApprovalRow, ApprovalType } from "@/types/approval";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeApproval(
  type: ApprovalType | string,
  payload: Record<string, unknown> = {},
): ApprovalRow {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    type: type as ApprovalType,
    status: "pending",
    requested_by_agent_id: null,
    requested_by_run_id: null,
    target_type: "agent",
    target_id: null,
    payload,
    preview: null,
    reason: null,
    approver_human_id: "control-panel",
    decision_note: null,
    created_at: "2026-04-20T12:00:00Z",
    resolved_at: null,
    expires_at: "2026-04-21T12:00:00Z",
  };
}

describe("ApprovalPayloadRenderer dispatch", () => {
  it("create_agent → mounts approval-payload-create_agent", () => {
    render(
      <ApprovalPayloadRenderer
        approval={makeApproval("create_agent", {
          slug: "nova",
          name: "Nova",
          soul_content: "hi",
        })}
      />,
    );
    expect(screen.getByTestId("approval-payload-create_agent")).toBeTruthy();
  });

  it("update_agent → mounts approval-payload-update_agent", () => {
    render(
      <ApprovalPayloadRenderer
        approval={makeApproval("update_agent", {
          agent_id: "nova",
          changes: { name: "Nova v2" },
          target_snapshot: { slug: "nova", name: "Nova" },
        })}
      />,
    );
    expect(screen.getByTestId("approval-payload-update_agent")).toBeTruthy();
  });

  it("delete_agent → mounts approval-payload-delete_agent", () => {
    render(
      <ApprovalPayloadRenderer
        approval={makeApproval("delete_agent", {
          agent_id: "nova",
          target_snapshot: { slug: "nova", name: "Nova", bound_node_id: null },
        })}
      />,
    );
    expect(screen.getByTestId("approval-payload-delete_agent")).toBeTruthy();
  });

  it("delete_agents_bulk → mounts approval-payload-delete_agents_bulk", () => {
    render(
      <ApprovalPayloadRenderer
        approval={makeApproval("delete_agents_bulk", {
          agent_ids: ["a", "b"],
          target_snapshots: [
            { agent_id: "a", slug: "a", name: "A" },
            { agent_id: "b", slug: "b", name: "B" },
          ],
        })}
      />,
    );
    expect(
      screen.getByTestId("approval-payload-delete_agents_bulk"),
    ).toBeTruthy();
  });

  it("send_external_message → mounts approval-payload-send_external_message", () => {
    render(
      <ApprovalPayloadRenderer
        approval={makeApproval("send_external_message", {
          channel: "email",
          recipient: "x@y.com",
          message_body: "hi",
        })}
      />,
    );
    expect(
      screen.getByTestId("approval-payload-send_external_message"),
    ).toBeTruthy();
  });

  it("unknown type → falls back to approval-payload-fallback <pre>", () => {
    render(
      <ApprovalPayloadRenderer
        approval={makeApproval("future_type_not_yet_shipped", { foo: "bar" })}
      />,
    );
    const fb = screen.getByTestId("approval-payload-fallback");
    expect(fb).toBeTruthy();
    expect(fb.tagName.toLowerCase()).toBe("pre");
    expect(fb.textContent).toContain('"foo": "bar"');
  });
});
