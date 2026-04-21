import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Mock supabase BEFORE importing the hook
vi.mock("@/lib/supabase", () => ({
  createBrowserClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({
          data: [
            {
              error_code: "tailscale_not_logged_in",
              lang: "es",
              title: "DB Title",
              description: "DB Desc",
              next_step: "DB Step",
              doc_link: "https://example.com",
            },
          ],
          error: null,
        }),
      }),
    }),
  }),
}));

import { useErrorMessages } from "./useErrorMessages";

describe("useErrorMessages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns DB row when cached", async () => {
    const { result } = renderHook(() => useErrorMessages("es"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const copy = result.current.lookup("tailscale_not_logged_in");
    expect(copy.title).toBe("DB Title");
  });

  it("falls back to LOOKUP_FALLBACK for codes not in DB", async () => {
    const { result } = renderHook(() => useErrorMessages("es"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const copy = result.current.lookup("authkey_missing");
    expect(copy.title).toContain("authkey");
  });
});
