// @vitest-environment node
// Phase 68 Plan 08 — GET /api/approvals/count route tests.
import { describe, it, expect, beforeEach, vi } from "vitest";

const { selectMock } = vi.hoisted(() => ({ selectMock: vi.fn() }));

function resetSelectMock(count = 0) {
  selectMock.mockImplementation(() => {
    const chain: Record<string, unknown> = {};
    chain.in = vi.fn(() => Promise.resolve({ count, error: null }));
    return chain;
  });
}

vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: () => ({
    from: () => ({ select: selectMock }),
  }),
}));

async function importRoute() {
  vi.resetModules();
  return await import("./route");
}

function makeReq(path: string, opts: { cookie?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.cookie) headers["cookie"] = opts.cookie;
  const { NextRequest } = require("next/server");
  return new NextRequest(`http://localhost:3005${path}`, { headers });
}

describe("GET /api/approvals/count", () => {
  beforeEach(() => {
    selectMock.mockReset();
    resetSelectMock(0);
    process.env.AUTH_SECRET = "test-secret-aaaaaaaaaaaaaaaa";
  });

  it("returns 401 without mc_auth", async () => {
    const { GET } = await importRoute();
    const res = await GET(makeReq("/api/approvals/count"));
    expect(res.status).toBe(401);
  });

  it("returns 200 and { count } on happy path", async () => {
    resetSelectMock(7);
    const { GET } = await importRoute();
    const res = await GET(
      makeReq("/api/approvals/count", {
        cookie: "mc_auth=test-secret-aaaaaaaaaaaaaaaa",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.count).toBe(7);
  });

  it("returns 0 when DB returns null count", async () => {
    resetSelectMock(0);
    selectMock.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      chain.in = vi.fn(() => Promise.resolve({ count: null, error: null }));
      return chain;
    });
    const { GET } = await importRoute();
    const res = await GET(
      makeReq("/api/approvals/count", {
        cookie: "mc_auth=test-secret-aaaaaaaaaaaaaaaa",
      }),
    );
    const body = await res.json();
    expect(body.count).toBe(0);
  });
});
