// @vitest-environment node
// Phase 69 Plan 11 — /api/agents/[id]/invoke POST coverage.
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
  origin?: string | null;
  contentType?: string | null;
  cookie?: string;
  body?: unknown;
  rawBody?: string;
}

function makeReq(agentId: string, opts: MakeReqOpts = {}): NextRequest {
  const headers: Record<string, string> = {};
  const origin = opts.origin === undefined ? "http://localhost:3000" : opts.origin;
  if (origin) headers["origin"] = origin;
  const ct = opts.contentType === undefined ? "application/json" : opts.contentType;
  if (ct) headers["content-type"] = ct;
  if (opts.cookie) headers["cookie"] = opts.cookie;

  const url = `http://localhost:3000/api/agents/${agentId}/invoke`;
  return new NextRequest(url, {
    method: "POST",
    headers,
    body:
      opts.rawBody !== undefined
        ? opts.rawBody
        : opts.body === undefined
          ? undefined
          : JSON.stringify(opts.body),
  });
}

const cookieHeader = () => `mc_auth=${AUTH}`;
const paramsOf = (id: string) => ({ params: Promise.resolve({ id }) });

interface WireOpts {
  agent?: {
    agent_id: string;
    status: string;
    adapter_type?: string | null;
    bound_node_id?: string | null;
    preferred_node_id?: string | null;
  } | null;
  insertedRunId?: string;
  insertError?: string | null;
}

function wireSelects(opts: WireOpts = {}) {
  const agent =
    opts.agent === undefined
      ? {
          agent_id: "pomni",
          status: "idle",
          adapter_type: "claude_local",
          bound_node_id: "circus-01",
          preferred_node_id: null,
        }
      : opts.agent;
  const insertedRunId = opts.insertedRunId ?? "11111111-2222-3333-4444-555555555555";

  fromMock.mockImplementation((table: string) => {
    if (table === "agents") {
      return {
        select: () => ({
          eq: () => ({
            is: () => ({
              maybeSingle: () => Promise.resolve({ data: agent, error: null }),
            }),
          }),
        }),
      };
    }
    if (table === "agent_runs") {
      return {
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: opts.insertError ? null : { id: insertedRunId },
                error: opts.insertError ? { message: opts.insertError } : null,
              }),
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
  wireSelects();
});

describe("POST /api/agents/[id]/invoke", () => {
  it("400 INVALID_ID on malformed path", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("../bad", { cookie: cookieHeader(), body: {} }),
      paramsOf("../bad"),
    );
    expect(res.status).toBe(400);
  });

  it("403 cross-origin POST", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", {
        origin: "https://evil.example",
        cookie: cookieHeader(),
        body: {},
      }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(403);
  });

  it("415 without application/json", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", { contentType: null, cookie: cookieHeader(), body: {} }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(415);
  });

  it("401 without mc_auth", async () => {
    const { POST } = await importRoute();
    const res = await POST(makeReq("pomni", { body: {} }), paramsOf("pomni"));
    expect(res.status).toBe(401);
  });

  it("400 VALIDATION_ERROR when prompt > 2000 chars", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", { cookie: cookieHeader(), body: { prompt: "a".repeat(2001) } }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("VALIDATION_ERROR");
  });

  it("400 FORBIDDEN_FIELD on unknown key", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", { cookie: cookieHeader(), body: { agent_id: "other" } }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("FORBIDDEN_FIELD");
  });

  it("400 FORBIDDEN_FIELD on prototype-pollution", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", {
        cookie: cookieHeader(),
        rawBody: '{"__proto__":{"x":1},"prompt":"ok"}',
      }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe("prototype_pollution_attempt");
  });

  it("404 AGENT_NOT_FOUND", async () => {
    wireSelects({ agent: null });
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", { cookie: cookieHeader(), body: {} }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(404);
  });

  it("409 ERR_AGENT_PAUSED when agent is paused", async () => {
    wireSelects({
      agent: {
        agent_id: "pomni",
        status: "paused",
        adapter_type: "claude_local",
        bound_node_id: "circus-01",
      },
    });
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", { cookie: cookieHeader(), body: {} }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("ERR_AGENT_PAUSED");
  });

  it("400 ERR_NO_NODE when no node binding", async () => {
    wireSelects({
      agent: {
        agent_id: "pomni",
        status: "idle",
        adapter_type: "claude_local",
        bound_node_id: null,
        preferred_node_id: null,
      },
    });
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", { cookie: cookieHeader(), body: {} }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("ERR_NO_NODE");
  });

  it("200 happy path returns run_id + target_node_id + adapter_type", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", { cookie: cookieHeader(), body: { prompt: "ping" } }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.run_id).toMatch(/^[0-9a-f-]+$/);
    expect(body.target_node_id).toBe("circus-01");
    expect(body.adapter_type).toBe("claude_local");
  });

  it("falls back to preferred_node_id when bound is null", async () => {
    wireSelects({
      agent: {
        agent_id: "pomni",
        status: "idle",
        adapter_type: "claude_local",
        bound_node_id: null,
        preferred_node_id: "circus-02",
      },
    });
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", { cookie: cookieHeader(), body: {} }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).target_node_id).toBe("circus-02");
  });
});
