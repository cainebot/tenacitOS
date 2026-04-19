// @vitest-environment node
// Phase 68 Plan 08 — GET /api/approvals route tests.
import { describe, it, expect, beforeEach, vi } from "vitest";

const { selectMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
}));

// Default: empty row set.
function resetSelectMock(rows: unknown[] = [], count = 0) {
  selectMock.mockImplementation(() => {
    const chain: Record<string, unknown> = {};
    chain.in = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.limit = vi.fn(() => Promise.resolve({ data: rows, count, error: null }));
    return chain;
  });
}

vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: selectMock,
    }),
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

describe("GET /api/approvals", () => {
  beforeEach(() => {
    selectMock.mockReset();
    resetSelectMock();
    process.env.AUTH_SECRET = "test-secret-aaaaaaaaaaaaaaaa";
  });

  it("returns 401 when mc_auth cookie is missing", async () => {
    const { GET } = await importRoute();
    const res = await GET(makeReq("/api/approvals"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("unauthorized");
  });

  it("returns 401 when mc_auth value does not match AUTH_SECRET", async () => {
    const { GET } = await importRoute();
    const res = await GET(makeReq("/api/approvals", { cookie: "mc_auth=wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 and row list on happy path", async () => {
    resetSelectMock(
      [
        {
          id: "a1",
          type: "create_agent",
          status: "pending",
          requested_by_agent_id: "zooble",
          payload: {},
          created_at: "2026-04-19T00:00:00Z",
          expires_at: "2026-04-20T00:00:00Z",
        },
      ],
      1,
    );
    const { GET } = await importRoute();
    const res = await GET(
      makeReq("/api/approvals", { cookie: "mc_auth=test-secret-aaaaaaaaaaaaaaaa" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.rows).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("returns 400 on unknown type in query", async () => {
    const { GET } = await importRoute();
    const res = await GET(
      makeReq("/api/approvals?types=bogus_type", {
        cookie: "mc_auth=test-secret-aaaaaaaaaaaaaaaa",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_query");
  });

  it("returns 400 on unknown status in query", async () => {
    const { GET } = await importRoute();
    const res = await GET(
      makeReq("/api/approvals?statuses=not_a_status", {
        cookie: "mc_auth=test-secret-aaaaaaaaaaaaaaaa",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("caps limit at 200 (does not reject larger values)", async () => {
    let capturedLimit = -1;
    selectMock.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      chain.in = vi.fn(() => chain);
      chain.order = vi.fn(() => chain);
      chain.limit = vi.fn((n: number) => {
        capturedLimit = n;
        return Promise.resolve({ data: [], count: 0, error: null });
      });
      return chain;
    });
    const { GET } = await importRoute();
    const res = await GET(
      makeReq("/api/approvals?limit=9999", {
        cookie: "mc_auth=test-secret-aaaaaaaaaaaaaaaa",
      }),
    );
    expect(res.status).toBe(200);
    expect(capturedLimit).toBe(200);
  });

  it("returns 400 when limit is non-positive", async () => {
    const { GET } = await importRoute();
    const res = await GET(
      makeReq("/api/approvals?limit=0", {
        cookie: "mc_auth=test-secret-aaaaaaaaaaaaaaaa",
      }),
    );
    expect(res.status).toBe(400);
  });
});
