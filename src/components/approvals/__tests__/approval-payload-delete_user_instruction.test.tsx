// Phase 69 Plan 10 — delete_user_instruction renderer tests.

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ApprovalPayloadDeleteUserInstruction } from "../approval-payload-delete_user_instruction";

afterEach(() => cleanup());

describe("ApprovalPayloadDeleteUserInstruction", () => {
  it("mounts with testid + renders warning + content length", () => {
    render(
      <ApprovalPayloadDeleteUserInstruction
        payload={{
          agent_id: "pomni",
          file_name: "Playbook.md",
          target_snapshot: {
            agent_name: "Pomni",
            agent_slug: "pomni",
            file_icon: "FileCheck02",
            prior_content_length: 1234,
          },
        }}
      />,
    );
    expect(screen.getByTestId("approval-payload-delete_user_instruction")).toBeTruthy();
    // File name appears twice (header chip + warning body); just assert both exist.
    expect(screen.getAllByText("Playbook.md").length).toBeGreaterThan(0);
    expect(screen.getByText(/1,234 chars will be discarded/i)).toBeTruthy();
  });

  it("escapes XSS in file_name", () => {
    const { container } = render(
      <ApprovalPayloadDeleteUserInstruction
        payload={{
          agent_id: "pomni",
          file_name: "<script>evil</script>.md",
          target_snapshot: { prior_content_length: 0 },
        }}
      />,
    );
    expect(container.querySelector("script")).toBeNull();
  });
});
