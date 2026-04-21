// @vitest-environment node
// Phase 69 Plan 11 — /api/agents/[id]/resume POST coverage.
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
}

function makeReq(agentId: string, opts: MakeReqOpts = {}): NextRequest {
  const headers: Record<string, string> = {};
  const origin = opts.origin === undefined ? "http://localhost:3000" : opts.origin;
  if (origin) headers["origin"] = origin;
  const ct = opts.contentType === undefined ? "application/json" : opts.contentType;
  if (ct) headers["content-type"] = ct;
  if (opts.cookie) headers["cookie"] = opts.cookie;

  const url = `http://localhost:3000/api/agents/${agentId}/resume`;
  return new NextRequest(url, {
    method: "POST",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

const cookieHeader = () => `mc_auth=${AUTH}`;
const paramsOf = (id: string) => ({ params: Promise.resolve({ id }) });

interface WireOpts {
  agent?: { agent_id: string; status: string } | null;
  updateError?: string | null;
}

function wireSelects(opts: WireOpts = {}) {
  const agent =
    opts.agent === undefined ? { agent_id: "pomni", status: "paused" } : opts.agent;
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
        update: () => ({
          eq: () => ({
            eq: () =>
              Promise.resolve({
                data: null,
                error: opts.updateError ? { message: opts.updateError } : null,
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

describe("POST /api/agents/[id]/resume", () => {
  it("400 INVALID_ID on malformed path", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("../bad", { cookie: cookieHeader(), body: {} }),
      paramsOf("../bad"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_ID");
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

  it("415 without Content-Type", async () => {
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

  it("404 AGENT_NOT_FOUND", async () => {
    wireSelects({ agent: null });
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", { cookie: cookieHeader(), body: {} }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(404);
  });

  it("200 already_active when not paused", async () => {
    wireSelects({ agent: { agent_id: "pomni", status: "idle" } });
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", { cookie: cookieHeader(), body: {} }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("already_active");
    expect(body.current_status).toBe("idle");
  });

  it("200 resumed on happy path", async () => {
    wireSelects({ agent: { agent_id: "pomni", status: "paused" } });
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", { cookie: cookieHeader(), body: {} }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("resumed");
    expect(body.current_status).toBe("idle");
  });
});
