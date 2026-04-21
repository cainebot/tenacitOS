// @vitest-environment node
// Phase 69-03 — /api/agents/[id] GET + PATCH + DELETE coverage.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const AUTH = "test-secret-aaaaaaaaaaaaaaaa";

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
  contentType?: string | null;
  cookie?: string;
  body?: unknown;
}

function makeReq(agentId: string, opts: MakeReqOpts = {}): NextRequest {
  const headers: Record<string, string> = {};
  const origin = opts.origin === undefined ? "http://localhost:3000" : opts.origin;
  if (origin) headers["origin"] = origin;
  const ct = opts.contentType === undefined ? "application/json" : opts.contentType;
  if (ct) headers["content-type"] = ct;
  if (opts.cookie) headers["cookie"] = opts.cookie;

  const url = `http://localhost:3000/api/agents/${agentId}`;
  return new NextRequest(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

const cookieHeader = () => `mc_auth=${AUTH}`;
const paramsOf = (id: string) => ({ params: Promise.resolve({ id }) });

interface WireOpts {
  agent?: Record<string, unknown> | null;
  agentError?: { message: string } | null;
  approvals?: Array<Record<string, unknown>>;
  approvalInsertResult?: {
    id?: string;
    error?: { message: string } | null;
  };
}

function wireDefaults(opts: WireOpts = {}) {
  fromMock.mockImplementation((table: string) => {
    if (table === "agents") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: opts.agent ?? null,
                error: opts.agentError ?? null,
              }),
          }),
        }),
      };
    }
    if (table === "approvals") {
      return {
        select: () => ({
          in: () => ({
            in: () => ({
              order: () => ({
                limit: () =>
                  Promise.resolve({
                    data: opts.approvals ?? [],
                    error: null,
                  }),
              }),
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve(
                opts.approvalInsertResult?.error
                  ? { data: null, error: opts.approvalInsertResult.error }
                  : {
                      data: {
                        id: opts.approvalInsertResult?.id ?? "appr-001",
                      },
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
  fromMock.mockReset();
  wireDefaults();
});

// Capture the insert for happy-path snapshot assertions.
function wireApprovalCapture(existing: Record<string, unknown> | null = null) {
  let captured: { table: string; row: Record<string, unknown> } | null = null;
  fromMock.mockImplementation((table: string) => {
    if (table === "agents") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data:
                  existing ??
                  {
                    agent_id: "gangle",
                    name: "Gangle",
                    slug: "gangle",
                    avatar_url: null,
                    bound_node_id: "circus-01",
                    preferred_node_id: null,
                  },
                error: null,
              }),
          }),
        }),
      };
    }
    if (table === "approvals") {
      return {
        select: () => ({
          in: () => ({
            in: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        }),
        insert: (row: Record<string, unknown>) => {
          captured = { table, row };
          return {
            select: () => ({
              single: () =>
                Promise.resolve({ data: { id: "appr-snap" }, error: null }),
            }),
          };
        },
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
  return () => captured;
}

// ============================================================
// GET /api/agents/[id]
// ============================================================

describe("GET /api/agents/[id]", () => {
  it("returns 400 INVALID_ID on bad path-id", async () => {
    const { GET } = await importRoute();
    const res = await GET(
      makeReq("../etc/passwd", { cookie: cookieHeader() }),
      paramsOf("../etc/passwd"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("INVALID_ID");
  });

  it("returns 403 on cross-origin Origin (SECURITY T5)", async () => {
    const { GET } = await importRoute();
    const res = await GET(
      makeReq("gangle", {
        origin: "https://evil.example",
        cookie: cookieHeader(),
      }),
      paramsOf("gangle"),
    );
    expect(res.status).toBe(403);
  });

  it("returns 401 without mc_auth", async () => {
    const { GET } = await importRoute();
    const res = await GET(makeReq("gangle"), paramsOf("gangle"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when agent missing", async () => {
    wireDefaults({ agent: null });
    const { GET } = await importRoute();
    const res = await GET(
      makeReq("gangle", { cookie: cookieHeader() }),
      paramsOf("gangle"),
    );
    expect(res.status).toBe(404);
  });

  it("returns agent + pending_approval:null when none pending", async () => {
    wireDefaults({
      agent: { agent_id: "gangle", name: "Gangle" },
      approvals: [],
    });
    const { GET } = await importRoute();
    const res = await GET(
      makeReq("gangle", { cookie: cookieHeader() }),
      paramsOf("gangle"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.agent.agent_id).toBe("gangle");
    expect(body.pending_approval).toBeNull();
  });

  it("returns pending_approval when an open update_agent exists", async () => {
    wireDefaults({
      agent: { agent_id: "gangle", name: "Gangle" },
      approvals: [
        {
          id: "appr-99",
          type: "update_agent",
          created_at: "2026-04-20T00:00:00Z",
          status: "pending",
          payload: { agent_id: "gangle", changes: { name: "G2" } },
        },
      ],
    });
    const { GET } = await importRoute();
    const res = await GET(
      makeReq("gangle", { cookie: cookieHeader() }),
      paramsOf("gangle"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pending_approval.approval_id).toBe("appr-99");
    expect(body.pending_approval.type).toBe("update_agent");
  });

  it("ignores pending approvals targeting OTHER agents", async () => {
    wireDefaults({
      agent: { agent_id: "gangle", name: "Gangle" },
      approvals: [
        {
          id: "appr-other",
          type: "update_agent",
          created_at: "2026-04-20T00:00:00Z",
          status: "pending",
          payload: { agent_id: "jax", changes: { name: "J2" } },
        },
      ],
    });
    const { GET } = await importRoute();
    const res = await GET(
      makeReq("gangle", { cookie: cookieHeader() }),
      paramsOf("gangle"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pending_approval).toBeNull();
  });
});

// ============================================================
// PATCH /api/agents/[id]
// ============================================================

describe("PATCH /api/agents/[id]", () => {
  it("returns 400 INVALID_ID on bad path", async () => {
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("../secret", {
        method: "PATCH",
        cookie: cookieHeader(),
        body: { name: "X" },
      }),
      paramsOf("../secret"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("INVALID_ID");
  });

  it("returns 403 on cross-origin Origin", async () => {
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("gangle", {
        method: "PATCH",
        origin: "https://evil.example",
        cookie: cookieHeader(),
        body: { name: "X" },
      }),
      paramsOf("gangle"),
    );
    expect(res.status).toBe(403);
  });

  it("returns 415 on non-JSON Content-Type", async () => {
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("gangle", {
        method: "PATCH",
        contentType: "text/plain",
        cookie: cookieHeader(),
        body: { name: "X" },
      }),
      paramsOf("gangle"),
    );
    expect(res.status).toBe(415);
  });

  it("returns 401 without mc_auth", async () => {
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("gangle", { method: "PATCH", body: { name: "X" } }),
      paramsOf("gangle"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 FORBIDDEN_FIELD when changes include role", async () => {
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("gangle", {
        method: "PATCH",
        cookie: cookieHeader(),
        body: { role: "admin" },
      }),
      paramsOf("gangle"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("FORBIDDEN_FIELD");
  });

  it("returns 400 FORBIDDEN_FIELD on __proto__ key (SECURITY T7)", async () => {
    const { PATCH } = await importRoute();
    const body: Record<string, unknown> = { name: "G2" };
    Object.defineProperty(body, "__proto__", {
      value: { role: "admin" },
      enumerable: true,
      configurable: true,
    });
    const res = await PATCH(
      makeReq("gangle", { method: "PATCH", cookie: cookieHeader(), body }),
      paramsOf("gangle"),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("FORBIDDEN_FIELD");
  });

  it("returns 400 VALIDATION_ERROR on avatar_url javascript: (SECURITY T9)", async () => {
    wireDefaults({ agent: { agent_id: "gangle" } });
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("gangle", {
        method: "PATCH",
        cookie: cookieHeader(),
        body: { avatar_url: "javascript:alert(1)" },
      }),
      paramsOf("gangle"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.field).toBe("avatar_url");
    expect(body.reason).toBe("unsupported_scheme");
  });

  it("returns 400 VALIDATION_ERROR when no editable keys", async () => {
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("gangle", {
        method: "PATCH",
        cookie: cookieHeader(),
        body: {},
      }),
      paramsOf("gangle"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when agent missing", async () => {
    wireDefaults({ agent: null });
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("gangle", {
        method: "PATCH",
        cookie: cookieHeader(),
        body: { name: "New Name" },
      }),
      paramsOf("gangle"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 409 PENDING_APPROVAL_EXISTS when one already pending", async () => {
    wireDefaults({
      agent: { agent_id: "gangle", name: "Gangle", slug: "gangle" },
      approvals: [
        {
          id: "appr-old",
          type: "update_agent",
          created_at: "2026-04-20T00:00:00Z",
          status: "pending",
          payload: { agent_id: "gangle" },
        },
      ],
    });
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("gangle", {
        method: "PATCH",
        cookie: cookieHeader(),
        body: { name: "New Name" },
      }),
      paramsOf("gangle"),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("PENDING_APPROVAL_EXISTS");
    expect(body.approval_id).toBe("appr-old");
  });

  it("happy path inserts update_agent approval with target_snapshot", async () => {
    const getCaptured = wireApprovalCapture();
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("gangle", {
        method: "PATCH",
        cookie: cookieHeader(),
        body: { name: "Gangle 2", soul_content: "new soul" },
      }),
      paramsOf("gangle"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.approval_id).toBe("appr-snap");

    const cap = getCaptured();
    expect(cap).not.toBeNull();
    const row = cap!.row;
    expect(row.type).toBe("update_agent");
    expect(row.target_type).toBe("agent");
    expect(row.target_id).toBeNull();
    const payload = row.payload as Record<string, unknown>;
    expect(payload.agent_id).toBe("gangle");
    const changes = payload.changes as Record<string, unknown>;
    expect(changes.name).toBe("Gangle 2");
    expect(changes.soul_content).toBe("new soul");
    const snap = payload.target_snapshot as Record<string, unknown>;
    expect(snap.name).toBe("Gangle");
    expect(snap.slug).toBe("gangle");
    expect(snap.bound_node_id).toBe("circus-01");
  });
});

// ============================================================
// DELETE /api/agents/[id]
// ============================================================

describe("DELETE /api/agents/[id]", () => {
  it("returns 400 INVALID_ID on bad path", async () => {
    const { DELETE } = await importRoute();
    const res = await DELETE(
      makeReq("../../etc", { method: "DELETE", cookie: cookieHeader() }),
      paramsOf("../../etc"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 on cross-origin Origin", async () => {
    const { DELETE } = await importRoute();
    const res = await DELETE(
      makeReq("gangle", {
        method: "DELETE",
        origin: "https://evil.example",
        cookie: cookieHeader(),
      }),
      paramsOf("gangle"),
    );
    expect(res.status).toBe(403);
  });

  it("returns 401 without mc_auth", async () => {
    const { DELETE } = await importRoute();
    const res = await DELETE(
      makeReq("gangle", { method: "DELETE" }),
      paramsOf("gangle"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when agent missing", async () => {
    wireDefaults({ agent: null });
    const { DELETE } = await importRoute();
    const res = await DELETE(
      makeReq("gangle", { method: "DELETE", cookie: cookieHeader() }),
      paramsOf("gangle"),
    );
    expect(res.status).toBe(404);
  });

  it("happy path inserts delete_agent approval with target_snapshot incl bound/preferred node", async () => {
    const getCaptured = wireApprovalCapture();
    const { DELETE } = await importRoute();
    const res = await DELETE(
      makeReq("gangle", { method: "DELETE", cookie: cookieHeader() }),
      paramsOf("gangle"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.approval_id).toBe("appr-snap");

    const cap = getCaptured();
    expect(cap).not.toBeNull();
    const row = cap!.row;
    expect(row.type).toBe("delete_agent");
    expect(row.target_type).toBe("agent");
    expect(row.target_id).toBeNull();
    const payload = row.payload as Record<string, unknown>;
    expect(payload.agent_id).toBe("gangle");
    expect(payload.slug).toBe("gangle");
    const snap = payload.target_snapshot as Record<string, unknown>;
    expect(snap.bound_node_id).toBe("circus-01");
    expect(snap.preferred_node_id).toBeNull();
    expect(snap.name).toBe("Gangle");
  });
});
