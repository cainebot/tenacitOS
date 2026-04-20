// @vitest-environment node
// Phase 69-03 — /api/agents GET + POST coverage.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const AUTH = "test-secret-aaaaaaaaaaaaaaaa";

const { fromMock, selectChain, insertChain } = vi.hoisted(() => {
  const selectChain = {
    order: vi.fn(),
    is: vi.fn(),
    in: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  const insertChain = {
    select: vi.fn(),
    single: vi.fn(),
  };
  const fromMock = vi.fn();
  return { fromMock, selectChain, insertChain };
});

vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: () => ({
    from: fromMock,
  }),
}));

async function importRoute() {
  vi.resetModules();
  return await import("../route");
}

interface MakeReqOpts {
  method?: string;
  origin?: string | null;
  contentType?: string | null;
  cookie?: string;
  body?: unknown;
  search?: string;
}

function makeReq(opts: MakeReqOpts = {}): NextRequest {
  const headers: Record<string, string> = {};
  const origin = opts.origin === undefined ? "http://localhost:3000" : opts.origin;
  if (origin) headers["origin"] = origin;
  const ct = opts.contentType === undefined ? "application/json" : opts.contentType;
  if (ct) headers["content-type"] = ct;
  if (opts.cookie) headers["cookie"] = opts.cookie;

  const url = `http://localhost:3000/api/agents${opts.search ?? ""}`;
  return new NextRequest(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

function cookieHeader(): string {
  return `mc_auth=${AUTH}`;
}

// Convenience: wire `from('agents')` → select chain; `from('approvals')` → insert chain.
function wireDefaults(opts: {
  agents?: unknown[];
  agentsError?: { message: string } | null;
  slugRow?: unknown | null;
  approvalInsertResult?: { id?: string; error?: { message: string } | null };
} = {}) {
  fromMock.mockImplementation((table: string) => {
    if (table === "agents") {
      return {
        select: () => {
          const chain: Record<string, unknown> = {};
          chain.order = vi.fn(() => chain);
          chain.is = vi.fn(() => chain);
          chain.in = vi.fn(() => chain);
          chain.eq = vi.fn(() => chain);
          chain.maybeSingle = vi.fn(() =>
            Promise.resolve({ data: opts.slugRow ?? null, error: null }),
          );
          // Terminal awaitable
          (chain as { then?: (res: (v: unknown) => void) => void }).then = (
            res: (v: unknown) => void,
          ) => {
            res({ data: opts.agents ?? [], error: opts.agentsError ?? null });
          };
          return chain;
        },
      };
    }
    if (table === "approvals") {
      return {
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve(
                opts.approvalInsertResult?.error
                  ? { data: null, error: opts.approvalInsertResult.error }
                  : {
                      data: { id: opts.approvalInsertResult?.id ?? "appr-001" },
                      error: null,
                    },
              ),
          }),
        }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AUTH_SECRET = AUTH;
  delete process.env.CIRCOS_ALLOWED_ORIGINS;
  selectChain.order.mockReset();
  selectChain.is.mockReset();
  selectChain.in.mockReset();
  selectChain.eq.mockReset();
  selectChain.maybeSingle.mockReset();
  insertChain.select.mockReset();
  insertChain.single.mockReset();
  fromMock.mockReset();
  wireDefaults();
});

// ============================================================
// GET /api/agents
// ============================================================

describe("GET /api/agents", () => {
  it("returns 403 when Origin is missing", async () => {
    const { GET } = await importRoute();
    const res = await GET(makeReq({ origin: null, cookie: cookieHeader() }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("INVALID_ORIGIN");
  });

  it("returns 403 when Origin is cross-site (SECURITY T5)", async () => {
    const { GET } = await importRoute();
    const res = await GET(
      makeReq({ origin: "https://evil.example", cookie: cookieHeader() }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("INVALID_ORIGIN");
  });

  it("returns 401 when mc_auth cookie is missing", async () => {
    const { GET } = await importRoute();
    const res = await GET(makeReq({})); // no cookie
    expect(res.status).toBe(401);
  });

  it("returns 200 and empty list on happy path", async () => {
    wireDefaults({ agents: [] });
    const { GET } = await importRoute();
    const res = await GET(makeReq({ cookie: cookieHeader() }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.agents).toEqual([]);
  });

  it("returns 200 and agent rows", async () => {
    const rows = [
      { agent_id: "gangle", name: "Gangle", slug: "gangle" },
      { agent_id: "jax", name: "Jax", slug: "jax" },
    ];
    wireDefaults({ agents: rows });
    const { GET } = await importRoute();
    const res = await GET(makeReq({ cookie: cookieHeader() }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.agents).toHaveLength(2);
    expect(body.agents[0].agent_id).toBe("gangle");
  });

  it("rejects ?ids=not-a-uuid (really: invalid agent id) with 400 INVALID_ID", async () => {
    const { GET } = await importRoute();
    const res = await GET(
      makeReq({ cookie: cookieHeader(), search: "?ids=../etc/passwd" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("INVALID_ID");
  });

  it("rejects ?ids with > 100 tokens with 400 TOO_MANY_IDS", async () => {
    const { GET } = await importRoute();
    const ids = Array.from({ length: 101 }, (_, i) => `agent-${i}`).join(",");
    const res = await GET(
      makeReq({ cookie: cookieHeader(), search: `?ids=${ids}` }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("TOO_MANY_IDS");
  });

  it("accepts ?ids with 100 valid agent-ids", async () => {
    const ids = Array.from({ length: 100 }, (_, i) => `agent-${i}`).join(",");
    wireDefaults({ agents: [] });
    const { GET } = await importRoute();
    const res = await GET(
      makeReq({ cookie: cookieHeader(), search: `?ids=${ids}` }),
    );
    expect(res.status).toBe(200);
  });

  it("returns empty agents immediately when ?ids= (empty after split)", async () => {
    const { GET } = await importRoute();
    const res = await GET(makeReq({ cookie: cookieHeader(), search: "?ids=" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.agents).toEqual([]);
  });
});

// ============================================================
// POST /api/agents
// ============================================================

describe("POST /api/agents", () => {
  it("returns 403 on cross-origin Origin (SECURITY T4)", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq({
        method: "POST",
        origin: "https://evil.example",
        cookie: cookieHeader(),
        body: { name: "Orbis" },
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("INVALID_ORIGIN");
  });

  it("returns 415 on non-JSON Content-Type", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq({
        method: "POST",
        contentType: "text/plain",
        cookie: cookieHeader(),
        body: { name: "Orbis" },
      }),
    );
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("returns 401 without mc_auth", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq({ method: "POST", body: { name: "Orbis" } }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 VALIDATION_ERROR when name missing", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq({ method: "POST", cookie: cookieHeader(), body: {} }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(body.field).toBe("name");
  });

  it("returns 400 VALIDATION_ERROR when name has dangerous chars", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq({
        method: "POST",
        cookie: cookieHeader(),
        body: { name: "<script>alert(1)</script>" },
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(body.field).toBe("name");
  });

  it("returns 400 FORBIDDEN_FIELD when body includes role", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq({
        method: "POST",
        cookie: cookieHeader(),
        body: { name: "Orbis", role: "admin" },
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("FORBIDDEN_FIELD");
  });

  it("returns 400 FORBIDDEN_FIELD on __proto__ injection (SECURITY T7)", async () => {
    const { POST } = await importRoute();
    const payload: Record<string, unknown> = { name: "Orbis" };
    Object.defineProperty(payload, "__proto__", {
      value: { role: "admin" },
      enumerable: true,
      configurable: true,
    });
    const res = await POST(
      makeReq({ method: "POST", cookie: cookieHeader(), body: payload }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("FORBIDDEN_FIELD");
    expect(body.reason).toBe("prototype_pollution_attempt");
  });

  it("returns 400 FORBIDDEN_FIELD on constructor key (SECURITY T7)", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq({
        method: "POST",
        cookie: cookieHeader(),
        body: { name: "Orbis", constructor: { role: "admin" } },
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("FORBIDDEN_FIELD");
  });

  it("rejects avatar_url: javascript: (SECURITY T9)", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq({
        method: "POST",
        cookie: cookieHeader(),
        body: { name: "Orbis", avatar_url: "javascript:alert(1)" },
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(body.field).toBe("avatar_url");
    expect(body.reason).toBe("unsupported_scheme");
  });

  it("rejects avatar_url: data:text/html (SECURITY T9)", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq({
        method: "POST",
        cookie: cookieHeader(),
        body: { name: "Orbis", avatar_url: "data:text/html,<script>alert(1)</script>" },
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.field).toBe("avatar_url");
  });

  it("rejects avatar_url: file:/// (SECURITY T9)", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq({
        method: "POST",
        cookie: cookieHeader(),
        body: { name: "Orbis", avatar_url: "file:///etc/passwd" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("accepts avatar_url: https://example.com/img.png (SECURITY T9 positive)", async () => {
    wireDefaults({ slugRow: null });
    const { POST } = await importRoute();
    const res = await POST(
      makeReq({
        method: "POST",
        cookie: cookieHeader(),
        body: { name: "Orbis", avatar_url: "https://example.com/img.png" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.approval_id).toBe("appr-001");
  });

  it("returns 400 VALIDATION_ERROR when soul_content > 50 000 chars", async () => {
    const huge = "a".repeat(50_001);
    const { POST } = await importRoute();
    const res = await POST(
      makeReq({
        method: "POST",
        cookie: cookieHeader(),
        body: { name: "Orbis", soul_content: huge },
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.field).toBe("soul_content");
  });

  it("returns 409 SLUG_CONFLICT when slug exists", async () => {
    wireDefaults({ slugRow: { agent_id: "orbis" } });
    const { POST } = await importRoute();
    const res = await POST(
      makeReq({
        method: "POST",
        cookie: cookieHeader(),
        body: { name: "Orbis" },
      }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("SLUG_CONFLICT");
  });

  it("happy path inserts create_agent approval with target_snapshot", async () => {
    let capturedInsert: Record<string, unknown> | null = null;
    fromMock.mockImplementation((table: string) => {
      if (table === "agents") {
        return {
          select: () => {
            const chain: Record<string, unknown> = {};
            chain.eq = vi.fn(() => chain);
            chain.maybeSingle = vi.fn(() =>
              Promise.resolve({ data: null, error: null }),
            );
            return chain;
          },
        };
      }
      if (table === "approvals") {
        return {
          insert: (row: Record<string, unknown>) => {
            capturedInsert = row;
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: "appr-happy" }, error: null }),
              }),
            };
          },
        };
      }
      throw new Error("unexpected table");
    });

    const { POST } = await importRoute();
    const res = await POST(
      makeReq({
        method: "POST",
        cookie: cookieHeader(),
        body: {
          name: "Orbis",
          slug: "orbis",
          soul_content: "hello soul",
          avatar_url: "https://example.com/avatar.png",
        },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.approval_id).toBe("appr-happy");

    expect(capturedInsert).not.toBeNull();
    const row = capturedInsert as unknown as Record<string, unknown>;
    expect(row.type).toBe("create_agent");
    expect(row.status).toBe("pending");
    expect(row.target_type).toBe("agent");
    expect(row.target_id).toBeNull();

    const payload = row.payload as Record<string, unknown>;
    expect(payload.slug).toBe("orbis");
    expect(payload.name).toBe("Orbis");
    expect(payload.soul_content).toBe("hello soul");
    expect(payload.avatar_url).toBe("https://example.com/avatar.png");

    const snap = payload.target_snapshot as Record<string, unknown>;
    expect(snap.name).toBe("Orbis");
    expect(snap.slug).toBe("orbis");
    expect(snap.avatar_url).toBe("https://example.com/avatar.png");
    expect(snap.bound_node_id).toBeNull();
    expect(snap.preferred_node_id).toBeNull();
  });
});
