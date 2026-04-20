// Phase 69 Plan 10 — update_user_instruction_content renderer tests.

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ApprovalPayloadUpdateUserInstructionContent } from "../approval-payload-update_user_instruction_content";

afterEach(() => cleanup());

describe("ApprovalPayloadUpdateUserInstructionContent", () => {
  it("mounts with testid + renders version bump", () => {
    render(
      <ApprovalPayloadUpdateUserInstructionContent
        payload={{
          agent_id: "pomni",
          file_name: "Playbook.md",
          content: "v2 body",
          target_snapshot: {
            agent_name: "Pomni",
            prior_content: "v1 body",
            prior_version: 2,
          },
        }}
      />,
    );
    expect(screen.getByTestId("approval-payload-update_user_instruction_content")).toBeTruthy();
    expect(screen.getByText("v2 → v3")).toBeTruthy();
    expect(screen.getByText("v1 body")).toBeTruthy();
    expect(screen.getByText("v2 body")).toBeTruthy();
  });

  it("escapes XSS in content", () => {
    const { container } = render(
      <ApprovalPayloadUpdateUserInstructionContent
        payload={{
          agent_id: "pomni",
          file_name: "Playbook.md",
          content: "<script>alert(1)</script>",
          target_snapshot: { prior_content: "<img onerror=x>" },
        }}
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });
});
