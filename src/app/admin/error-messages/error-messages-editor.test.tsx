// Phase 64.5.2-05 Plan Task 1 — Admin editor for /admin/error-messages.
// Covers: missing-env card, 403 path, row render, PUT with x-user-email,
// orphan-only delete, global "All changes saved" toast.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as never;
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const sampleRows = [
  {
    error_code: "tailscale_not_logged_in",
    lang: "es",
    title: "Tu Mac no está en la tailnet",
    description: "Tailscale corriendo sin sesión.",
    next_step: "Ejecuta `circos join`.",
    doc_link: "https://tailscale.com/kb/1028/key-expiry",
  },
  {
    error_code: "legacy_orphan_code",
    lang: "en",
    title: "Orphan title",
    description: "Orphan desc",
    next_step: "Step",
    doc_link: "https://example.com",
  },
];

describe("ErrorMessagesEditor", () => {
  it("renders missing-env card and skips fetch when NEXT_PUBLIC_ADMIN_EMAIL unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAIL", "");
    const { ErrorMessagesEditor } = await import("./error-messages-editor");
    render(<ErrorMessagesEditor />);
    expect(screen.getAllByText(/NEXT_PUBLIC_ADMIN_EMAIL/i).length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders forbidden card when API returns 403", async () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAIL", "admin@circos.dev");
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: "forbidden" }),
    });
    const { ErrorMessagesEditor } = await import("./error-messages-editor");
    render(<ErrorMessagesEditor />);
    await waitFor(() => {
      expect(screen.getByText(/admin access required/i)).toBeTruthy();
    });
  });

  it("renders rows and sends x-user-email header on GET", async () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAIL", "admin@circos.dev");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ rows: sampleRows }),
    });
    const { ErrorMessagesEditor } = await import("./error-messages-editor");
    render(<ErrorMessagesEditor />);
    await waitFor(() => {
      expect(screen.getByText("tailscale_not_logged_in")).toBeTruthy();
    });
    const initCall = fetchMock.mock.calls[0];
    expect(initCall[1].headers["x-user-email"]).toBe("admin@circos.dev");
  });

  it("PUT save sends x-user-email and shows global toast on success", async () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAIL", "admin@circos.dev");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ rows: sampleRows }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    const { ErrorMessagesEditor } = await import("./error-messages-editor");
    render(<ErrorMessagesEditor />);
    await waitFor(() => {
      expect(screen.getByText("tailscale_not_logged_in")).toBeTruthy();
    });
    // Find first Save button
    const saveBtns = screen.getAllByRole("button", { name: /save|guardar/i });
    fireEvent.click(saveBtns[0]);
    await waitFor(() => {
      const putCall = fetchMock.mock.calls[1];
      expect(putCall[1].method).toBe("PUT");
      expect(putCall[1].headers["x-user-email"]).toBe("admin@circos.dev");
    });
    await waitFor(() => {
      expect(screen.getByText(/All changes saved/i)).toBeTruthy();
    });
  });

  it("renders Delete button only for orphan codes (not in registry)", async () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAIL", "admin@circos.dev");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ rows: sampleRows }),
    });
    const { ErrorMessagesEditor } = await import("./error-messages-editor");
    render(<ErrorMessagesEditor />);
    await waitFor(() => {
      expect(screen.getByText("legacy_orphan_code")).toBeTruthy();
    });
    // Only one delete button — for the orphan row
    const deleteBtns = screen.queryAllByRole("button", { name: /delete|eliminar/i });
    expect(deleteBtns.length).toBe(1);
  });
});
