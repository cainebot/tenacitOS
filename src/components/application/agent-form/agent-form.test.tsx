// Phase 69 Plan 02 — AgentForm unit tests.
// Covers: create-mode minimal submit, dangerous-char name rejection,
// oversize SOUL rejection, dangerous avatar_url scheme rejection, and
// readOnly mode (no submit button; inputs disabled).
//
// Uses @testing-library/react fireEvent (user-event is not a dep).

import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { AgentForm, type AgentFormValues } from "./agent-form";

afterEach(() => cleanup());

function typeInto(el: HTMLElement, value: string) {
  fireEvent.change(el, { target: { value } });
}

describe("AgentForm", () => {
  it("create mode — submits a minimal valid payload", async () => {
    const onSubmit = vi.fn<(v: AgentFormValues) => Promise<void>>(async () => {});
    render(<AgentForm mode="create" onSubmit={onSubmit} />);

    const name = screen.getByLabelText(/^Name/) as HTMLInputElement;
    typeInto(name, "Scrum Master");

    // The slug auto-derives from the name; submit the form.
    const submit = screen.getByRole("button", { name: /Request creation/i });
    fireEvent.click(submit);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const values = onSubmit.mock.calls[0]?.[0];
    expect(values?.name).toBe("Scrum Master");
    expect(values?.slug).toBe("scrum-master");
    expect(values?.soul_content).toBe("");
    expect(values?.avatar_url).toBe("");
  });

  it("rejects names with HTML metacharacters", () => {
    const onSubmit = vi.fn();
    render(<AgentForm mode="create" onSubmit={onSubmit} />);
    const name = screen.getByLabelText(/^Name/);
    typeInto(name, "bad<name>");

    const submit = screen.getByRole("button", { name: /Request creation/i });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects SOUL > 50 KB", () => {
    const onSubmit = vi.fn();
    render(<AgentForm mode="create" onSubmit={onSubmit} />);
    typeInto(screen.getByLabelText(/^Name/), "Jax");
    const soul = screen.getByLabelText(/^SOUL/) as HTMLTextAreaElement;
    typeInto(soul, "x".repeat(50_001));

    const submit = screen.getByRole("button", { name: /Request creation/i });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects dangerous avatar_url schemes (javascript:)", () => {
    const onSubmit = vi.fn();
    render(<AgentForm mode="create" onSubmit={onSubmit} />);
    typeInto(screen.getByLabelText(/^Name/), "Jax");
    typeInto(screen.getByLabelText(/Avatar URL/), "javascript:alert(1)");

    const submit = screen.getByRole("button", { name: /Request creation/i });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("readOnly — inputs disabled, no submit button rendered", () => {
    render(
      <AgentForm
        mode="edit"
        readOnly
        onSubmit={vi.fn()}
        initial={{ name: "Locked Agent", slug: "locked-agent" }}
      />,
    );

    const name = screen.getByLabelText(/^Name/) as HTMLInputElement;
    expect(name.disabled).toBe(true);
    expect(name.value).toBe("Locked Agent");
    expect(
      screen.queryByRole("button", { name: /Request creation/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Request update/i }),
    ).toBeNull();
  });
});
