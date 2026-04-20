// Phase 69 Plan 10 — update_identity_file_content renderer tests.
//
// Covers: data-testid dispatch, before/after diff, XSS escape, icon fallback.

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ApprovalPayloadUpdateIdentityFileContent } from "../approval-payload-update_identity_file_content";

afterEach(() => cleanup());

describe("ApprovalPayloadUpdateIdentityFileContent", () => {
  it("mounts with the dispatch testid", () => {
    render(
      <ApprovalPayloadUpdateIdentityFileContent
        payload={{
          agent_id: "pomni",
          file_type: "tools",
          content: "new",
          target_snapshot: {
            agent_name: "Pomni",
            agent_slug: "pomni",
            file_icon: "FileCheck02",
            prior_content: "old",
          },
        }}
      />,
    );
    expect(screen.getByTestId("approval-payload-update_identity_file_content")).toBeTruthy();
  });

  it("renders before/after content panels", () => {
    render(
      <ApprovalPayloadUpdateIdentityFileContent
        payload={{
          agent_id: "pomni",
          file_type: "tools",
          content: "the new body",
          target_snapshot: {
            agent_name: "Pomni",
            prior_content: "the old body",
          },
        }}
      />,
    );
    expect(screen.getByText("the new body")).toBeTruthy();
    expect(screen.getByText("the old body")).toBeTruthy();
  });

  it("escapes <script> XSS in content (React text children)", () => {
    const { container } = render(
      <ApprovalPayloadUpdateIdentityFileContent
        payload={{
          agent_id: "pomni",
          file_type: "tools",
          content: "<script>alert(1)</script>",
          target_snapshot: { prior_content: "clean" },
        }}
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("<script>alert(1)</script>")).toBeTruthy();
  });

  it("falls back to File06 when icon is unknown (no crash)", () => {
    expect(() =>
      render(
        <ApprovalPayloadUpdateIdentityFileContent
          payload={{
            agent_id: "pomni",
            file_type: "tools",
            content: "x",
            target_snapshot: {
              file_icon: "TotallyNotAnIcon__",
              prior_content: "y",
            },
          }}
        />,
      ),
    ).not.toThrow();
  });
});
