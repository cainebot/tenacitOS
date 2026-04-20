// Phase 69 Plan 10 — create_user_instruction renderer tests.

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ApprovalPayloadCreateUserInstruction } from "../approval-payload-create_user_instruction";

afterEach(() => cleanup());

describe("ApprovalPayloadCreateUserInstruction", () => {
  it("mounts with testid + renders file_name + icon fallback", () => {
    render(
      <ApprovalPayloadCreateUserInstruction
        payload={{
          agent_id: "pomni",
          file_name: "Playbook.md",
          icon: "FileCheck02",
          content: "Hello",
          target_snapshot: { agent_name: "Pomni", agent_slug: "pomni" },
        }}
      />,
    );
    expect(screen.getByTestId("approval-payload-create_user_instruction")).toBeTruthy();
    expect(screen.getByText("Playbook.md")).toBeTruthy();
    expect(screen.getByText("Hello")).toBeTruthy();
  });

  it("escapes XSS in file_name", () => {
    const { container } = render(
      <ApprovalPayloadCreateUserInstruction
        payload={{
          agent_id: "pomni",
          file_name: "<script>XSS</script>.md",
          icon: "FileCheck02",
          content: "hi",
        }}
      />,
    );
    expect(container.querySelector("script")).toBeNull();
  });

  it("escapes XSS in content", () => {
    const { container } = render(
      <ApprovalPayloadCreateUserInstruction
        payload={{
          agent_id: "pomni",
          file_name: "Playbook.md",
          icon: "FileCheck02",
          content: "<img src=x onerror=alert(1)>",
        }}
      />,
    );
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows (no initial content) hint when empty", () => {
    render(
      <ApprovalPayloadCreateUserInstruction
        payload={{
          agent_id: "pomni",
          file_name: "Playbook.md",
          icon: "FileCheck02",
          content: "",
        }}
      />,
    );
    expect(screen.getByText(/no initial content/i)).toBeTruthy();
  });

  it("falls back to File06 on unknown icon (no crash)", () => {
    expect(() =>
      render(
        <ApprovalPayloadCreateUserInstruction
          payload={{
            agent_id: "pomni",
            file_name: "Playbook.md",
            icon: "NonExistentIcon99",
            content: "x",
          }}
        />,
      ),
    ).not.toThrow();
  });
});
