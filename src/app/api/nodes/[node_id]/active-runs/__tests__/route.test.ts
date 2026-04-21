// @vitest-environment node
// Phase 69 Plan 07 — GET /api/nodes/[node_id]/active-runs coverage
// (REMEDIATION-3).
//
// Guards:
//   - Happy path: valid node_id → 200 + numeric count from DB.
//   - Not-found / no-rows: zero-count → 200 { count: 0 }.
//   - Queued run counted: SPEC-69-NODE-02 falsification (REVIEW finding 3).
//   - SECURITY T13: malformed node_id → 400 INVALID_ID, no Postgres
//     error leakage.
//   - SECURITY T5: cross-origin Origin → 403 INVALID_ORIGIN.
//   - mc_auth: 401 on missing cookie.
//   - The SQL filter uses ACTIVE_RUN_STATUSES (['queued','running']) —
//     pins the route's constant against REVIEW finding 3 semantic drift.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const AUTH = "test-secret-aaaaaaaaaaaaaaaa";
const VALID_NODE = "circus-01";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: () => ({ from: fromMock }),
}));

async function importRoute() {
  vi.resetModules();
  return await import("../route");
}

interface MakeReqOpts {
  method?: string;
  origin?: string | null;
  cookie?: string;
}

function makeReq(nodeId: string, opts: MakeReqOpts = {}): NextRequest {
  const headers: Record<string, string> = {};
  const origin = opts.origin === undefined ? "http://localhost:3000" : opts.origin;
  if (origin) headers["origin"] = origin;
  if (opts.cookie) headers["cookie"] = opts.cookie;

  const url = `http://localhost:3000/api/nodes/${nodeId}/active-runs`;
  return new NextRequest(url, {
    method: opts.method ?? "GET",
    headers,
  });
}

const cookieHeader = () => `mc_auth=${AUTH}`;
const paramsOf = (node_id: string) => ({ params: Promise.resolve({ node_id }) });

interface WireOpts {
  count?: number | null;
  error?: { message: string } | null;
}

function wireCount(opts: WireOpts = {}) {
  const captured = {
    eqColumn: null as string | null,
    eqValue: null as string | null,
    inColumn: null as string | null,
    inValues: null as string[] | null,
    selectHead: null as boolean | null,
    selectCount: null as string | null,
  };
  fromMock.mockImplementation((table: string) => {
    if (table !== "agent_runs") {
      throw new Error(`Unexpected table: ${table}`);
    }
    return {
      select: (_cols: string, selOpts: { count?: string; head?: boolean } = {}) => {
        captured.selectCount = selOpts.count ?? null;
        captured.selectHead = selOpts.head ?? null;
        return {
          eq: (col: string, val: string) => {
            captured.eqColumn = col;
            captured.eqValue = val;
            return {
              in: (inCol: string, inVals: string[]) => {
                captured.inColumn = inCol;
                captured.inValues = inVals;
                return Promise.resolve({
                  count: opts.count ?? 0,
                  error: opts.error ?? null,
                });
              },
            };
          },
        };
      },
    };
  });
  return captured;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AUTH_SECRET = AUTH;
  delete process.env.CIRCOS_ALLOWED_ORIGINS;
  fromMock.mockReset();
  wireCount();
});

describe("GET /api/nodes/[node_id]/active-runs", () => {
  it("returns 200 + numeric count on happy path", async () => {
    wireCount({ count: 3 });
    const { GET } = await importRoute();
    const res = await GET(
      makeReq(VALID_NODE, { cookie: cookieHeader() }),
      paramsOf(VALID_NODE),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.node_id).toBe(VALID_NODE);
    expect(body.count).toBe(3);
  });

  it("returns { count: 0 } when DB reports zero matches (empty-count path)", async () => {
    wireCount({ count: 0 });
    const { GET } = await importRoute();
    const res = await GET(
      makeReq(VALID_NODE, { cookie: cookieHeader() }),
      paramsOf(VALID_NODE),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(0);
  });

  it("returns { count: 0 } when supabase returns null count (coerces to 0)", async () => {
    wireCount({ count: null });
    const { GET } = await importRoute();
    const res = await GET(
      makeReq(VALID_NODE, { cookie: cookieHeader() }),
      paramsOf(VALID_NODE),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(0);
  });

  it("SPEC-69-NODE-02: queued run counts toward active (REVIEW finding 3)", async () => {
    // The route filters via `.in("status", ACTIVE_RUN_STATUSES)`. This
    // test asserts that the SQL actually asks for queued + running.
    const captured = wireCount({ count: 1 });
    const { GET } = await importRoute();
    const res = await GET(
      makeReq(VALID_NODE, { cookie: cookieHeader() }),
      paramsOf(VALID_NODE),
    );
    expect(res.status).toBe(200);
    expect(captured.inColumn).toBe("status");
    expect(captured.inValues).toEqual(["queued", "running"]);
  });

  it("scopes the count by node_id via .eq('node_id', $1)", async () => {
    const captured = wireCount({ count: 2 });
    const { GET } = await importRoute();
    await GET(makeReq(VALID_NODE, { cookie: cookieHeader() }), paramsOf(VALID_NODE));
    expect(captured.eqColumn).toBe("node_id");
    expect(captured.eqValue).toBe(VALID_NODE);
  });

  it("uses head:true + count:'exact' so no row bytes are returned", async () => {
    const captured = wireCount({ count: 5 });
    const { GET } = await importRoute();
    await GET(makeReq(VALID_NODE, { cookie: cookieHeader() }), paramsOf(VALID_NODE));
    expect(captured.selectHead).toBe(true);
    expect(captured.selectCount).toBe("exact");
  });

  it("SECURITY T13: malformed node_id → 400 INVALID_ID, no Postgres leakage", async () => {
    const { GET } = await importRoute();
    const res = await GET(
      makeReq("not a valid node", { cookie: cookieHeader() }),
      paramsOf("not a valid node"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("INVALID_ID");
    // No "invalid input syntax" / no Postgres stack-trace hint.
    expect(JSON.stringify(body)).not.toMatch(/syntax|Postgres|stack/i);
    // Crucially: no DB contact on the malformed-id path.
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("SECURITY T13: injection-shaped node_id rejected before DB contact", async () => {
    const { GET } = await importRoute();
    const evil = "circus-01'; DROP TABLE agent_runs;--";
    const res = await GET(
      makeReq(evil, { cookie: cookieHeader() }),
      paramsOf(evil),
    );
    expect(res.status).toBe(400);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("SECURITY T5: cross-origin GET → 403 INVALID_ORIGIN", async () => {
    const { GET } = await importRoute();
    const res = await GET(
      makeReq(VALID_NODE, {
        origin: "https://evil.example",
        cookie: cookieHeader(),
      }),
      paramsOf(VALID_NODE),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("INVALID_ORIGIN");
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("returns 401 without mc_auth cookie", async () => {
    const { GET } = await importRoute();
    const res = await GET(makeReq(VALID_NODE), paramsOf(VALID_NODE));
    expect(res.status).toBe(401);
  });

  it("returns 500 db_error when supabase count fails", async () => {
    wireCount({ error: { message: "connection refused" } });
    const { GET } = await importRoute();
    const res = await GET(
      makeReq(VALID_NODE, { cookie: cookieHeader() }),
      paramsOf(VALID_NODE),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("db_error");
  });
});
