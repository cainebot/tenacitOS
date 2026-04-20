// @vitest-environment node
// Phase 69 Plan 11 — /api/agents/[id]/assign-task POST coverage.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const AUTH = "test-secret-aaaaaaaaaaaaaaaa";
const WORKFLOW_ID = "11111111-1111-4111-8111-111111111111";
const STATE_ID = "22222222-2222-4222-8222-222222222222";

const { fromMock, createCardMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  createCardMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/cards", () => ({
  createCard: createCardMock,
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

  const url = `http://localhost:3000/api/agents/${agentId}/assign-task`;
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

function wireAgentExists(exists: boolean) {
  fromMock.mockImplementation((table: string) => {
    if (table === "agents") {
      return {
        select: () => ({
          eq: () => ({
            is: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: exists ? { agent_id: "pomni" } : null,
                  error: null,
                }),
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
  createCardMock.mockReset();
  wireAgentExists(true);
  createCardMock.mockResolvedValue({
    card_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    workflow_id: WORKFLOW_ID,
    state_id: STATE_ID,
  });
});

const validBody = (overrides: Record<string, unknown> = {}) => ({
  title: "Do the thing",
  workflow_id: WORKFLOW_ID,
  state_id: STATE_ID,
  ...overrides,
});

describe("POST /api/agents/[id]/assign-task", () => {
  it("400 INVALID_ID on malformed path", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("../bad", { cookie: cookieHeader(), body: validBody() }),
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
        body: validBody(),
      }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(403);
  });

  it("415 without application/json", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", {
        contentType: null,
        cookie: cookieHeader(),
        body: validBody(),
      }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(415);
  });

  it("401 without mc_auth", async () => {
    const { POST } = await importRoute();
    const res = await POST(makeReq("pomni", { body: validBody() }), paramsOf("pomni"));
    expect(res.status).toBe(401);
  });

  it("400 FORBIDDEN_FIELD on prototype-pollution key", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", {
        cookie: cookieHeader(),
        rawBody: `{"__proto__":{"x":1},"title":"ok","workflow_id":"${WORKFLOW_ID}","state_id":"${STATE_ID}"}`,
      }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("FORBIDDEN_FIELD");
  });

  it("400 FORBIDDEN_FIELD on unknown key", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", {
        cookie: cookieHeader(),
        body: { ...validBody(), injected_field: true },
      }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("FORBIDDEN_FIELD");
  });

  it("400 VALIDATION_ERROR on XSS-style title", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", {
        cookie: cookieHeader(),
        body: validBody({ title: "<script>alert(1)</script>" }),
      }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(body.field).toBe("title");
  });

  it("400 VALIDATION_ERROR on missing workflow_id", async () => {
    const { POST } = await importRoute();
    const { workflow_id: _wf, ...rest } = validBody();
    const res = await POST(
      makeReq("pomni", { cookie: cookieHeader(), body: rest }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).field).toBe("workflow_id");
  });

  it("404 AGENT_NOT_FOUND when agent missing", async () => {
    wireAgentExists(false);
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", { cookie: cookieHeader(), body: validBody() }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(404);
  });

  it("201 happy path creates card with assigned_agent_id", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", {
        cookie: cookieHeader(),
        body: validBody({ description: "more detail", priority: "high" }),
      }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.assigned_agent_id).toBe("pomni");
    expect(body.workflow_id).toBe(WORKFLOW_ID);
    expect(body.state_id).toBe(STATE_ID);
    expect(createCardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Do the thing",
        assigned_agent_id: "pomni",
        workflow_id: WORKFLOW_ID,
        state_id: STATE_ID,
        card_type: "task",
        priority: "high",
      }),
    );
  });

  it("201 default card_type 'task' when omitted", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", { cookie: cookieHeader(), body: validBody() }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(201);
    expect(createCardMock.mock.calls[0][0].card_type).toBe("task");
  });
});
