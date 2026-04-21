// @vitest-environment node
// Phase 69 Plan 11 — /api/agents/[id]/pause POST coverage.
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

  const url = `http://localhost:3000/api/agents/${agentId}/pause`;
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
  agent?: { agent_id: string; status: string } | null;
  inflightCount?: number;
  updateError?: string | null;
}

function wireSelects(opts: WireOpts = {}) {
  const agent = opts.agent === undefined ? { agent_id: "pomni", status: "idle" } : opts.agent;
  const inflight = opts.inflightCount ?? 0;

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
            neq: () =>
              Promise.resolve({
                data: null,
                error: opts.updateError ? { message: opts.updateError } : null,
              }),
          }),
        }),
      };
    }
    if (table === "agent_runs") {
      return {
        select: () => ({
          eq: () => ({
            in: () => Promise.resolve({ count: inflight, error: null }),
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

describe("POST /api/agents/[id]/pause", () => {
  it("400 INVALID_ID on malformed path-id", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("../bad", { cookie: cookieHeader(), body: {} }),
      paramsOf("../bad"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_ID");
  });

  it("403 on cross-origin POST", async () => {
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

  it("400 FORBIDDEN_FIELD on prototype-pollution key", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", {
        cookie: cookieHeader(),
        rawBody: '{"__proto__":{"x":1},"reason":"ok"}',
      }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("FORBIDDEN_FIELD");
    expect(body.reason).toBe("prototype_pollution_attempt");
  });

  it("400 VALIDATION_ERROR when reason > 280 chars", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", { cookie: cookieHeader(), body: { reason: "a".repeat(281) } }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("VALIDATION_ERROR");
  });

  it("404 AGENT_NOT_FOUND", async () => {
    wireSelects({ agent: null });
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", { cookie: cookieHeader(), body: { reason: "x" } }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("AGENT_NOT_FOUND");
  });

  it("200 already_paused when already paused", async () => {
    wireSelects({ agent: { agent_id: "pomni", status: "paused" } });
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", { cookie: cookieHeader(), body: {} }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("already_paused");
    expect(body.agent_id).toBe("pomni");
  });

  it("200 paused with reason on happy path", async () => {
    wireSelects({ agent: { agent_id: "pomni", status: "idle" }, inflightCount: 0 });
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", { cookie: cookieHeader(), body: { reason: "maintenance" } }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("paused");
    expect(body.paused_reason).toBe("maintenance");
    expect(body.inflight_run_count).toBe(0);
  });

  it("200 paused with inflight_run_count when in-flight runs exist", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    wireSelects({ agent: { agent_id: "pomni", status: "idle" }, inflightCount: 3 });
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", { cookie: cookieHeader(), body: {} }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.inflight_run_count).toBe(3);
    expect(warnSpy).toHaveBeenCalled();
  });
});
